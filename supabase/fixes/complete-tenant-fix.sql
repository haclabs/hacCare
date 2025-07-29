-- Complete fix for tenant assignment and medication visibility
-- Run this in Supabase SQL Editor

-- 1. First, let's see what we're working with
SELECT 'Current situation check' as step;
SELECT 
  u.id as user_id,
  u.email,
  up.role as user_role
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.email = 'admin@haccare.com';

-- 2. Check existing tenant assignment
SELECT 'Existing tenant assignment' as step;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active,
  t.name as tenant_name
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
JOIN auth.users u ON tu.user_id = u.id
WHERE u.email = 'admin@haccare.com';

-- 3. Get the first available tenant
SELECT 'Available tenants' as step;
SELECT id, name, status FROM tenants WHERE status = 'active' ORDER BY created_at LIMIT 1;

-- 4. Force delete any existing assignment and recreate it properly
DELETE FROM tenant_users 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@haccare.com');

-- 5. Create a fresh, clean tenant assignment
INSERT INTO tenant_users (user_id, tenant_id, role, permissions, is_active, created_at, updated_at)
SELECT 
  u.id as user_id,
  t.id as tenant_id,
  'admin' as role,
  ARRAY[
    'patients:read', 'patients:write', 'patients:delete',
    'medications:read', 'medications:write', 'medications:delete',
    'alerts:read', 'alerts:write',
    'users:read', 'users:write',
    'settings:read', 'settings:write'
  ] as permissions,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
CROSS JOIN (SELECT id FROM tenants WHERE status = 'active' ORDER BY created_at LIMIT 1) t
WHERE u.email = 'admin@haccare.com';

-- 6. Verify the assignment worked
SELECT 'Verification after assignment' as step;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active,
  t.name as tenant_name,
  u.email
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
JOIN auth.users u ON tu.user_id = u.id
WHERE u.email = 'admin@haccare.com';

-- 7. Test the tenant function again
SELECT 'Testing tenant function after fix' as step;
SELECT * FROM get_user_current_tenant(
  (SELECT id FROM auth.users WHERE email = 'admin@haccare.com')
);

-- 8. Check medications visibility (with proper tenant context)
SELECT 'Medications that should be visible' as step;
SELECT 
  pm.id,
  pm.patient_id,
  pm.name,
  pm.tenant_id,
  pm.created_at,
  'Should be visible if tenant matches' as note
FROM patient_medications pm
WHERE pm.tenant_id = (
  SELECT tu.tenant_id 
  FROM tenant_users tu 
  JOIN auth.users u ON tu.user_id = u.id 
  WHERE u.email = 'admin@haccare.com' 
  AND tu.is_active = true
  LIMIT 1
)
ORDER BY pm.created_at DESC;
