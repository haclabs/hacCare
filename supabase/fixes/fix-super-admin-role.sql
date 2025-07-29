-- Fix both user profile role and tenant assignment
-- Run this in Supabase SQL Editor

-- 1. Check current user profile role
SELECT 'Current user profile check' as info;
SELECT 
  up.id,
  up.email,
  up.role as current_role
FROM user_profiles up
WHERE up.email = 'admin@haccare.com';

-- 2. Update user profile to super_admin if needed
UPDATE user_profiles 
SET role = 'super_admin'
WHERE email = 'admin@haccare.com' 
AND role != 'super_admin';

-- 3. Verify the profile update
SELECT 'Profile after update' as info;
SELECT 
  up.id,
  up.email,
  up.role as updated_role
FROM user_profiles up
WHERE up.email = 'admin@haccare.com';

-- 4. Check current tenant assignment
SELECT 'Current tenant assignment' as info;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role as tenant_role,
  tu.is_active,
  t.name as tenant_name
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
JOIN auth.users u ON tu.user_id = u.id
WHERE u.email = 'admin@haccare.com';

-- 5. Update tenant assignment to super_admin role as well
UPDATE tenant_users 
SET role = 'super_admin',
    permissions = ARRAY[
      'patients:read', 'patients:write', 'patients:delete',
      'medications:read', 'medications:write', 'medications:delete', 
      'alerts:read', 'alerts:write',
      'users:read', 'users:write', 'users:delete',
      'settings:read', 'settings:write',
      'system:admin'
    ]
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@haccare.com');

-- 6. Final verification
SELECT 'Final verification' as info;
SELECT 
  up.role as profile_role,
  tu.role as tenant_role,
  tu.is_active,
  t.name as tenant_name,
  u.email
FROM auth.users u
JOIN user_profiles up ON up.id = u.id
JOIN tenant_users tu ON tu.user_id = u.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE u.email = 'admin@haccare.com';

-- 7. Test the tenant function
SELECT 'Tenant function test' as info;
SELECT * FROM get_user_current_tenant(
  (SELECT id FROM auth.users WHERE email = 'admin@haccare.com')
);
