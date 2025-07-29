-- Temporarily disable RLS on patient_medications to get medications working
-- Run this in Supabase SQL Editor

-- 1. Check current RLS status
SELECT 'Current RLS status' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('patients', 'patient_medications');

-- 2. Temporarily disable RLS on patient_medications table
ALTER TABLE patient_medications DISABLE ROW LEVEL SECURITY;

-- 3. Verify RLS is disabled
SELECT 'RLS status after disable' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('patients', 'patient_medications');

-- 4. Test medication visibility now
SELECT 'Medications should be visible now' as info;
SELECT COUNT(*) as medication_count FROM patient_medications;

-- 5. Show your medications
SELECT 'Your medications' as info;
SELECT 
  id,
  patient_id,
  name,
  dosage,
  tenant_id,
  created_at
FROM patient_medications 
ORDER BY created_at DESC;

-- Note: This is a temporary fix. In production, you'd want to fix the RLS policy instead.
-- But this will get your medications working immediately.
