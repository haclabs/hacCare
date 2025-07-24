-- Diagnostic script to check tenant user and patient counts
-- This will help us understand why tenant plans show 0 users

-- 1. Check all tenants and their basic info
SELECT 
  'All Tenants' as check_type,
  id,
  name,
  subdomain,
  subscription_plan,
  max_users,
  max_patients,
  status,
  created_at
FROM tenants
ORDER BY created_at DESC;

-- 2. Check tenant_users table - count users per tenant
SELECT 
  'User Counts per Tenant' as check_type,
  t.name as tenant_name,
  t.id as tenant_id,
  COUNT(tu.user_id) as user_count,
  COUNT(CASE WHEN tu.is_active = true THEN 1 END) as active_user_count
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
WHERE t.status = 'active'
GROUP BY t.id, t.name
ORDER BY t.name;

-- 3. Check patient counts per tenant
SELECT 
  'Patient Counts per Tenant' as check_type,
  t.name as tenant_name,
  t.id as tenant_id,
  COUNT(p.id) as patient_count
FROM tenants t
LEFT JOIN patients p ON t.id = p.tenant_id
WHERE t.status = 'active'
GROUP BY t.id, t.name
ORDER BY t.name;

-- 4. Check specific tenant users with details
SELECT 
  'Tenant User Details' as check_type,
  t.name as tenant_name,
  tu.user_id,
  up.email,
  up.first_name,
  up.last_name,
  tu.role as tenant_role,
  up.role as profile_role,
  tu.is_active as tenant_active,
  up.is_active as profile_active
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
LEFT JOIN user_profiles up ON tu.user_id = up.id
WHERE t.status = 'active'
ORDER BY t.name, up.email;

-- 5. Test the get_tenant_users function for each tenant
SELECT 
  'Testing get_tenant_users function' as check_type,
  'Run this for each tenant ID:' as instruction;

-- 6. Check if RLS policies are blocking access to tenant_users
SELECT 
  'RLS Status for tenant_users' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'tenant_users') as policy_count
FROM pg_tables 
WHERE tablename = 'tenant_users';

-- 7. Show users that might not be in tenant_users but should be
SELECT 
  'Users without tenant assignment' as check_type,
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.role,
  up.is_active
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
WHERE tu.user_id IS NULL 
AND up.is_active = true
AND up.role != 'super_admin'  -- Super admins don't need tenant assignment
ORDER BY up.email;

-- 8. Check current user's permissions
SELECT 
  'Current User Info' as check_type,
  auth.uid() as current_user_id,
  (SELECT role FROM user_profiles WHERE id = auth.uid()) as current_user_role;
