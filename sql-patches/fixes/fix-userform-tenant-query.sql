-- Additional fix for UserForm tenant queries
-- Run this after the main RLS fix to resolve 406 errors

BEGIN;

-- Create a safe function to get user's current tenant without RLS conflicts
CREATE OR REPLACE FUNCTION get_user_current_tenant(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID, tenant_name TEXT, user_role TEXT) AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins and the user themselves can query this
  IF current_user_role = 'super_admin' OR target_user_id = auth.uid() THEN
    RETURN QUERY
    SELECT 
      tu.tenant_id,
      t.name as tenant_name,
      tu.role as user_role
    FROM tenant_users tu
    JOIN tenants t ON tu.tenant_id = t.id
    WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
    LIMIT 1;
  ELSE
    -- Return empty result for unauthorized access
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function specifically for super admins to get all user-tenant assignments
CREATE OR REPLACE FUNCTION get_user_tenant_assignments(target_user_id UUID)
RETURNS TABLE(tenant_id UUID, tenant_name TEXT, user_role TEXT, is_active BOOLEAN) AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins can call this function
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can view user tenant assignments';
  END IF;
  
  RETURN QUERY
  SELECT 
    tu.tenant_id,
    t.name as tenant_name,
    tu.role as user_role,
    tu.is_active
  FROM tenant_users tu
  JOIN tenants t ON tu.tenant_id = t.id
  WHERE tu.user_id = target_user_id
  ORDER BY tu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all users in a tenant (for tenant management)
-- Drop existing function first to allow return type change
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
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_current_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tenant_assignments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_users(UUID) TO authenticated;

-- Update the user_tenant_access view to be more permissive for super admins
-- Instead of dropping, we'll recreate it with OR REPLACE
CREATE OR REPLACE VIEW user_tenant_access AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id;

-- Grant select on the updated view
GRANT SELECT ON user_tenant_access TO authenticated;

-- Test the functions
SELECT 'Additional RLS fixes applied successfully' as status;

COMMIT;
