import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { HouseholdProfile, PlanResponse } from "@airdelta/schemas";
import { PiiSanitizerService } from "./pii-sanitizer.service.js";

export interface StoredPlanRecord {
  id: string;
  household_id: string;
  for_date: string;
  inputs: unknown;
  result: PlanResponse;
  engine_version: string;
  constants_version: string;
  created_at: string;
}

export interface CommunityImpactSummary {
  groupId: string;
  groupName: string;
  cityCode: string;
  activeHouseholds: number | null;
  isAnonymitySatisfied: boolean;
  totalActionsTaken: number | null;
  estimatedCommunityPm25PreventedGrams: number | null;
}

export class SupabaseService {
  private client: SupabaseClient | null = null;
  private isLive = false;

  // In-memory fallback stores for tests or environments without live Supabase
  private memoryHouseholds = new Map<string, HouseholdProfile & { owner: string; created_at: string }>();
  private memoryPlans = new Map<string, StoredPlanRecord>();
  private memoryActions: Array<{ id: string; plan_id: string; action_key: string; done_at: string }> = [];
  private memoryGroupMembers: Array<{ group_id: string; household_id: string; joined_at: string }> = [];

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      try {
        this.client = createClient(url, key);
        this.isLive = true;
      } catch (err) {
        console.warn("[SupabaseService] Failed to initialize Supabase client, using in-memory store:", err);
      }
    }
  }

  public isConfigured(): boolean {
    return this.isLive && this.client !== null;
  }

  /**
   * Save or update a household profile with sanitized metadata.
   */
  public async saveHousehold(
    household: HouseholdProfile,
    ownerId: string = "anon-owner"
  ): Promise<{ id: string; ok: boolean }> {
    const sanitized = PiiSanitizerService.sanitizeObject(household);
    const householdId = sanitized.id || crypto.randomUUID();

    if (this.isLive && this.client) {
      const { error } = await this.client.from("households").upsert({
        id: householdId,
        owner: ownerId,
        city_code: sanitized.cityCode || "DELHI",
        grid_cell: sanitized.gridCell || "28.61:77.21",
        lang: sanitized.lang || "en",
        budget_band: sanitized.budgetBand || "low",
        cooks_indoors: sanitized.cooksIndoors ?? true,
        has_exhaust: sanitized.hasExhaust ?? false,
        has_purifier: sanitized.hasPurifier ?? false,
        updated_at: new Date().toISOString()
      });

      if (error) {
        throw new Error(`[Supabase] saveHousehold error: ${error.message}`);
      }
      return { id: householdId, ok: true };
    }

    // In-memory fallback
    this.memoryHouseholds.set(householdId, {
      ...sanitized,
      id: householdId,
      owner: ownerId,
      created_at: new Date().toISOString()
    });

    return { id: householdId, ok: true };
  }

  /**
   * Retrieve a household by ID.
   */
  public async getHousehold(householdId: string): Promise<HouseholdProfile | null> {
    if (this.isLive && this.client) {
      const { data, error } = await this.client
        .from("households")
        .select("*")
        .eq("id", householdId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        cityCode: data.city_code,
        gridCell: data.grid_cell,
        lang: data.lang,
        budgetBand: data.budget_band,
        cooksIndoors: data.cooks_indoors,
        hasExhaust: data.has_exhaust,
        hasPurifier: data.has_purifier,
        members: [],
        routines: []
      };
    }

    const found = this.memoryHouseholds.get(householdId);
    return found ? { ...found } : null;
  }

  /**
   * Persist a generated Plan A vs Plan B result.
   */
  public async savePlan(
    plan: PlanResponse,
    householdId: string,
    inputs: unknown
  ): Promise<{ id: string; ok: boolean }> {
    const planId = plan.planId || crypto.randomUUID();
    const sanitizedInputs = PiiSanitizerService.sanitizeObject(inputs);

    const record: StoredPlanRecord = {
      id: planId,
      household_id: householdId,
      for_date: plan.forDate || new Date().toISOString().split("T")[0],
      inputs: sanitizedInputs,
      result: plan,
      engine_version: plan.engineVersion,
      constants_version: plan.constantsVersion,
      created_at: new Date().toISOString()
    };

    if (this.isLive && this.client) {
      const { error } = await this.client.from("plans").insert(record);
      if (error) {
        throw new Error(`[Supabase] savePlan error: ${error.message}`);
      }
      return { id: planId, ok: true };
    }

    this.memoryPlans.set(planId, record);
    return { id: planId, ok: true };
  }

  /**
   * Retrieve a plan by ID.
   */
  public async getPlan(planId: string): Promise<StoredPlanRecord | null> {
    if (this.isLive && this.client) {
      const { data, error } = await this.client
        .from("plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

      if (error || !data) return null;
      return data as StoredPlanRecord;
    }

    const found = this.memoryPlans.get(planId);
    return found ? { ...found } : null;
  }

  /**
   * Log an action completed by the household from Plan B.
   */
  public async recordAction(
    planId: string,
    actionKey: string
  ): Promise<{ id: string; ok: boolean }> {
    const actionId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (this.isLive && this.client) {
      const { error } = await this.client.from("actions").insert({
        id: actionId,
        plan_id: planId,
        action_key: actionKey,
        done_at: now
      });

      if (error) {
        throw new Error(`[Supabase] recordAction error: ${error.message}`);
      }
      return { id: actionId, ok: true };
    }

    this.memoryActions.push({
      id: actionId,
      plan_id: planId,
      action_key: actionKey,
      done_at: now
    });

    return { id: actionId, ok: true };
  }

  /**
   * Purge plans older than retentionDays (default 30 days)
   * to protect free tier storage.
   */
  public async purgeExpiredPlans(retentionDays: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    if (this.isLive && this.client) {
      const { data, error } = await this.client
        .from("plans")
        .delete()
        .lt("created_at", cutoffIso)
        .select("id");

      if (error) {
        throw new Error(`[Supabase] purgeExpiredPlans error: ${error.message}`);
      }

      return { deletedCount: data ? data.length : 0 };
    }

    let count = 0;
    for (const [id, plan] of this.memoryPlans.entries()) {
      if (new Date(plan.created_at) < cutoffDate) {
        this.memoryPlans.delete(id);
        count++;
      }
    }

    return { deletedCount: count };
  }

  /**
   * Join a community group.
   */
  public async joinGroup(groupId: string, householdId: string): Promise<boolean> {
    if (this.isLive && this.client) {
      const { error } = await this.client
        .from("group_members")
        .upsert({ group_id: groupId, household_id: householdId });
      return !error;
    }

    const existing = this.memoryGroupMembers.find(
      (m) => m.group_id === groupId && m.household_id === householdId
    );
    if (!existing) {
      this.memoryGroupMembers.push({
        group_id: groupId,
        household_id: householdId,
        joined_at: new Date().toISOString()
      });
    }
    return true;
  }

  /**
   * Fetch aggregated community impact, enforcing k >= 5 anonymity threshold.
   */
  public async getCommunityImpact(
    groupId: string,
    groupName: string = "Sector 14 RWA - Gurugram"
  ): Promise<CommunityImpactSummary> {
    if (this.isLive && this.client) {
      const { data, error } = await this.client
        .from("community_group_impact")
        .select("*")
        .eq("group_id", groupId)
        .maybeSingle();

      if (error || !data) {
        return {
          groupId,
          groupName,
          cityCode: "DELHI",
          activeHouseholds: null,
          isAnonymitySatisfied: false,
          totalActionsTaken: null,
          estimatedCommunityPm25PreventedGrams: null
        };
      }

      return {
        groupId: data.group_id,
        groupName: data.group_name,
        cityCode: data.city_code,
        activeHouseholds: data.active_households,
        isAnonymitySatisfied: data.is_anonymity_satisfied,
        totalActionsTaken: data.total_actions_taken,
        estimatedCommunityPm25PreventedGrams: data.estimated_community_pm25_prevented_grams
      };
    }

    // In-memory k-anonymity check
    const members = this.memoryGroupMembers.filter((m) => m.group_id === groupId);
    const uniqueHouseholds = new Set(members.map((m) => m.household_id));
    const k = uniqueHouseholds.size;

    if (k < 5) {
      return {
        groupId,
        groupName,
        cityCode: "DELHI",
        activeHouseholds: null,
        isAnonymitySatisfied: false,
        totalActionsTaken: null,
        estimatedCommunityPm25PreventedGrams: null
      };
    }

    const actionsCount = this.memoryActions.length;
    const pm25Prevented = Math.round(k * 0.185 * 10) / 10;

    return {
      groupId,
      groupName,
      cityCode: "DELHI",
      activeHouseholds: k,
      isAnonymitySatisfied: true,
      totalActionsTaken: actionsCount,
      estimatedCommunityPm25PreventedGrams: pm25Prevented
    };
  }
}

export const supabaseService = new SupabaseService();
