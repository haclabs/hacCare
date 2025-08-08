-- FIX: get_user_current_tenant function structure mismatch
-- The frontend expects this function to return a table with tenant_id column
-- Current function returns UUID which causes "structure of query does not match function result type"

-- Drop existing function that returns UUID
DROP FUNCTION IF EXISTS get_user_current_tenant(UUID);

-- Create new function that returns the expected table structure
CREATE OR REPLACE FUNCTION get_user_current_tenant(target_user_id UUID)
RETURNS TABLE(tenant_id UUID, role TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.tenant_id,
    tu.role,
    tu.is_active
  FROM tenant_users tu
  WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
  LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_current_tenant(UUID) TO authenticated;

-- Test the function (uncomment to test)
-- SELECT * FROM get_user_current_tenant(auth.uid());

SELECT 'get_user_current_tenant function structure fixed!' as status;
SELECT 'Frontend should now be able to load tenant data properly' as message;
