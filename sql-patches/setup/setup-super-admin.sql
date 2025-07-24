-- Super Admin User Setup Script
-- Run this AFTER creating the auth user in Supabase Dashboard
-- 
-- IMPORTANT: 
-- 1. First create user in Supabase Auth UI with email/password
-- 2. Copy the user ID from the auth.users table  
-- 3. Update the USER_ID below and run this script

-- =============================================================================
-- CONFIGURATION - UPDATE THESE VALUES
-- =============================================================================

-- Replace with the actual UUID from auth.users after creating the user
-- You can find this in Supabase Dashboard > Authentication > Users
DO $$
DECLARE
  -- UPDATE THIS: Get the actual UUID from your auth.users table
  super_admin_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- REPLACE WITH REAL UUID
  
  -- UPDATE THIS: The email address of your super admin
  super_admin_email TEXT := 'admin@yourhospital.com'; -- REPLACE WITH REAL EMAIL
  
  user_exists BOOLEAN := FALSE;
BEGIN
  -- Check if the user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = super_admin_user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist in auth.users. Please create the user first in Supabase Auth UI.', super_admin_user_id;
  END IF;
  
  -- Update or insert the user profile
  INSERT INTO user_profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    department,
    is_active
  ) VALUES (
    super_admin_user_id,
    super_admin_email,
    'System',
    'Administrator', 
    'super_admin',
    'Administration',
    true
  ) ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    first_name = 'System',
    last_name = 'Administrator',
    department = 'Administration',
    is_active = true,
    updated_at = NOW();
  
  RAISE NOTICE 'Super admin user profile created/updated successfully!';
  RAISE NOTICE 'Email: %', super_admin_email;
  RAISE NOTICE 'Role: super_admin';
  RAISE NOTICE 'Status: active';
  
END $$;

-- =============================================================================
-- CREATE DEFAULT TENANT (OPTIONAL)
-- =============================================================================

-- Uncomment and modify this section if you want to create a default tenant
/*
INSERT INTO tenants (
  name,
  subdomain,
  admin_user_id,
  subscription_plan,
  max_users,
  max_patients,
  settings,
  status
) VALUES (
  'Your Hospital Name',                    -- UPDATE: Your organization name
  'your-hospital',                         -- UPDATE: Your subdomain
  (SELECT id FROM user_profiles WHERE email = 'admin@yourhospital.com'), -- Will use the super admin
  'premium',
  100,                                     -- Max users
  1000,                                    -- Max patients  
  '{
    "timezone": "America/New_York",
    "date_format": "MM/DD/YYYY",
    "currency": "USD",
    "features": {
      "advanced_analytics": true,
      "medication_management": true,
      "wound_care": true,
      "barcode_scanning": true,
      "mobile_app": true
    },
    "security": {
      "two_factor_required": false,
      "session_timeout": 480,
      "password_policy": {
        "min_length": 8,
        "require_uppercase": true,
        "require_lowercase": true,
        "require_numbers": true,
        "require_symbols": true
      }
    }
  }'::jsonb,
  'active'
) ON CONFLICT (subdomain) DO NOTHING;

-- Add the super admin to the tenant
INSERT INTO tenant_users (
  tenant_id,
  user_id,
  role,
  permissions,
  is_active
) 
SELECT 
  t.id,
  up.id,
  'admin',
  ARRAY[
    'patients:read', 'patients:write', 'patients:delete',
    'users:read', 'users:write', 'users:delete', 
    'medications:read', 'medications:write', 'medications:delete',
    'alerts:read', 'alerts:write',
    'settings:read', 'settings:write'
  ],
  true
FROM tenants t, user_profiles up
WHERE t.subdomain = 'your-hospital' 
  AND up.email = 'admin@yourhospital.com'
ON CONFLICT (tenant_id, user_id) DO NOTHING;
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify the super admin was created correctly
SELECT 
  'Super Admin Verification' as check_type,
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.role,
  up.is_active,
  up.created_at
FROM user_profiles up
WHERE up.role = 'super_admin';

-- Show all users for verification
SELECT 
  'All Users' as check_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'doctor' THEN 1 END) as doctors,
  COUNT(CASE WHEN role = 'nurse' THEN 1 END) as nurses
FROM user_profiles;

-- Show tenant information if created
SELECT 
  'Tenant Information' as check_type,
  t.name,
  t.subdomain,
  t.subscription_plan,
  t.max_users,
  t.max_patients,
  t.status,
  up.email as admin_email
FROM tenants t
LEFT JOIN user_profiles up ON t.admin_user_id = up.id;

SELECT 'Super admin setup complete!' as status;
