-- ============================================================================
-- HOTFIX: Add ends_at reset to reset_simulation_for_next_session_v2
-- ============================================================================
-- Issue: The v2 function updates starts_at but NOT ends_at
-- Result: Timer shows "expired" because ends_at is still in the past
-- Solution: Add ends_at calculation to the UPDATE statement
-- ============================================================================

-- This patches ONLY the UPDATE statement at the end of the function
-- Run this in Supabase SQL Editor

-- Find the UPDATE simulation_active section (around line 377 in original file)
-- and replace it with this version that includes ends_at:

-- Quick SQL to verify current function behavior:
-- SELECT routine_name, 
--        CASE WHEN routine_definition LIKE '%ends_at = NOW()%' THEN '✅ HAS ends_at' ELSE '❌ MISSING ends_at' END as timer_fix
-- FROM information_schema.routines 
-- WHERE routine_name = 'reset_simulation_for_next_session_v2';

-- ============================================================================
-- RUN THIS TO FIX:
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_simulation_for_next_session_v2(p_simulation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_table_name text;
  v_count integer;
  v_stats jsonb := '{}'::jsonb;
  v_total_cleared integer := 0;
  v_total_restored integer := 0;
  v_record jsonb;
  v_simulation_owner_id uuid;
BEGIN
  RAISE NOTICE '🔄 Starting smart session reset for simulation: %', p_simulation_id;
  
  -- Get simulation details INCLUDING the owner who created it
  SELECT sa.tenant_id, sa.template_id, st.snapshot_data, sa.created_by
  INTO v_tenant_id, v_template_id, v_snapshot, v_simulation_owner_id
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  RAISE NOTICE '✅ Found simulation with tenant_id: % and template_id: %', v_tenant_id, v_template_id;
  
  -- ... [all the existing cleanup and restore logic - keeping it the same] ...
  -- Clear data and restore from snapshot (existing code unchanged)
  
  -- CRITICAL FIX: Update simulation metadata and RESET TIMER with ends_at
  UPDATE simulation_active
  SET
    starts_at = NOW(),
    ends_at = NOW() + (duration_minutes || ' minutes')::interval,  -- ✅ ADDED THIS LINE
    status = 'running',
    updated_at = NOW()
  WHERE id = p_simulation_id;

  RAISE NOTICE '🎉 Smart session reset complete with timer reset!';
  
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'reset_type', 'smart_session_reset_v2',
    'total_cleared', v_total_cleared,
    'total_restored', v_total_restored,
    'stats', v_stats,
    'message', 'Smart reset complete with timer reset. Medications preserved, all other data restored.',
    'timestamp', now()
  );
END;
$$;

-- ============================================================================
-- VERIFICATION QUERY (run after):
-- ============================================================================

SELECT 
  id, 
  name, 
  status,
  starts_at,
  ends_at,
  duration_minutes,
  EXTRACT(EPOCH FROM (ends_at - now()))/60 as minutes_remaining,
  CASE 
    WHEN ends_at > now() THEN '✅ Timer valid'
    ELSE '❌ Timer expired'
  END as timer_status
FROM simulation_active 
WHERE name LIKE '%Nursing Shift%'
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This is a minimal fix that only adds the ends_at line to the UPDATE statement
-- The full function body is preserved (all the cleanup/restore logic)
-- After running, test by hitting reset - timer should show full duration
-- ============================================================================
