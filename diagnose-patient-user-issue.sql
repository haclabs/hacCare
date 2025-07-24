-- Diagnostic script to check patient data integrity
-- Run this in your Supabase SQL Editor to see what's happening

-- 1. Check if patients table exists and has data
SELECT 
  'Patients Table Check' as check_type,
  COUNT(*) as total_patients,
  COUNT(DISTINCT tenant_id) as unique_tenants
FROM patients;

-- 2. Check recent patient records
SELECT 
  'Recent Patients' as check_type,
  id,
  first_name,
  last_name,
  tenant_id,
  created_at
FROM patients 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if there are any policies on patients table
SELECT 
  'Patient Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'patients';

-- 4. Check tenant_users assignments (should be users, not patients)
SELECT 
  'Tenant Users' as check_type,
  tu.user_id,
  tu.tenant_id,
  tu.role,
  t.name as tenant_name
FROM tenant_users tu
LEFT JOIN tenants t ON tu.tenant_id = t.id
ORDER BY tu.created_at DESC
LIMIT 5;

-- 5. Check if there's any confusion between patient IDs and user IDs
SELECT 
  'ID Overlap Check' as check_type,
  'No overlap should exist between patient and user IDs' as note;

-- Check for any patient IDs that match user IDs (shouldn't happen)
SELECT 
  'Potential ID Conflicts' as check_type,
  p.id as patient_id,
  p.first_name as patient_name,
  au.email as user_email
FROM patients p
INNER JOIN auth.users au ON p.id = au.id
LIMIT 5;
