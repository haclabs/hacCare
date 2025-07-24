-- Debug script for LethPoly tenant user count issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- First, let's find the LethPoly tenant ID
SELECT 
  'LethPoly Tenant Info' as check_type,
  id,
  name,
  subdomain,
  status
FROM tenants 
WHERE name = 'LethPoly' OR subdomain = 'lethpoly';

-- Check what users are in the tenant_users table for LethPoly
SELECT 
  'tenant_users table for LethPoly' as check_type,
  tu.id,
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active,
  up.email,
  up.first_name,
  up.last_name,
  up.role as profile_role,
  up.is_active as profile_active
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE t.name = 'LethPoly' OR t.subdomain = 'lethpoly';

-- Test the get_tenant_users RPC function directly
-- (Replace the UUID below with the actual LethPoly tenant ID from the first query)
-- SELECT * FROM get_tenant_users('LETHPOLY_TENANT_ID_HERE');

-- Check if there are any users without tenant assignments
SELECT 
  'Users without tenant assignments' as check_type,
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.role,
  up.is_active
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
WHERE tu.user_id IS NULL 
AND up.is_active = true
AND up.role != 'super_admin';

-- Check current authenticated user
SELECT 
  'Current User Context' as check_type,
  auth.uid() as current_user_id,
  (SELECT email FROM user_profiles WHERE id = auth.uid()) as current_user_email,
  (SELECT role FROM user_profiles WHERE id = auth.uid()) as current_user_role;

-- Check RLS policies on tenant_users table
SELECT 
  'tenant_users RLS policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'tenant_users';

-- Check if get_tenant_users function exists and its definition
SELECT 
  'get_tenant_users function info' as check_type,
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_tenant_users';
