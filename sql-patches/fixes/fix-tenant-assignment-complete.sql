-- COMPLETE FIX: Tenant Assignment Function + Role Constraints + RLS
-- This fixes both the role constraint and RLS issues
-- Run this in your Supabase SQL Editor

-- Step 1: Fix the role constraint on tenant_users table
-- Super admins should NOT be in tenant_users table - they manage globally
ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_role_check;

-- Add proper constraint that excludes super_admin (they don't need tenant assignment)
ALTER TABLE tenant_users 
ADD CONSTRAINT tenant_users_role_check 
CHECK (role IN ('admin', 'doctor', 'nurse', 'viewer'));

-- Step 2: Remove any existing super_admin users from tenant_users
-- (They should manage globally, not be assigned to specific tenants)
DELETE FROM tenant_users 
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE role = 'super_admin'
);

-- Step 3: Drop and recreate the assign function with proper role handling
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID);

-- Create the corrected function that handles roles properly
CREATE OR REPLACE FUNCTION assign_user_to_tenant(
  user_id_param UUID,
  tenant_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_record_count INTEGER;
  user_role TEXT;
  tenant_role TEXT;
  current_user_role TEXT;
BEGIN
  -- Get current user's role for permission check
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  -- Only super admins can assign users to tenants
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can assign users to tenants';
  END IF;

  -- Check if user exists in user_profiles, if not create it
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id_param) THEN
    -- Get user info from auth.users to create profile
    INSERT INTO user_profiles (
      id,
      email,
      role,
      first_name,
      last_name,
      is_active,
      created_at,
      updated_at
    )
    SELECT 
      au.id,
      au.email,
      'nurse', -- Default role, will be updated by UserForm
      COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(au.raw_user_meta_data->>'last_name', 'Name'),
      true,
      NOW(),
      NOW()
    FROM auth.users au
    WHERE au.id = user_id_param;
    
    -- Check if the insert was successful
    IF NOT FOUND THEN
      RAISE EXCEPTION 'User with ID % does not exist in auth.users', user_id_param;
    END IF;
    
    RAISE NOTICE 'Created user profile for user %', user_id_param;
  END IF;

  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id_param) THEN
    RAISE EXCEPTION 'Tenant with ID % does not exist', tenant_id_param;
  END IF;

  -- Get user's role from user_profiles
  SELECT role INTO user_role
  FROM user_profiles WHERE id = user_id_param;

  -- Super admins should NOT be assigned to tenants - they manage globally
  IF user_role = 'super_admin' THEN
    RAISE EXCEPTION 'Super administrators cannot be assigned to specific tenants. They manage globally.';
  END IF;

  -- Map user role to appropriate tenant role
  tenant_role := CASE 
    WHEN user_role = 'admin' THEN 'admin'
    WHEN user_role = 'doctor' THEN 'doctor'
    WHEN user_role = 'nurse' THEN 'nurse'
    WHEN user_role = 'viewer' THEN 'viewer'
    ELSE 'nurse' -- Default fallback
  END;

  -- Check if user is already assigned to this tenant
  SELECT COUNT(*) INTO existing_record_count
  FROM tenant_users 
  WHERE user_id = user_id_param AND tenant_id = tenant_id_param AND is_active = true;

  IF existing_record_count > 0 THEN
    -- User is already assigned to this tenant, just return success
    RAISE NOTICE 'User % is already assigned to tenant %', user_id_param, tenant_id_param;
    RETURN;
  END IF;

  -- Deactivate any existing tenant assignments for this user (single tenant per user)
  UPDATE tenant_users 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = user_id_param AND is_active = true;

  -- Check if there's an inactive record we can reactivate
  UPDATE tenant_users 
  SET is_active = true, role = tenant_role, updated_at = NOW()
  WHERE user_id = user_id_param AND tenant_id = tenant_id_param AND is_active = false;

  -- Get the count of affected rows
  GET DIAGNOSTICS existing_record_count = ROW_COUNT;

  IF existing_record_count = 0 THEN
    -- Create new tenant assignment with appropriate role
    INSERT INTO tenant_users (
      id,
      user_id, 
      tenant_id, 
      role, 
      permissions,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      user_id_param, 
      tenant_id_param, 
      tenant_role, -- Use mapped tenant role
      ARRAY['patients:read', 'patients:write', 'alerts:read', 'alerts:write', 'medications:read']::TEXT[],
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'User % assigned to tenant % with role %', user_id_param, tenant_id_param, tenant_role;
  ELSE
    RAISE NOTICE 'Reactivated existing assignment for user % to tenant %', user_id_param, tenant_id_param;
  END IF;
END;
$$;

-- Step 4: Fix RLS policies to prevent infinite recursion
-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "tenant_users_select_for_assignment" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_policy" ON tenant_users;
DROP POLICY IF EXISTS "allow_authenticated_select_tenant_users" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_simple" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert_simple" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update_simple" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete_simple" ON tenant_users;

-- Create simple, non-recursive policies
-- SELECT policy: Super admins see all, users see their own records
CREATE POLICY "tenant_users_select_simple"
  ON tenant_users FOR SELECT
  USING (
    -- Super admins can see all records
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can see their own tenant assignments
    user_id = auth.uid()
  );

-- INSERT policy: Only super admins can insert
CREATE POLICY "tenant_users_insert_simple"
  ON tenant_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- UPDATE policy: Only super admins can update
CREATE POLICY "tenant_users_update_simple"
  ON tenant_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- DELETE policy: Only super admins can delete
CREATE POLICY "tenant_users_delete_simple"
  ON tenant_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_user_to_tenant(UUID, UUID) TO authenticated;

-- Step 5: Create helper function for getting tenant users (with correct return types)
DROP FUNCTION IF EXISTS get_tenant_users(UUID);

CREATE OR REPLACE FUNCTION get_tenant_users(target_tenant_id UUID)
RETURNS TABLE(
  user_id UUID,
  tenant_id UUID,
  role TEXT,
  permissions TEXT[],
  is_active BOOLEAN,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  department TEXT,
  license_number TEXT,
  phone TEXT,
  user_is_active BOOLEAN
) AS $$
DECLARE
  current_user_role TEXT;
  user_can_access BOOLEAN := FALSE;
BEGIN
  -- Get current user's role
  SELECT up.role INTO current_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Check if user has permission to view tenant users
  IF current_user_role = 'super_admin' THEN
    user_can_access := TRUE;
  ELSIF current_user_role = 'admin' THEN
    -- Check if admin belongs to the target tenant
    SELECT EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid() 
      AND tu.tenant_id = target_tenant_id 
      AND tu.is_active = true
    ) INTO user_can_access;
  END IF;
  
  IF NOT user_can_access THEN
    RAISE EXCEPTION 'Insufficient permissions to view tenant users';
  END IF;
  
  RETURN QUERY
  SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.role,
    tu.permissions,
    tu.is_active,
    up.email,
    up.first_name,
    up.last_name,
    up.department,
    up.license_number,
    up.phone,
    up.is_active as user_is_active
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE tu.tenant_id = target_tenant_id
    AND tu.is_active = true
  ORDER BY up.first_name, up.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_tenant_users(UUID) TO authenticated;

-- Step 6: Show what we fixed
SELECT 'Tenant assignment function updated successfully!' as status;

-- Show the new role constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'tenant_users_role_check';

-- Show super admin users who are correctly NOT in tenant_users
SELECT 'Super admins (manage globally, not assigned to tenants):' as info;
SELECT id, email, role 
FROM user_profiles 
WHERE role = 'super_admin'
LIMIT 3;

-- Show regular users who can be assigned to tenants
SELECT 'Regular users (can be assigned to tenants):' as info;
SELECT id, email, role 
FROM user_profiles 
WHERE role != 'super_admin'
LIMIT 3;
