-- ============================================================================
-- FIX: Reset Timer on Simulation Reset
-- ============================================================================
-- Issue: When completing a simulation and resetting for next session,
--        the timer was not resetting - starts_at and ends_at remained unchanged
-- Solution: Update reset_simulation_for_next_session_v2 to reset timer values
-- ============================================================================

-- This is a partial update - only the UPDATE statement needs to change
-- The full function is in: database/migrations/DEPLOY_TO_CLOUD_SUPABASE.sql

-- Just run this ALTER to add timer reset to existing function:
-- Or re-deploy the full function from DEPLOY_TO_CLOUD_SUPABASE.sql

-- For manual fix of existing completed simulation:
/*
UPDATE simulation_active
SET
  starts_at = NOW(),
  ends_at = NOW() + (duration_minutes || ' minutes')::interval,
  status = 'running'
WHERE id = 'YOUR_SIMULATION_ID' AND status = 'completed';
*/

-- The reset function now includes these lines at line ~370:
-- UPDATE simulation_active
-- SET
--   session_number = COALESCE(session_number, 0) + 1,
--   last_reset_at = now(),
--   reset_count = COALESCE(reset_count, 0) + 1,
--   updated_at = now(),
--   starts_at = NOW(),                                            -- ✅ NEW: Reset timer
--   ends_at = NOW() + (duration_minutes || ' minutes')::interval, -- ✅ NEW: Recalculate end time
--   status = 'running'                                            -- ✅ NEW: Set back to running
-- WHERE id = p_simulation_id;

-- Verification query to check the fix was applied:
SELECT 
  'Timer reset fix applied to reset_simulation_for_next_session_v2' as message,
  'Deploy the full function from database/migrations/DEPLOY_TO_CLOUD_SUPABASE.sql' as action,
  'The function now resets: starts_at, ends_at, and status when resetting simulation' as details;
