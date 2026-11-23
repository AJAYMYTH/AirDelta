import { IndoorFix, BudgetBand } from "@airdelta/schemas";

export const CURATED_INDOOR_FIXES: IndoorFix[] = [
  // Budget Tier: None (Zero-Cost Behavioral Interventions)
  {
    id: "fix-exhaust-cooking",
    fixKey: "exhaust_during_cooking",
    title: "Run Kitchen Exhaust During & 15m After Cooking",
    description: "Unvented LPG cooking releases over 18,000 µg/h of fine combustion aerosol. Running exhaust continuously evacuates up to 75% before it diffuses into bedrooms.",
    budgetBand: "none",
    estimatedReductionPercent: 35,
    actionSteps: [
      "Switch exhaust on 2 minutes before igniting gas burners",
      "Keep kitchen door closed to prevent smoke migration into living quarters",
      "Leave exhaust running for 15 minutes post cooking to purge residual particles"
    ],
    badge: "modelled"
  },
  {
    id: "fix-timed-ventilation",
    fixKey: "close_windows_inversion",
    title: "Timed Window Sealing During Winter Inversion Hours",
    description: "Outdoor smog peaks during morning (06:00-10:00) and night (19:00-23:00) temperature inversions. Keep doors/windows firmly latched; ventilate briefly only during the cleanest afternoon window.",
    budgetBand: "none",
    estimatedReductionPercent: 25,
    actionSteps: [
      "Keep all exterior balcony doors and windows sealed from 06:00 to 11:00",
      "Check AirDelta Cleanest Window before opening windows for cross-ventilation",
      "Re-seal home by 17:30 as evening cooling traps traffic emissions"
    ],
    badge: "modelled"
  },
  {
    id: "fix-wet-mopping",
    fixKey: "damp_mop_no_dry_sweep",
    title: "Switch to Damp Microfiber Mopping (Eliminate Dry Sweeping)",
    description: "Dry broom sweeping ('jhadu') resuspends deposited toxic heavy metal dust into breathing zones. Damp mopping captures particles permanently.",
    budgetBand: "none",
    estimatedReductionPercent: 18,
    actionSteps: [
      "Discontinue dry broom sweeping in unventilated rooms",
      "Use damp microfiber mop or cloth with water",
      "Clean floor surfaces starting from farthest corner towards doorway"
    ],
    badge: "assumed"
  },
  {
    id: "fix-eliminate-incense",
    fixKey: "eliminate_indoor_incense",
    title: "Substitute Burning Incense & Dhoop with LED or Venting",
    description: "One stick of burning incense produces PM2.5 emissions equivalent to multiple cigarettes (22,000 µg/h). Ceasing or moving burning outside protects sensitive airways.",
    budgetBand: "none",
    estimatedReductionPercent: 40,
    actionSteps: [
      "Cease dhoop/agarbatti burning in closed bedrooms and prayer alcoves",
      "If burning for rituals, ensure immediate adjacent window is open or use balcony",
      "Consider LED / flameless prayer alternatives during Severe smog days"
    ],
    badge: "modelled"
  },

  // Budget Tier: Low (< ₹1,500)
  {
    id: "fix-door-bottom-seal",
    fixKey: "door_bottom_weatherstrip",
    title: "Install Silicone Main Door Bottom Sweep Seal",
    description: "Common corridor and staircase shafts channel high-concentration smog under apartment entry doors. A simple adhesive sweep blocks up to 50% of hall infiltration.",
    budgetBand: "low",
    estimatedReductionPercent: 15,
    actionSteps: [
      "Measure width of main entryway door",
      "Attach self-adhesive multi-fin silicone door sweep (approx ₹250 - ₹450)",
      "Ensure bottom fin makes gentle contact with floor threshold"
    ],
    badge: "assumed"
  },
  {
    id: "fix-window-foam-tape",
    fixKey: "window_gap_foam",
    title: "Apply Adhesive Foam Weatherstrip Tape to Window Sashes",
    description: "Sliding aluminum window tracks allow continuous ambient air leakage even when closed. Self-adhesive EPDM foam seals air gaps.",
    budgetBand: "low",
    estimatedReductionPercent: 12,
    actionSteps: [
      "Clean window sash contact edges with rubbing alcohol or damp cloth",
      "Apply high-density foam tape (9mm x 6mm) along meeting rails and frame jambs",
      "Verify tight compression latch closure"
    ],
    badge: "assumed"
  },
  {
    id: "fix-kitchen-exhaust-retrofit",
    fixKey: "exhaust_fan_retro",
    title: "Retrofit 6-inch High-Static Window Exhaust Fan",
    description: "For kitchens without a chimney hood, installing an inexpensive 150mm window exhaust creates mandatory negative pressure during cooking.",
    budgetBand: "low",
    estimatedReductionPercent: 30,
    actionSteps: [
      "Mount 150mm axial or high-static exhaust fan in upper window pane (₹800 - ₹1,200)",
      "Wire to nearby switch or plug-in socket",
      "Run fan during all stovetop frying and boiling"
    ],
    badge: "modelled"
  },

  // Budget Tier: Medium (₹1,500 - ₹3,500)
  {
    id: "fix-diy-cr-box",
    fixKey: "diy_corsi_rosenthal_box",
    title: "Construct DIY Corsi-Rosenthal Air Filter Box",
    description: "A high-flow box fan combined with MERV-13 furnace filter panels delivers 250 m³/h Clean Air Delivery Rate at a fraction of commercial purifier costs.",
    budgetBand: "medium",
    estimatedReductionPercent: 60,
    estimatedCadr: 250,
    actionSteps: [
      "Source one high-static pressure box fan or ventilation blower",
      "Tape two to four MERV-13 pleated air filter panels into a cube intake shroud",
      "Operate continuously on low/medium speed in bedroom or family room"
    ],
    badge: "modelled"
  },

  // Budget Tier: High (> ₹6,000)
  {
    id: "fix-hepa-purifier",
    fixKey: "hepa_air_purifier",
    title: "Deploy H13 True-HEPA Commercial Air Purifier",
    description: "True-HEPA unit delivering CADR ≥ 350 m³/h achieves 4 to 5 clean air changes per hour (ACH) in a standard 45 m³ room, removing over 80% of indoor particulate matter.",
    budgetBand: "high",
    estimatedReductionPercent: 80,
    estimatedCadr: 380,
    actionSteps: [
      "Place purifier at least 30 cm away from walls in the primary bedroom or children's room",
      "Run on Auto or Medium fan speed 24/7 during GRAP Stage III/IV smog alerts",
      "Vacuum pre-filter mesh fortnightly to extend HEPA filter cartridge lifespan"
    ],
    badge: "modelled"
  }
];

