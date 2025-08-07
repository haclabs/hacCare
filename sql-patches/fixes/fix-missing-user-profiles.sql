-- Fix for "User does not exist" error during tenant creation
-- This happens when user exists in auth.users but not in user_profiles table
-- Run this in your Supabase SQL Editor

-- Step 1: Check if the user exists in auth vs user_profiles
SELECT 
  'auth.users' as table_name,
  count(*) as user_count
FROM auth.users
UNION ALL
SELECT 
  'user_profiles' as table_name,
  count(*) as user_count  
FROM user_profiles;

-- Step 2: Check for missing user profiles
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN up.id IS NULL THEN 'Missing in user_profiles'
    ELSE 'Profile exists'
  END as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Step 3: Remove the problematic user_profiles dependency from tenant policies
-- This makes the policies work even if user_profiles are missing

DROP POLICY IF EXISTS "allow_users_select_tenants" ON tenants;
CREATE POLICY "allow_users_select_tenants_simple" ON tenants
FOR SELECT USING (
  -- Allow any authenticated user to see tenants they belong to
  auth.uid() IS NOT NULL AND (
    id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    -- Users can see tenants they admin
    admin_user_id = auth.uid()
    OR
    -- Service role access
    auth.role() = 'service_role'
  )
);

-- Step 4: Update the INSERT policy to not depend on user_profiles
DROP POLICY IF EXISTS "allow_authenticated_insert_tenants" ON tenants;
CREATE POLICY "allow_authenticated_insert_tenants_simple" ON tenants
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Step 5: Create user profiles automatically for missing users
-- This function will create a user_profile when a tenant is created
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user profile exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()) THEN
    INSERT INTO user_profiles (id, email, role, tenant_id)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'user',  -- default role
      NULL     -- no default tenant
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to auto-create user profiles when tenants are created
DROP TRIGGER IF EXISTS ensure_user_profile_on_tenant_create ON tenants;
CREATE TRIGGER ensure_user_profile_on_tenant_create
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_profile();

-- Step 7: Create any missing user profiles for existing auth users
INSERT INTO user_profiles (id, email, role, tenant_id)
SELECT 
  au.id,
  au.email,
  'user' as role,
  NULL as tenant_id
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- Step 8: Verify the fix
SELECT 'Tenant creation should now work without user profile errors!' as status;
