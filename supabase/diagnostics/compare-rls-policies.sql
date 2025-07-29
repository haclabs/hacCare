-- Compare RLS policies between patients and patient_medications
-- Run this in Supabase SQL Editor

-- 1. Check RLS policies for patients table
SELECT 'Patients table RLS policies' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'patients';

-- 2. Check RLS policies for patient_medications table  
SELECT 'Patient_medications table RLS policies' as info;
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

-- 3. Test what each policy sees for current user
SELECT 'Current user info' as info;
SELECT 
  auth.uid() as user_id,
  up.role as profile_role
FROM user_profiles up 
WHERE up.id = auth.uid();

-- 4. Test patients visibility (this works)
SELECT 'Patients visible to current user' as info;
SELECT COUNT(*) as patient_count FROM patients;

-- 5. Test medications visibility (this doesn't work)
SELECT 'Medications visible to current user' as info;
SELECT COUNT(*) as medication_count FROM patient_medications;

-- 6. Check tenant_users assignment for current user
SELECT 'Current user tenant assignment' as info;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active,
  t.name as tenant_name
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid();

-- 7. Check if super_admin bypass works for patients
SELECT 'Super admin check for patients' as info;
SELECT EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE id = auth.uid() AND role = 'super_admin'
) as is_super_admin;

-- 8. Raw medication data (bypassing RLS temporarily)
SELECT 'Raw medications (bypassing RLS)' as info;
SET row_security = OFF;
SELECT 
  id,
  patient_id,
  name,
  tenant_id,
  created_at
FROM patient_medications 
ORDER BY created_at DESC 
LIMIT 5;
SET row_security = ON;
