-- Verify tenant assignment worked
-- Run this in Supabase SQL Editor to debug the issue

SELECT 'Checking tenant assignment' as step;

-- Check if user exists in tenant_users table
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active,
  t.name as tenant_name,
  u.email
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
JOIN auth.users u ON tu.user_id = u.id
WHERE u.email = 'admin@haccare.com';

-- Check if get_user_current_tenant function exists
SELECT 'Checking RPC function' as step;
SELECT proname 
FROM pg_proc 
WHERE proname = 'get_user_current_tenant';

-- Drop existing function and recreate with correct return type matching database schema
DROP FUNCTION IF EXISTS get_user_current_tenant(UUID);

CREATE OR REPLACE FUNCTION get_user_current_tenant(target_user_id UUID)
RETURNS TABLE(tenant_id UUID, role VARCHAR(20), is_active BOOLEAN) 
LANGUAGE plpgsql SECURITY DEFINER
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

-- Test the function
SELECT 'Testing RPC function' as step;
SELECT * FROM get_user_current_tenant(
  (SELECT id FROM auth.users WHERE email = 'admin@haccare.com')
);
