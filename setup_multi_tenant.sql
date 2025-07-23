-- Post-Migration Setup Script
-- Run these commands in your Supabase SQL Editor after the migration

-- =============================================
-- 1. CHECK MIGRATION SUCCESS
-- =============================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenants', 'tenant_users');

-- Verify tenant_id columns were added
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'tenant_id' 
AND table_schema = 'public';

-- =============================================
-- 2. SET UP FIRST SUPER ADMIN
-- =============================================

-- First, check your current user profiles
SELECT id, email, role, first_name, last_name 
FROM user_profiles 
LIMIT 5;

-- Update a user to be super admin (replace with your email)
-- UPDATE user_profiles 
-- SET role = 'super_admin' 
-- WHERE email = 'your-admin@email.com';

-- =============================================
-- 3. CREATE YOUR FIRST TENANT
-- =============================================

-- Example tenant creation (modify as needed)
-- INSERT INTO tenants (
--   name, 
--   subdomain, 
--   admin_user_id, 
--   subscription_plan,
--   max_users,
--   max_patients
-- ) VALUES (
--   'Your Hospital Name',
--   'your-hospital',
--   'user-uuid-here', -- Replace with actual user UUID
--   'premium',
--   50,
--   500
-- );

-- =============================================
-- 4. ASSIGN USERS TO TENANTS
-- =============================================

-- Example user-tenant assignment
-- INSERT INTO tenant_users (tenant_id, user_id, role, permissions) 
-- VALUES (
--   'tenant-uuid-here',  -- Replace with actual tenant UUID
--   'user-uuid-here',    -- Replace with actual user UUID
--   'admin',
--   ARRAY[
--     'patients:read', 'patients:write', 'patients:delete',
--     'users:read', 'users:write', 'users:delete',
--     'medications:read', 'medications:write', 'medications:delete',
--     'alerts:read', 'alerts:write',
--     'settings:read', 'settings:write'
--   ]
-- );

-- =============================================
-- 5. VERIFY SETUP
-- =============================================

-- Check tenants
SELECT id, name, subdomain, status, subscription_plan 
FROM tenants;

-- Check tenant users
SELECT 
  tu.id,
  t.name as tenant_name,
  up.email as user_email,
  tu.role,
  tu.is_active
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
JOIN user_profiles up ON tu.user_id = up.id;

-- Check patients with tenant assignment
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.tenant_id,
  t.name as tenant_name
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
LIMIT 5;

-- =============================================
-- 6. TEST PERMISSIONS
-- =============================================

-- Test RLS policies (run as different users to verify isolation)
-- SELECT COUNT(*) FROM patients; -- Should only show tenant-specific patients

-- Test tenant statistics view
SELECT * FROM tenant_statistics;

-- =============================================
-- SETUP COMPLETE
-- =============================================
