-- Diagnostic: Check Tenant Deletion Permissions
-- Run this first to understand why tenant deletion is failing
-- This will help identify the exact permission issue

-- 1. Check current user's role and permissions
SELECT 
  'Current User Info' as check_type,
  auth.uid() as user_id,
  up.email,
  up.role,
  up.is_active,
  CASE 
    WHEN up.role = 'super_admin' THEN 'Should have full tenant deletion access'
    WHEN up.role = 'admin' THEN 'Limited to own tenant management'
    ELSE 'No tenant deletion permissions'
  END as expected_permissions
FROM user_profiles up
WHERE up.id = auth.uid();

-- 2. Check RLS status on relevant tables
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pt.tablename) as policy_count
FROM pg_tables pt
WHERE tablename IN ('tenants', 'tenant_users', 'user_profiles')
ORDER BY tablename;

-- 3. Check existing policies on tenants table
SELECT 
  'Tenants Table Policies' as check_type,
  policyname,
  cmd as operation,
  permissive,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY cmd, policyname;

-- 4. Check existing policies on tenant_users table
SELECT 
  'Tenant Users Table Policies' as check_type,
  policyname,
  cmd as operation,
  permissive,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'tenant_users'
ORDER BY cmd, policyname;

-- 5. Check if there are any tenants and your access to them
SELECT 
  'Tenant Access Test' as check_type,
  t.id,
  t.name,
  t.subdomain,
  t.status,
  CASE 
    WHEN tu.user_id IS NOT NULL THEN 'Has direct access via tenant_users'
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin') THEN 'Has super admin access'
    ELSE 'No access'
  END as access_type
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.user_id = auth.uid() AND tu.is_active = true
ORDER BY t.name;

-- 6. Test if you can see tenant_users table at all
SELECT 
  'Tenant Users Access Test' as check_type,
  COUNT(*) as total_records_visible,
  COUNT(DISTINCT tenant_id) as tenants_visible,
  COUNT(DISTINCT user_id) as users_visible
FROM tenant_users;

-- 7. Check for any foreign key constraints that might block deletion
SELECT 
  'Foreign Key Constraints' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name = 'tenants' OR tc.table_name = 'tenants')
ORDER BY tc.table_name, kcu.ordinal_position;

-- 8. Check if there are any functions that might help with deletion
SELECT 
  'Available Deletion Functions' as check_type,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name LIKE '%delete%' 
   OR routine_name LIKE '%remove%'
   OR routine_name LIKE '%tenant%'
ORDER BY routine_name;

-- 9. Test basic DELETE permission on tenants table
SELECT 
  'Permission Test Result' as check_type,
  CASE 
    WHEN has_table_privilege('tenants', 'DELETE') THEN 'Has DELETE privilege on tenants table'
    ELSE 'No DELETE privilege on tenants table'
  END as delete_privilege,
  CASE 
    WHEN has_table_privilege('tenant_users', 'DELETE') THEN 'Has DELETE privilege on tenant_users table'
    ELSE 'No DELETE privilege on tenant_users table'
  END as tenant_users_delete_privilege;

-- 10. Show the exact error context
SELECT 
  'Error Context Analysis' as check_type,
  'If you are getting "permission denied for table tenant_users"' as issue,
  'This means RLS policies are blocking DELETE operations on tenant_users table' as likely_cause,
  'Run the fix-tenant-deletion-permissions-secure.sql script to resolve this' as solution;
