-- ============================================================================
-- HOTFIX: Restore EXECUTE grant on get_user_simulation_assignments
-- ============================================================================
-- 20260907000001_relock_unused_security_definer_functions.sql incorrectly
-- revoked `authenticated` from this function. It IS actively used by
-- src/features/simulation/components/SimulationPortal.tsx (instructors/
-- students joining an active simulation) — it was missed by the prior
-- session's grep verification because the client calls it via a multi-line
-- `supabase.rpc(\n  'get_user_simulation_assignments', ...)` form, not a
-- single-line `rpc('name', ...)` match.
--
-- This exact function already regressed and was restored once before, see
-- database/migrations/history/20260427000007_restore_get_user_simulation_
-- assignments_grant.sql. Function itself already has an internal
-- `p_user_id != auth.uid()` check, so this grant is safe.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_user_simulation_assignments(p_user_id uuid) TO authenticated;
