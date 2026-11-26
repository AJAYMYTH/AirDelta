-- Grant schema and table permissions required by Supabase PostgREST roles
-- Fixes HTTP 401/403 (42501 permission denied) when tables are created via SQL migrations

grant usage on schema public to anon, authenticated, service_role;

-- Service role (backend API & retention jobs) gets full access
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Publicly readable reference / aggregated tables (RLS already enabled)
grant select on table public.constants_registry to anon, authenticated;
grant select on table public.groups to anon, authenticated;
grant select on table public.air_snapshots to anon, authenticated;
grant select on table public.advisories to anon, authenticated;
grant select on table public.community_group_impact to anon, authenticated;

-- Authenticated user tenant tables (protected by auth.uid() = owner RLS policies)
grant select, insert, update, delete on table public.households to authenticated;
grant select, insert, update, delete on table public.members to authenticated;
grant select, insert, update, delete on table public.routine_segments to authenticated;
grant select, insert, update, delete on table public.plans to authenticated;
grant select, insert, update, delete on table public.actions to authenticated;
grant select, insert, update, delete on table public.group_members to authenticated;
