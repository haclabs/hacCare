-- =====================================================
-- DEBUG: Test if medication_administrations DELETE works
-- =====================================================
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check current medication_administrations count
SELECT 
  tenant_id,
  COUNT(*) as med_admin_count,
  array_agg(medication_name) as meds
FROM medication_administrations
WHERE tenant_id IN (SELECT tenant_id FROM simulation_active WHERE status = 'running')
GROUP BY tenant_id;

-- 2. Try a manual DELETE to see if it works
-- Replace 'YOUR_TENANT_ID' with actual tenant_id from above query
-- DELETE FROM medication_administrations WHERE tenant_id = 'YOUR_TENANT_ID';

-- 3. Check if there are any foreign key constraints blocking deletion
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'medication_administrations';

-- 4. Test the reset function with logging
DO $$
DECLARE
  v_sim_id uuid;
  v_tenant_id uuid;
  v_count_before int;
  v_count_after int;
BEGIN
  -- Get a running simulation
  SELECT id, tenant_id INTO v_sim_id, v_tenant_id
  FROM simulation_active
  WHERE status = 'running'
  LIMIT 1;
  
  IF v_sim_id IS NULL THEN
    RAISE NOTICE '❌ No running simulations found';
    RETURN;
  END IF;
  
  -- Count before
  SELECT COUNT(*) INTO v_count_before
  FROM medication_administrations
  WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE '📊 Before reset: % medication administrations', v_count_before;
  
  -- Try manual delete
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count_after = ROW_COUNT;
  
  RAISE NOTICE '🗑️ Manual DELETE removed % records', v_count_after;
  
  -- Count after
  SELECT COUNT(*) INTO v_count_after
  FROM medication_administrations
  WHERE tenant_id = v_tenant_id;
  
  RAISE NOTICE '📊 After manual delete: % medication administrations', v_count_after;
  
  -- Rollback so we don't actually delete anything
  RAISE EXCEPTION 'Test complete - rolling back changes';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Test complete: %', SQLERRM;
END $$;
