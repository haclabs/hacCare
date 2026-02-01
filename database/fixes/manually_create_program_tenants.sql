-- ============================================================================
-- MANUALLY CREATE PROGRAM TENANTS
-- ============================================================================
-- This script manually creates program tenants for existing programs
-- Run this if the automatic migration in section 6 didn't work
-- ============================================================================

DO $$
DECLARE
  v_program RECORD;
  v_result json;
  v_parent_tenant_id UUID;
BEGIN
  -- Find the parent tenant (LethPoly)
  SELECT id INTO v_parent_tenant_id
  FROM tenants
  WHERE tenant_type IN ('production', 'institution')
    AND status = 'active'
  ORDER BY 
    CASE WHEN name ILIKE '%lethpoly%' THEN 1 ELSE 2 END,
    created_at
  LIMIT 1;

  IF v_parent_tenant_id IS NULL THEN
    RAISE EXCEPTION '❌ No parent tenant found. Cannot create program tenants.';
  END IF;

  RAISE NOTICE '📍 Using parent tenant ID: %', v_parent_tenant_id;

  -- Manually create tenant for each program
  FOR v_program IN 
    SELECT * FROM programs WHERE is_active = true ORDER BY code
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Processing program: % (%)', v_program.name, v_program.code;
    
    -- Check if tenant already exists
    IF EXISTS (SELECT 1 FROM tenants WHERE program_id = v_program.id) THEN
      RAISE NOTICE '⚠️ Program tenant already exists, skipping...';
      CONTINUE;
    END IF;
    
    -- Call the function
    BEGIN
      SELECT create_program_tenant(v_program.id, v_parent_tenant_id) INTO v_result;
      
      IF (v_result->>'success')::boolean THEN
        RAISE NOTICE '✅ SUCCESS: %', v_result->>'message';
        RAISE NOTICE '   Tenant ID: %', v_result->>'tenant_id';
        RAISE NOTICE '   Tenant Name: %', v_result->>'tenant_name';
        RAISE NOTICE '   Subdomain: %', v_result->>'subdomain';
      ELSE
        RAISE WARNING '❌ FAILED: %', v_result->>'error';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ EXCEPTION: %', SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Manual program tenant creation complete';
END $$;

-- Verify results
SELECT 
  p.code as program_code,
  p.name as program_name,
  t.name as tenant_name,
  t.subdomain,
  t.status,
  t.tenant_type,
  (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id) as user_count
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;
