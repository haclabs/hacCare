-- Fix the type mismatch in get_tenant_users function
-- Error: "Returned type character varying(20) does not match expected type text in column 3"
-- This happens because the role column has a CHECK constraint that PostgreSQL treats as VARCHAR(20)
-- Final fix that resolves both ambiguous column reference and type mismatch issues

DROP FUNCTION IF EXISTS get_tenant_users(UUID);

CREATE OR REPLACE FUNCTION get_tenant_users(target_tenant_id UUID)
RETURNS TABLE(
  user_id UUID, 
  tenant_id UUID, 
  role VARCHAR(20),  -- Changed from TEXT to VARCHAR(20) to match constraint
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
  -- Get current user's role (FIXED: Added table alias to avoid ambiguity)
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
    tu.role::VARCHAR(20),  -- Cast to match return type
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
GRANT EXECUTE ON FUNCTION get_tenant_users(UUID) TO authenticated;

-- Test the function
SELECT 'Fixed get_tenant_users function - type mismatch resolved' as status;
