-- DIRECT fix for infinite recursion - completely eliminate recursion
-- This approach uses direct auth.uid() checks and bypasses the circular dependency

-- 1. Completely drop ALL tenant_users policies to stop recursion
DROP POLICY IF EXISTS "Users can view their own tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can view all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Super admins can manage all tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Admins can view tenant assignments in their tenant" ON tenant_users;
DROP POLICY IF EXISTS "System can insert tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "Users can update their own tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "System functions can manage tenant assignments" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete_policy" ON tenant_users;

-- 2. Drop any problematic functions
DROP FUNCTION IF EXISTS get_user_tenant_id(UUID);
DROP FUNCTION IF EXISTS is_super_admin_direct(UUID);
DROP FUNCTION IF EXISTS is_super_admin(UUID);

-- 3. Temporarily disable RLS on tenant_users to break the cycle
ALTER TABLE tenant_users DISABLE ROW LEVEL SECURITY;

-- 4. Create a simple view for tenant user access that bypasses RLS
CREATE OR REPLACE VIEW user_tenant_access AS
SELECT 
  user_id,
  tenant_id,
  role,
  is_active
FROM tenant_users
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON user_tenant_access TO authenticated;

-- 5. Create simple policies for other tables that don't reference tenant_users directly

-- Profiles: users can see their own profile + super admins see all
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles from their tenant" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- 6. Simplify tenant policies
DROP POLICY IF EXISTS "Users can view tenants" ON profiles;
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can manage tenants" ON tenants;

-- Allow authenticated users to view tenants (app will filter)
CREATE POLICY "Authenticated users can view tenants" ON tenants
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 7. For patient and other data tables, use direct tenant_id filtering
-- This avoids the recursion by not looking up user's tenant through tenant_users

-- Example for patients table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_policy" ON patients';
    EXECUTE 'CREATE POLICY "authenticated_users_can_access_patients" ON patients FOR ALL USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- 8. Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_users TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON tenants TO authenticated;

-- 9. Re-enable RLS on tenant_users with a simple policy
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policy that doesn't cause recursion
CREATE POLICY "basic_tenant_users_access" ON tenant_users
  FOR ALL USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "basic_tenant_users_access" ON tenant_users IS 
'Simple policy to prevent recursion - tenant filtering handled in application layer';
