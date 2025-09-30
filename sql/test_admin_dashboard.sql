-- Test script for Admin Dashboard with existing database structure
-- Run this to verify the admin dashboard will work with your tenant_users setup

-- First, let's check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'tenant_users', 'tenants')
ORDER BY table_name;

-- Check the structure of tenant_users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenant_users'
ORDER BY ordinal_position;

-- Test the tenant context retrieval logic
DO $$
DECLARE
  test_user_id uuid;
  found_tenant_id uuid;
BEGIN
  -- Get a sample user from tenant_users
  SELECT user_id INTO test_user_id 
  FROM tenant_users 
  WHERE is_active = true 
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the tenant lookup logic
    SELECT tenant_id INTO found_tenant_id
    FROM tenant_users
    WHERE user_id = test_user_id 
      AND is_active = true
    LIMIT 1;
    
    RAISE NOTICE 'Test user: %, Found tenant: %', test_user_id, found_tenant_id;
  ELSE
    RAISE NOTICE 'No active users found in tenant_users table';
  END IF;
END $$;

-- Show sample data structure
SELECT 
  tu.id as tenant_user_id,
  tu.user_id,
  tu.tenant_id, 
  tu.role,
  up.email,
  up.first_name,
  up.last_name
FROM tenant_users tu
LEFT JOIN user_profiles up ON tu.user_id = up.id
WHERE tu.is_active = true
LIMIT 3;