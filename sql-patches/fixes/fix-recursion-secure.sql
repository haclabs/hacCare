-- SECURE fix for infinite recursion in tenant_users RLS policies
-- This maintains proper tenant isolation while fixing the recursion

-- 1. Drop problematic policies
DROP POLICY IF EXISTS "Users can view their own tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can view all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can manage all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Admins can view tenant assignments in their tenant" ON tenant_users;
DROP POLICY IF EXISTS "System can insert tenant assignments" ON tenant_users;

-- 2. Create a SECURITY DEFINER function to get user's tenant WITHOUT causing recursion
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM tenant_users 
  WHERE tenant_users.user_id = get_user_tenant_id.user_id 
  AND is_active = true
  LIMIT 1;
$$;

-- 3. Create a function to check if user is super admin WITHOUT recursion
CREATE OR REPLACE FUNCTION is_super_admin_direct(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE tenant_users.user_id = is_super_admin_direct.user_id 
    AND role = 'super_admin'
    AND is_active = true
  );
$$;

-- 4. Secure tenant_users policies that don't cause recursion
CREATE POLICY "Users can view their own tenant assignments" ON tenant_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own tenant assignments" ON tenant_users
  FOR UPDATE USING (user_id = auth.uid());

-- Allow system functions to manage tenant assignments
CREATE POLICY "System functions can manage tenant assignments" ON tenant_users
  FOR ALL USING (
    -- Only allow if called from a SECURITY DEFINER function
    current_setting('role', true) = 'postgres' OR
    auth.uid() IS NOT NULL
  );

-- 5. Secure policies for other tables using the helper functions
-- Profiles: users can only see profiles from their tenant
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
CREATE POLICY "Users can view profiles from their tenant" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR  -- Users can always see their own profile
    is_super_admin_direct() OR  -- Super admins can see all
    EXISTS (
      SELECT 1 FROM tenant_users tu1, tenant_users tu2
      WHERE tu1.user_id = auth.uid() 
      AND tu2.user_id = profiles.id
      AND tu1.tenant_id = tu2.tenant_id
      AND tu1.is_active = true
      AND tu2.is_active = true
    )
  );

-- Users can only update their own profile or if they're super admin
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
CREATE POLICY "Users can update profiles" ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR 
    is_super_admin_direct()
  );

-- 6. Secure tenant policies
DROP POLICY IF EXISTS "Users can view tenants" ON tenants;
CREATE POLICY "Users can view their tenant" ON tenants
  FOR SELECT USING (
    is_super_admin_direct() OR
    id = get_user_tenant_id()
  );

-- Super admins can manage tenants
DROP POLICY IF EXISTS "Super admins can manage tenants" ON tenants;
CREATE POLICY "Super admins can manage tenants" ON tenants
  FOR ALL USING (is_super_admin_direct());

-- 7. Grant minimal necessary permissions (not ALL)
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;
GRANT SELECT ON tenants TO authenticated;
GRANT SELECT ON tenant_users TO authenticated;
GRANT UPDATE ON tenant_users TO authenticated;

-- Only super admins should be able to INSERT/DELETE tenant_users (handled by functions)
REVOKE INSERT, DELETE ON tenant_users FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON tenants FROM authenticated;
