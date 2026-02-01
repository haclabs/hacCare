-- ============================================================================
-- DEBUG: Why Program Tenants Weren't Created
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- 1. Check if parent tenant exists
SELECT '=== PARENT TENANT CHECK ===' as step;
SELECT 
  id,
  name,
  tenant_type,
  status,
  created_at
FROM tenants
WHERE tenant_type IN ('production', 'institution')
  AND status = 'active'
ORDER BY 
  CASE WHEN name ILIKE '%lethpoly%' THEN 1 ELSE 2 END,
  created_at
LIMIT 5;

-- 2. Check if programs exist and have tenant_id
SELECT '=== PROGRAMS CHECK ===' as step;
SELECT 
  id,
  code,
  name,
  tenant_id,
  is_active,
  created_at
FROM programs
WHERE is_active = true
ORDER BY code;

-- 3. Check if create_program_tenant function exists
SELECT '=== FUNCTION CHECK ===' as step;
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'create_program_tenant';

-- 4. Check if program_id column was added to tenants
SELECT '=== TENANTS TABLE SCHEMA ===' as step;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND column_name IN ('program_id', 'tenant_type', 'parent_tenant_id', 'name', 'subdomain')
ORDER BY 
  CASE 
    WHEN column_name = 'program_id' THEN 1
    WHEN column_name = 'tenant_type' THEN 2
    WHEN column_name = 'parent_tenant_id' THEN 3
    ELSE 4
  END;

-- 5. Check tenant_type enum values
SELECT '=== TENANT_TYPE ENUM VALUES ===' as step;
SELECT 
  enumlabel as value,
  enumsortorder as position
FROM pg_enum
WHERE enumtypid = 'tenant_type'::regtype
ORDER BY enumsortorder;

-- 6. Test calling the function directly for one program
SELECT '=== MANUAL FUNCTION TEST ===' as step;
DO $$
DECLARE
  v_parent_id UUID;
  v_program_id UUID;
  v_result json;
BEGIN
  -- Get parent tenant
  SELECT id INTO v_parent_id
  FROM tenants
  WHERE tenant_type IN ('production', 'institution')
    AND status = 'active'
  LIMIT 1;
  
  -- Get first program
  SELECT id INTO v_program_id
  FROM programs
  WHERE is_active = true
  LIMIT 1;
  
  RAISE NOTICE 'Parent Tenant ID: %', v_parent_id;
  RAISE NOTICE 'Program ID: %', v_program_id;
  
  IF v_parent_id IS NULL THEN
    RAISE NOTICE '❌ No parent tenant found!';
    RETURN;
  END IF;
  
  IF v_program_id IS NULL THEN
    RAISE NOTICE '❌ No programs found!';
    RETURN;
  END IF;
  
  -- Try to create
  SELECT create_program_tenant(v_program_id, v_parent_id) INTO v_result;
  
  RAISE NOTICE 'Result: %', v_result;
END $$;

-- 7. Final check - show current state of program tenants
SELECT '=== CURRENT PROGRAM TENANT STATE ===' as step;
SELECT 
  p.code as program_code,
  p.name as program_name,
  p.tenant_id as program_parent_tenant,
  t.id as tenant_id,
  t.name as tenant_name,
  t.subdomain,
  t.tenant_type,
  t.status,
  t.parent_tenant_id
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;
