-- Fix tenant assignment for admin user
-- Run this in your Supabase SQL Editor

-- First, let's see the current user and available tenants
SELECT 'Current user check' as info;
SELECT 
  u.id as user_id,
  u.email,
  up.role
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
WHERE u.email = 'admin@haccare.com';

SELECT 'Available tenants' as info;
SELECT id, name, status FROM tenants WHERE status = 'active';

-- Now assign the admin user to the first available tenant
INSERT INTO tenant_users (user_id, tenant_id, role, permissions, is_active)
SELECT 
  u.id,
  t.id,
  'admin',
  ARRAY['patients:read', 'patients:write', 'patients:delete', 'medications:read', 'medications:write', 'alerts:read', 'alerts:write'],
  true
FROM auth.users u
CROSS JOIN (SELECT id FROM tenants WHERE status = 'active' LIMIT 1) t
WHERE u.email = 'admin@haccare.com'
ON CONFLICT (user_id, tenant_id) 
DO UPDATE SET 
  is_active = true,
  role = 'admin',
  permissions = ARRAY['patients:read', 'patients:write', 'patients:delete', 'medications:read', 'medications:write', 'alerts:read', 'alerts:write'];

-- Verify the assignment
SELECT 'Assignment verification' as info;
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
