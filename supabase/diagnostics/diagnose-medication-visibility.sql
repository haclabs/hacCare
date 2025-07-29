-- Diagnostic: Check what's happening with medications and tenant access
-- Run this in Supabase SQL Editor

-- 1. Check current user session
SELECT 'Current auth user' as info;
SELECT auth.uid() as current_user_id;

-- 2. Check medications in database (bypassing RLS)
SELECT 'Raw medications in database (bypassing RLS)' as info;
SET row_security = OFF;
SELECT 
  id,
  patient_id,
  name,
  tenant_id,
  created_at
FROM patient_medications 
ORDER BY created_at DESC 
LIMIT 10;
SET row_security = ON;

-- 3. Check medications with RLS enabled (what the app sees)
SELECT 'Medications with RLS (what app sees)' as info;
SELECT 
  id,
  patient_id,
  name,
  tenant_id,
  created_at
FROM patient_medications 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check user's tenant assignment
SELECT 'User tenant assignment' as info;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active,
  t.name as tenant_name
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid();

-- 5. Check the RLS policy for patient_medications
SELECT 'RLS policy check' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'patient_medications';

-- 6. Test the get_user_current_tenant function
SELECT 'Testing tenant function' as info;
SELECT * FROM get_user_current_tenant(auth.uid());
