-- ============================================================================
-- DIAGNOSE: Super Admin Tenant Visibility Issue
-- ============================================================================

-- 1. Show ALL tenants (should show everything for super admin)
SELECT 
  '1. ALL TENANTS' as check_name,
  id,
  name,
  tenant_type,
  status,
  is_simulation,
  parent_tenant_id IS NOT NULL as has_parent
FROM tenants
ORDER BY 
  CASE tenant_type
    WHEN 'institution' THEN 1
    WHEN 'simulation_template' THEN 2
    WHEN 'simulation_active' THEN 3
    WHEN 'program' THEN 4
    ELSE 5
  END,
  created_at;

-- 2. Check if CHECK constraint exists
SELECT 
  '2. CHECK CONSTRAINTS' as check_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'tenants'
  AND con.contype = 'c';

-- 3. Check RLS policies on tenants table
SELECT 
  '3. RLS POLICIES' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;

-- 4. Verify RLS is enabled
SELECT 
  '4. RLS STATUS' as check_name,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'tenants';

-- 5. Count tenants by type
SELECT 
  '5. TENANT COUNTS' as check_name,
  tenant_type,
  COUNT(*) as count
FROM tenants
GROUP BY tenant_type
ORDER BY count DESC;
