-- Fix the role constraint issue
-- Run this in Supabase SQL Editor

-- 1. Check what roles are allowed in tenant_users table
SELECT 'Checking role constraint' as info;
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'tenant_users_role_check';

-- 2. Update user profile to super_admin (this should work)
UPDATE user_profiles 
SET role = 'super_admin'
WHERE email = 'admin@haccare.com' 
AND role != 'super_admin';

-- 3. Keep tenant_users role as 'admin' but with full permissions
UPDATE tenant_users 
SET permissions = ARRAY[
      'patients:read', 'patients:write', 'patients:delete',
      'medications:read', 'medications:write', 'medications:delete', 
      'alerts:read', 'alerts:write',
      'users:read', 'users:write', 'users:delete',
      'settings:read', 'settings:write',
      'system:admin'
    ],
    is_active = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@haccare.com');

-- 4. Final verification - check both tables
SELECT 'User profile verification' as info;
SELECT 
  up.id,
  up.email,
  up.role as profile_role
FROM user_profiles up
WHERE up.email = 'admin@haccare.com';

SELECT 'Tenant assignment verification' as info;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role as tenant_role,
  tu.is_active,
  t.name as tenant_name,
  u.email
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
JOIN auth.users u ON tu.user_id = u.id
WHERE u.email = 'admin@haccare.com';

-- 5. Test the tenant function
SELECT 'Tenant function test' as info;
SELECT * FROM get_user_current_tenant(
  (SELECT id FROM auth.users WHERE email = 'admin@haccare.com')
);