export function getFixesForBudget(maxBudget: BudgetBand = "high"): IndoorFix[] {
  const budgetHierarchy: Record<BudgetBand, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3
  };

  const maxLevel = budgetHierarchy[maxBudget];
  return CURATED_INDOOR_FIXES.filter(
    (fix) => budgetHierarchy[fix.budgetBand] <= maxLevel
  );
}

export function getFixesForDetectedSources(
  detectedSourceKeys: string[],
  maxBudget: BudgetBand = "high"
): IndoorFix[] {
  const candidates = getFixesForBudget(maxBudget);
  const relevantFixes = new Set<IndoorFix>();

  for (const key of detectedSourceKeys) {
    if (key === "unvented_gas_stove" || key === "lack_of_exhaust") {
      candidates.filter((f) => f.fixKey === "exhaust_during_cooking" || f.fixKey === "exhaust_fan_retro")
        .forEach((f) => relevantFixes.add(f));
    }
    if (key === "incense_dhoop") {
      candidates.filter((f) => f.fixKey === "eliminate_indoor_incense")
        .forEach((f) => relevantFixes.add(f));
    }
    if (key === "door_window_gaps") {
      candidates.filter((f) => f.fixKey === "door_bottom_weatherstrip" || f.fixKey === "window_gap_foam")
        .forEach((f) => relevantFixes.add(f));
    }
  }

  // Always include baseline behavioral and filtration solutions
  candidates.filter((f) => f.fixKey === "close_windows_inversion" || f.fixKey === "hepa_air_purifier" || f.fixKey === "diy_corsi_rosenthal_box")
    .forEach((f) => relevantFixes.add(f));

  return Array.from(relevantFixes);
}

export function getFixByKey(fixKey: string): IndoorFix | undefined {
  return CURATED_INDOOR_FIXES.find((f) => f.fixKey === fixKey);
}
