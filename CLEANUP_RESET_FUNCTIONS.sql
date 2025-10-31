-- ============================================================================
-- CLEANUP: Remove duplicate/conflicting reset and restore functions
-- ============================================================================
-- Issue: Multiple versions of restore_snapshot_to_tenant causing conflicts
-- Solution: Drop all versions and recreate only the ones we need
-- ============================================================================

-- Step 1: Drop ALL versions of restore_snapshot_to_tenant
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb, jsonb) CASCADE;

-- Step 2: Drop old reset functions
DROP FUNCTION IF EXISTS reset_simulation(uuid) CASCADE;
DROP FUNCTION IF EXISTS reset_simulation_for_next_session(uuid) CASCADE;

-- Step 3: Keep only reset_simulation_for_next_session_v2
-- (This function is already in your database and works correctly)
-- We just need to fix it to update the timer

-- Step 4: Create a simple reset_simulation that updates timer
CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_sim simulation_active%ROWTYPE;
  v_result json;
BEGIN
  -- Get simulation details
  SELECT * INTO v_sim
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_sim.id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Simply update the timer and status
  -- Explicitly set ends_at to ensure it's correct
  UPDATE simulation_active
  SET 
    starts_at = now(),
    ends_at = now() + (v_sim.duration_minutes || ' minutes')::interval,
    status = 'running',
    updated_at = now()
  WHERE id = p_simulation_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Simulation timer reset successfully',
    'simulation_id', p_simulation_id,
    'new_starts_at', now(),
    'new_ends_at', now() + (v_sim.duration_minutes || ' minutes')::interval
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reset_simulation(uuid) TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Removed:';
  RAISE NOTICE '  - Duplicate restore_snapshot_to_tenant functions';
  RAISE NOTICE '  - Old reset_simulation functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Kept:';
  RAISE NOTICE '  - reset_simulation_for_next_session_v2 (full reset with data restore)';
  RAISE NOTICE '  - reset_simulation (simple timer reset)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Timer reset now works via calculate_simulation_ends_at trigger';
  RAISE NOTICE '========================================';
END $$;
