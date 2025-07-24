-- Fix for infinite recursion in tenant_users RLS policies
-- Run this in your Supabase SQL editor to fix the recursion issue

BEGIN;

-- 1. Drop all existing policies on tenant_users to start fresh
DROP POLICY IF EXISTS "Users can only see tenant_users from their tenant" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_simple" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert_simple" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update_simple" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete_simple" ON tenant_users;

-- 2. Create a helper table/view to store user-tenant relationships without RLS
-- This will help us avoid recursion in policies
CREATE OR REPLACE VIEW user_tenant_access AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id;

-- 3. Create simpler, non-recursive RLS policies

-- SELECT policy: Users can see tenant_users based on their role and tenant access
CREATE POLICY "tenant_users_select_simple"
  ON tenant_users FOR SELECT
  USING (
    -- Super admins can see everything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can see their own record
    user_id = auth.uid()
    OR
    -- Users can see other records in their tenant (using direct join to avoid recursion)
    tenant_id IN (
      SELECT uta.tenant_id 
      FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

-- INSERT policy: Only super admins and tenant admins can add users to tenants
CREATE POLICY "tenant_users_insert_simple"
  ON tenant_users FOR INSERT
  WITH CHECK (
    -- Super admins can insert anywhere
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Tenant admins can insert into their tenants
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      tenant_id IN (
        SELECT uta.tenant_id 
        FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid() AND uta.is_active = true
      )
    )
  );

-- UPDATE policy: Super admins and tenant admins can update records
CREATE POLICY "tenant_users_update_simple"
  ON tenant_users FOR UPDATE
  USING (
    -- Super admins can update anything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Tenant admins can update records in their tenant
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      tenant_id IN (
        SELECT uta.tenant_id 
        FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid() AND uta.is_active = true
      )
    )
  );

-- DELETE policy: Only super admins can delete
CREATE POLICY "tenant_users_delete_simple"
  ON tenant_users FOR DELETE
  USING (
    -- Only super admins can delete tenant_users records
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Create improved helper functions that don't cause recursion

-- Function to get user's active tenants (uses the view to avoid recursion)
CREATE OR REPLACE FUNCTION get_user_active_tenants(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID, user_role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT uta.tenant_id, uta.user_role
  FROM user_tenant_access uta
  WHERE uta.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any existing versions of assign_user_to_tenant function to avoid conflicts
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID);

-- Create a single, consistent assign_user_to_tenant function
CREATE OR REPLACE FUNCTION assign_user_to_tenant(
  target_user_id UUID,
  target_tenant_id UUID,
  user_role TEXT DEFAULT 'nurse',
  user_permissions TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  is_tenant_admin BOOLEAN := FALSE;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Check if user has permission to assign
  IF current_user_role = 'super_admin' THEN
    -- Super admin can assign to any tenant
    NULL; -- Permission granted
  ELSIF current_user_role = 'admin' THEN
    -- Check if admin belongs to the target tenant
    SELECT EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() 
      AND uta.tenant_id = target_tenant_id
    ) INTO is_tenant_admin;
    
    IF NOT is_tenant_admin THEN
      RAISE EXCEPTION 'Admin can only assign users to their own tenant';
    END IF;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to assign users to tenants';
  END IF;
  
  -- Perform the assignment
  INSERT INTO tenant_users (user_id, tenant_id, role, permissions, is_active, created_at, updated_at)
  VALUES (target_user_id, target_tenant_id, user_role, user_permissions, true, NOW(), NOW())
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    is_active = true,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON user_tenant_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tenants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_to_tenant(UUID, UUID, TEXT, TEXT[]) TO authenticated;

-- 5. Verification
SELECT 'Fixed RLS policies - recursion eliminated' as status;

-- Check policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'tenant_users'
ORDER BY policyname;

COMMIT;
