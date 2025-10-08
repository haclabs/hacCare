-- ============================================================================
-- COMPREHENSIVE DIAGNOSIS: user_tenant_cache and RLS issues
-- ============================================================================

-- STEP 1: Check what's in patient_alerts table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'patient_alerts'
ORDER BY ordinal_position;

-- STEP 2: Check RLS policies on patient_alerts
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'patient_alerts';

-- STEP 3: Check if RLS policies use user_tenant_cache
SELECT 
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE qual LIKE '%user_tenant_cache%'
   OR with_check LIKE '%user_tenant_cache%';

-- STEP 4: Try to insert directly (as a test)
-- This will tell us if it's an RLS issue or schema issue
DO $$
DECLARE
  v_test_alert_id UUID;
BEGIN
  -- Try direct insert
  INSERT INTO patient_alerts (
    patient_id,
    tenant_id,
    patient_name,
    alert_type,
    priority,
    message,
    acknowledged
  ) VALUES (
    '4eea8bb8-335a-47ea-95a6-d5ce6cf2ca61',
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8',
    'Test Patient',
    'vital_signs'::alert_type_enum,
    'medium'::alert_priority_enum,
    'Test alert - direct insert',
    false
  )
  RETURNING id INTO v_test_alert_id;
  
  RAISE NOTICE 'Direct insert succeeded! Alert ID: %', v_test_alert_id;
  
  -- Clean up test
  DELETE FROM patient_alerts WHERE id = v_test_alert_id;
  RAISE NOTICE 'Test alert cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Direct insert FAILED: % %', SQLERRM, SQLSTATE;
END $$;
