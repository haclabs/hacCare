-- SECURE FIX: Eliminate infinite recursion while maintaining security
-- Copy and paste this into Supabase SQL Editor

-- Step 1: Drop all existing problematic policies on tenant_users
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
DROP POLICY IF EXISTS "Users can see tenant_users from their tenant" ON tenant_users;
DROP POLICY IF EXISTS "Users can only see tenant_users from their tenant" ON tenant_users;

-- Step 2: Create SIMPLE tenant_users policies that don't reference tenant_users
-- Users can only see their own records in tenant_users
CREATE POLICY "tenant_users_own_records_only" ON tenant_users
  FOR SELECT USING (user_id = auth.uid());

-- Users can only update their own records (for profile updates)
CREATE POLICY "tenant_users_own_updates_only" ON tenant_users
  FOR UPDATE USING (user_id = auth.uid());

-- Only allow INSERT/DELETE through service role (for admin functions)
CREATE POLICY "tenant_users_service_role_insert" ON tenant_users
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "tenant_users_service_role_delete" ON tenant_users
  FOR DELETE USING (auth.role() = 'service_role');

-- Step 3: Create a materialized view to cache tenant relationships (no RLS recursion)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_tenant_cache AS
SELECT 
  user_id,
  tenant_id,
  role,
  is_active,
  created_at
FROM tenant_users
WHERE is_active = true;

-- Create index for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenant_cache_user_id ON user_tenant_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_cache_tenant_id ON user_tenant_cache(tenant_id);

-- Grant access to the materialized view
GRANT SELECT ON user_tenant_cache TO authenticated;

-- Step 4: Create function to refresh the cache (call this when tenant_users changes)
CREATE OR REPLACE FUNCTION refresh_user_tenant_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_tenant_cache;
$$;

-- Step 5: Create secure helper functions using the cache (no recursion)
CREATE OR REPLACE FUNCTION get_user_tenant_secure(user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM user_tenant_cache 
  WHERE user_tenant_cache.user_id = get_user_tenant_secure.user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_super_admin_secure(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_tenant_cache 
    WHERE user_tenant_cache.user_id = is_super_admin_secure.user_id 
    AND role = 'super_admin'
  );
$$;

-- Step 6: Create secure policies for other tables using the cache
-- Profiles: Users can see profiles from their tenant
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles from their tenant" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON profiles;

CREATE POLICY "profiles_tenant_isolation" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR  -- Own profile
    is_super_admin_secure() OR  -- Super admin sees all
    EXISTS (
      SELECT 1 FROM user_tenant_cache utc1, user_tenant_cache utc2
      WHERE utc1.user_id = auth.uid() 
      AND utc2.user_id = profiles.id
      AND utc1.tenant_id = utc2.tenant_id
    )
  );

CREATE POLICY "profiles_secure_update" ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR 
    is_super_admin_secure()
  );

-- Step 7: Secure tenant policies using the cache
DROP POLICY IF EXISTS "Users can view tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their tenant" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can view tenants" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can manage tenants" ON tenants;

CREATE POLICY "tenants_secure_select" ON tenants
  FOR SELECT USING (
    is_super_admin_secure() OR
    id = get_user_tenant_secure()
  );

CREATE POLICY "tenants_super_admin_manage" ON tenants
  FOR ALL USING (is_super_admin_secure());

-- Step 8: Apply same pattern to patients table (secure tenant isolation)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
    EXECUTE 'DROP POLICY IF EXISTS "authenticated_users_can_access_patients" ON patients';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_policy" ON patients';
    EXECUTE 'CREATE POLICY "patients_tenant_isolation" ON patients 
             FOR ALL USING (
               is_super_admin_secure() OR 
               tenant_id = get_user_tenant_secure()
             )';
  END IF;
END $$;

-- Step 9: Set up automatic cache refresh trigger
CREATE OR REPLACE FUNCTION trigger_refresh_user_tenant_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM refresh_user_tenant_cache();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to auto-refresh cache when tenant_users changes
DROP TRIGGER IF EXISTS tenant_users_cache_refresh ON tenant_users;
CREATE TRIGGER tenant_users_cache_refresh
  AFTER INSERT OR UPDATE OR DELETE ON tenant_users
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_user_tenant_cache();

-- Step 10: Initial cache population
SELECT refresh_user_tenant_cache();

-- Step 11: Grant minimal necessary permissions
GRANT SELECT ON user_tenant_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tenant_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin_secure(UUID) TO authenticated;
