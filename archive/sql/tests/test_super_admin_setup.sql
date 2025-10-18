-- Test Super Admin Setup
-- Run this after executing one of the super admin RLS setup files

-- Test 1: Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'current_user_is_super_admin',
    'user_can_access_tenant',
    'user_has_patient_access',
    'set_super_admin_tenant_context',
    'get_super_admin_tenant_context'
  )
ORDER BY routine_name;

-- Test 2: Check current user super admin status
SELECT 
  'Super Admin Check' as test_name,
  public.current_user_is_super_admin() as is_super_admin,
  auth.uid() as user_id;

-- Test 3: Test tenant context functions (if super admin)
DO $$
DECLARE
  is_admin boolean;
  test_tenant_id text;
  context_result text;
BEGIN
  -- Check if user is super admin
  SELECT public.current_user_is_super_admin() INTO is_admin;
  
  IF is_admin THEN
    RAISE NOTICE '✅ Super admin detected - testing tenant context functions';
    
    -- Get a sample tenant ID
    SELECT id::text INTO test_tenant_id FROM tenants LIMIT 1;
    
    IF test_tenant_id IS NOT NULL THEN
      -- Test setting tenant context
      PERFORM public.set_super_admin_tenant_context(test_tenant_id);
      RAISE NOTICE '✅ Set tenant context to: %', test_tenant_id;
      
      -- Test getting tenant context
      SELECT public.get_super_admin_tenant_context() INTO context_result;
      RAISE NOTICE '✅ Retrieved tenant context: %', context_result;
      
      -- Test clearing tenant context
      PERFORM public.set_super_admin_tenant_context(NULL);
      RAISE NOTICE '✅ Cleared tenant context';
      
      -- Verify context is cleared
      SELECT public.get_super_admin_tenant_context() INTO context_result;
      RAISE NOTICE '✅ Context after clearing: %', COALESCE(context_result, 'NULL (ALL_TENANTS)');
    ELSE
      RAISE NOTICE '⚠️ No tenants found - cannot test tenant context functions';
    END IF;
  ELSE
    RAISE NOTICE '❌ Current user is not a super admin';
    RAISE NOTICE 'To make this user a super admin, run:';
    RAISE NOTICE 'UPDATE user_profiles SET role = ''super_admin'', is_active = true WHERE id = ''%'';', auth.uid();
  END IF;
END $$;

-- Test 4: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE policyname LIKE '%super_admin%' OR policyname LIKE '%tenant%'
ORDER BY tablename, policyname;

-- Test 5: Count accessible records (will show current access level)
DO $$
DECLARE
  patient_count integer := 0;
  medication_count integer := 0;
  alert_count integer := 0;
  tenant_count integer := 0;
BEGIN
  -- Count patients
  BEGIN
    SELECT COUNT(*) INTO patient_count FROM patients;
  EXCEPTION WHEN OTHERS THEN
    patient_count := -1;
  END;
  
  -- Count medications
  BEGIN
    SELECT COUNT(*) INTO medication_count FROM patient_medications;
  EXCEPTION WHEN OTHERS THEN
    medication_count := -1;
  END;
  
  -- Count alerts
  BEGIN
    SELECT COUNT(*) INTO alert_count FROM patient_alerts;
  EXCEPTION WHEN OTHERS THEN
    alert_count := -1;
  END;
  
  -- Count tenants
  BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
  EXCEPTION WHEN OTHERS THEN
    tenant_count := -1;
  END;
  
  RAISE NOTICE '📊 Accessible Records Summary:';
  RAISE NOTICE 'Patients: %', CASE WHEN patient_count = -1 THEN 'Table not found' ELSE patient_count::text END;
  RAISE NOTICE 'Medications: %', CASE WHEN medication_count = -1 THEN 'Table not found' ELSE medication_count::text END;
  RAISE NOTICE 'Alerts: %', CASE WHEN alert_count = -1 THEN 'Table not found' ELSE alert_count::text END;
  RAISE NOTICE 'Tenants: %', CASE WHEN tenant_count = -1 THEN 'Table not found' ELSE tenant_count::text END;
END $$;

-- Final status message
DO $$
BEGIN
  RAISE NOTICE '🎉 Super Admin Setup Test Complete!';
  RAISE NOTICE 'If you see errors above, the setup may need adjustments.';
  RAISE NOTICE 'If everything looks good, your super admin multi-tenant system is ready!';
END $$;