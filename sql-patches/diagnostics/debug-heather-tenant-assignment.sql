-- DIAGNOSTIC: Test specific user tenant assignment
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from the browser console

-- First, let's find your user ID by email
SELECT 'FINDING USER BY EMAIL:' as diagnostic_step;
SELECT 
  id as user_id,
  email,
  role,
  is_active,
  created_at
FROM user_profiles 
WHERE email = 'heather@haclabs.io';

-- Now test with your specific user ID (replace the UUID below with your actual user ID)
-- You can get your user ID from the query above or from the browser console

-- Test tenant assignment for heather@haclabs.io
SELECT 'TENANT ASSIGNMENT FOR HEATHER:' as diagnostic_step;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active as assignment_active,
  t.name as tenant_name,
  t.subdomain,
  t.status as tenant_status,
  CASE 
    WHEN tu.is_active AND t.status = 'active' THEN '✅ Valid assignment'
    WHEN NOT tu.is_active THEN '❌ Assignment inactive'
    WHEN t.status != 'active' THEN '❌ Tenant inactive'
    ELSE '❌ Other issue'
  END as assignment_status
FROM user_profiles up
JOIN tenant_users tu ON up.id = tu.user_id
JOIN tenants t ON tu.tenant_id = t.id
WHERE up.email = 'heather@haclabs.io';

-- Test the RPC function with heather's user ID
SELECT 'TESTING RPC FUNCTION FOR HEATHER:' as diagnostic_step;
SELECT 
  tenant_id,
  role,
  is_active
FROM get_user_current_tenant(
  (SELECT id FROM user_profiles WHERE email = 'heather@haclabs.io')
);

-- Check if heather has multiple tenant assignments
SELECT 'MULTIPLE ASSIGNMENTS CHECK FOR HEATHER:' as diagnostic_step;
SELECT 
  COUNT(*) as assignment_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ No assignments found'
    WHEN COUNT(*) = 1 THEN '✅ Single assignment (correct)'
    ELSE '⚠️ Multiple assignments (potential issue)'
  END as assignment_status
FROM user_profiles up
JOIN tenant_users tu ON up.id = tu.user_id
WHERE up.email = 'heather@haclabs.io'
  AND tu.is_active = true;
