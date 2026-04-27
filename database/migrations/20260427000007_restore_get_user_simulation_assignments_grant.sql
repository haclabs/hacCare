-- ============================================================================
-- Restore EXECUTE grant on get_user_simulation_assignments
-- ============================================================================
-- Migration 20260427000004 mistakenly revoked this function from authenticated.
-- It is actively called via supabase.rpc() in SimulationPortal.tsx (line 66).
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_user_simulation_assignments(
  p_user_id uuid
) TO authenticated;
