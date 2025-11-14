-- ============================================================================
-- DEBUG: User Tenant Issue for Simulation Launch
-- ============================================================================
-- Run this to diagnose why simulation launch fails with "User has no tenant_id"
-- ============================================================================

-- 1. Check current user's profile
SELECT 
  id,
  email,
  tenant_id,
  role,
  created_at
FROM user_profiles
WHERE id = auth.uid();

-- 2. Check if user exists in auth.users but not in user_profiles
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  up.id as profile_id,
  up.tenant_id,
  up.role
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.id = auth.uid();

-- 3. Check all tenants available
SELECT 
  id,
  name,
  subdomain,
  tenant_type,
  is_simulation,
  status
FROM tenants
ORDER BY created_at DESC
LIMIT 10;

-- 4. Fix: If user profile exists but tenant_id is NULL, update it
-- UNCOMMENT and replace <TENANT_ID> with actual tenant ID from step 3
/*
UPDATE user_profiles
SET tenant_id = '<TENANT_ID>'::uuid
WHERE id = auth.uid()
AND tenant_id IS NULL;
*/

-- 5. Verify the fix
SELECT 
  id,
  email,
  tenant_id,
  role
FROM user_profiles
WHERE id = auth.uid();
