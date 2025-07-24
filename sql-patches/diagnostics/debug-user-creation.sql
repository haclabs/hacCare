-- Debug script to check user creation issues
-- Run this in your Supabase SQL Editor to diagnose the problem

-- 1. Check if the user was created in auth.users
SELECT 
  'Recent Users in auth.users' as check_type,
  id,
  email,
  created_at,
  email_confirmed_at,
  deleted_at
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if there are any profiles created
SELECT 
  'Recent Profiles' as check_type,
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM profiles 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check tenant_users assignments
SELECT 
  'Recent Tenant Assignments' as check_type,
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.created_at,
  t.name as tenant_name,
  p.email as user_email
FROM tenant_users tu
LEFT JOIN tenants t ON tu.tenant_id = t.id
LEFT JOIN profiles p ON tu.user_id = p.id
WHERE tu.created_at > NOW() - INTERVAL '1 hour'
ORDER BY tu.created_at DESC
LIMIT 5;

-- 4. Check if there are any recent errors in the logs (if you have logging)
-- This might not work depending on your setup
SELECT 
  'Function Call Results' as check_type,
  'Check the browser console for any RPC call results' as message;

-- 5. Test the assign_user_to_tenant function with a dummy call
-- (Replace with actual UUIDs if you want to test)
SELECT 
  'Function Test' as check_type,
  'Use this to test: SELECT assign_user_to_tenant(''tenant-uuid'', ''user-uuid'', ''nurse'');' as test_command;

-- 6. Check current tenants
SELECT 
  'Available Tenants' as check_type,
  id,
  name,
  status,
  created_at
FROM tenants
ORDER BY created_at DESC
LIMIT 5;
