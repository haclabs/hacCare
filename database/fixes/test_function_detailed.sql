-- ============================================================================
-- DEBUG: Check Function Results and Errors
-- ============================================================================

-- First, verify the 'program' enum value exists
SELECT 
  '=== ENUM VALUES ===' as step,
  enumlabel 
FROM pg_enum 
WHERE enumtypid = 'tenant_type'::regtype
ORDER BY enumsortorder;

-- Test the function and show full result
DO $$
DECLARE
  v_result json;
  v_program_id uuid;
BEGIN
  -- Get BNAD program ID
  SELECT id INTO v_program_id FROM programs WHERE code = 'BNAD';
  
  RAISE NOTICE '=== TESTING BNAD ===';
  RAISE NOTICE 'Program ID: %', v_program_id;
  RAISE NOTICE 'Parent Tenant ID: 2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8';
  
  -- Call function
  BEGIN
    SELECT create_program_tenant(
      v_program_id,
      '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
    ) INTO v_result;
    
    RAISE NOTICE 'Function returned: %', v_result;
    RAISE NOTICE 'Success: %', v_result->>'success';
    RAISE NOTICE 'Message: %', v_result->>'message';
    RAISE NOTICE 'Error: %', v_result->>'error';
    RAISE NOTICE 'Tenant ID: %', v_result->>'tenant_id';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ EXCEPTION: %', SQLERRM;
    RAISE NOTICE 'DETAIL: %', SQLSTATE;
  END;
END $$;

-- Check if any tenants were created
SELECT 
  '=== TENANTS WITH PROGRAM_ID ===' as step,
  COUNT(*) as count
FROM tenants 
WHERE program_id IS NOT NULL;

-- Try to manually insert a program tenant to see what error we get
DO $$
DECLARE
  v_program_id uuid;
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_program_id FROM programs WHERE code = 'NESA';
  
  RAISE NOTICE '=== MANUAL INSERT TEST FOR NESA ===';
  
  BEGIN
    INSERT INTO tenants (
      name,
      subdomain,
      tenant_type,
      parent_tenant_id,
      program_id,
      is_simulation,
      status
    ) VALUES (
      'NESA Program Test',
      'nesa_test',
      'program',
      '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
      v_program_id,
      false,
      'active'
    ) RETURNING id INTO v_tenant_id;
    
    RAISE NOTICE '✅ Manual insert succeeded! Tenant ID: %', v_tenant_id;
    
    -- Clean up test
    DELETE FROM tenants WHERE id = v_tenant_id;
    RAISE NOTICE 'Test tenant deleted';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Manual insert failed!';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'SQL State: %', SQLSTATE;
  END;
END $$;
