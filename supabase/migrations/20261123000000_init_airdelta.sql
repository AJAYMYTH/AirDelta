-- AirDelta Production PostgreSQL Schema with Row-Level Security (RLS)
-- Version: 1.0.0 · Date: 2026-11-23

-- Enable pgcrypto for UUID generation if not already active
create extension if not exists "pgcrypto";

-- 1. Households (Core Tenant Table)
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null, -- references auth.users(id) on delete cascade
  city_code text not null default 'DELHI',
  grid_cell text not null, -- ~1.1 km cell (e.g. "28.61:77.21"), zero street address PII
  lang text not null default 'en',
  budget_band text not null default 'low' check (budget_band in ('none', 'low', 'medium', 'high')),
  cooks_indoors boolean not null default true,
  has_exhaust boolean not null default false,
  has_purifier boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 2. Household Members (Zero Medical Diagnoses, Only Age Bands & Caution Flag)
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  age_band text not null check (age_band in ('child', 'teen', 'adult', 'senior')),
  caution_mode boolean not null default false,
  label text
);

-- 3. Routine Segments
create table if not exists routine_segments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  kind text not null check (kind in ('commute', 'school_run', 'walk', 'cooking', 'outdoor_play', 'work_outdoor', 'window_open', 'rest')),
  mode text check (mode in ('walk', 'cycle', 'two_wheeler', 'bus', 'metro', 'car', 'auto')),
  start_hour int not null check (start_hour >= 0 and start_hour <= 23),
  duration_minutes int not null check (duration_minutes >= 5 and duration_minutes <= 1440),
  is_indoor boolean not null default true,
  mask_used boolean not null default false
);

-- 4. Air Snapshots Cache (Spatial cell cache shared across households)
create table if not exists air_snapshots (
  cell text not null,
  ts timestamptz not null,
  provider text not null,
  pm25 numeric,
  pm10 numeric,
  index_value int,
  index_standard text not null default 'ind_cpcb',
  category text,
  badge text not null check (badge in ('measured', 'forecast', 'modelled', 'assumed')),
  license text not null,
  attribution text not null,
  station_distance_km numeric,
  fetched_at timestamptz not null default now(),
  primary key (cell, ts, provider)
);

-- 5. Generated Plans
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  for_date date not null default current_date,
  inputs jsonb not null,
  result jsonb not null,
  engine_version text not null,
  constants_version text not null,
  created_at timestamptz not null default now()
);

-- Index on created_at for 30-day retention pruning
create index if not exists idx_plans_created_at on plans(created_at);

-- 6. Plan Action Completion Tracking
create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  action_key text not null,
  done_at timestamptz not null default now()
);

-- 7. Community Groups
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'rwa' check (kind in ('rwa', 'school', 'workplace', 'community')),
  name text not null,
  city_code text not null default 'DELHI',
  join_code text unique not null,
  created_at timestamptz not null default now()
);

-- 8. Group Memberships
create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, household_id)
);

-- 9. Community Advisories
create table if not exists advisories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete set null,
  lang text not null default 'hi',
  headline text not null,
  body text not null,
  grap_stage text not null,
  action_bullets jsonb not null,
  share_card_text text not null,
  created_at timestamptz not null default now()
);

-- 10. Constants Registry Table (Living Record of Equations)
create table if not exists constants_registry (
  key text not null,
  version text not null,
  value numeric not null,
  unit text not null,
  confidence text not null,
  source_url text not null,
  description text not null,
  primary key (key, version)
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

alter table households enable row level security;
alter table members enable row level security;
alter table routine_segments enable row level security;
alter table plans enable row level security;
alter table actions enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table air_snapshots enable row level security;
alter table advisories enable row level security;
alter table constants_registry enable row level security;

-- Households: Users can only select, insert, or update their own household
create policy households_owner_all on households
  for all using (auth.uid() = owner);

-- Members: Users can only view/modify members belonging to their household
create policy members_owner_all on members
  for all using (
    exists (
      select 1 from households
      where households.id = members.household_id
      and households.owner = auth.uid()
    )
  );

-- Routine Segments: Users can only view/modify their own segments
create policy routines_owner_all on routine_segments
  for all using (
    exists (
      select 1 from households
      where households.id = routine_segments.household_id
      and households.owner = auth.uid()
    )
  );

-- Plans: Users can only view their own plans
create policy plans_owner_all on plans
  for all using (
    exists (
      select 1 from households
      where households.id = plans.household_id
      and households.owner = auth.uid()
    )
  );

-- Actions: Users can only view/modify actions on their own plans
create policy actions_owner_all on actions
  for all using (
    exists (
      select 1 from plans
      join households on households.id = plans.household_id
      where plans.id = actions.plan_id
      and households.owner = auth.uid()
    )
  );

-- Air Snapshots & Constants: Publicly readable by all authenticated/anon sessions
create policy air_snapshots_read_public on air_snapshots
  for select using (true);

create policy constants_read_public on constants_registry
  for select using (true);

create policy groups_read_public on groups
  for select using (true);

create policy advisories_read_public on advisories
  for select using (true);

-- Group Memberships: Members can see their own group memberships
create policy group_members_owner_all on group_members
  for all using (
    exists (
      select 1 from households
      where households.id = group_members.household_id
      and households.owner = auth.uid()
    )
  );

-- =========================================================================
-- k-ANONYMITY VIEW FOR COMMUNITY IMPACT (k >= 5)
-- =========================================================================

create or replace view community_group_impact with (security_invoker = false) as
select 
  gm.group_id,
  g.name as group_name,
  g.city_code,
  case when count(distinct gm.household_id) >= 5 then count(distinct gm.household_id) else null end as active_households,
  case when count(distinct gm.household_id) >= 5 then true else false end as is_anonymity_satisfied,
  case when count(distinct gm.household_id) >= 5 then count(a.id) else null end as total_actions_taken,
  case when count(distinct gm.household_id) >= 5 then round((count(distinct gm.household_id) * 0.185)::numeric, 1) else null end as estimated_community_pm25_prevented_grams
from group_members gm
join groups g on g.id = gm.group_id
left join plans p on p.household_id = gm.household_id
left join actions a on a.plan_id = p.id
group by gm.group_id, g.name, g.city_code;
