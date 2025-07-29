-- SQL Script to Assign User to Tenant
-- Run this in your Supabase SQL Editor to fix the "User has no tenant" issue

-- First, let's see what we have
SELECT 'Current Users' as info;
SELECT id, email, role FROM auth.users WHERE email = 'admin@haccare.com';

SELECT 'Current Tenants' as info;
SELECT id, name FROM tenants LIMIT 5;

SELECT 'Current User Profiles' as info;
SELECT user_id, email, role, tenant_id FROM user_profiles 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@haccare.com');

-- Create a default tenant if none exists
INSERT INTO tenants (id, name, domain, settings)
SELECT 
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Default Hospital',
  'localhost',
  '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Create or update the user profile to assign them to the tenant
INSERT INTO user_profiles (user_id, email, role, tenant_id, first_name, last_name)
SELECT 
  u.id,
  u.email,
  'super_admin',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Admin',
  'User'
FROM auth.users u
WHERE u.email = 'admin@haccare.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
  tenant_id = '00000000-0000-0000-0000-000000000000'::uuid,
  role = 'super_admin';

-- Verify the assignment worked
SELECT 'Final Verification' as info;
SELECT 
  up.user_id,
  up.email,
  up.role,
  up.tenant_id,
  t.name as tenant_name
FROM user_profiles up
JOIN tenants t ON up.tenant_id = t.id
WHERE up.user_id IN (SELECT id FROM auth.users WHERE email = 'admin@haccare.com');
