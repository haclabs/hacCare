-- Fix the patient_medications RLS policy to allow super_admin access
-- Run this in Supabase SQL Editor

-- 1. First, let's see the current policy
SELECT 'Current patient_medications policy' as info;
SELECT 
  policyname,
  qual
FROM pg_policies 
WHERE tablename = 'patient_medications';

-- 2. Drop the existing policy
DROP POLICY IF EXISTS "Users can only access medications from their tenant" ON patient_medications;

-- 3. Create a new policy that properly allows super_admin access
CREATE POLICY "Users can only access medications from their tenant" ON patient_medications
  FOR ALL USING (
    -- Allow super_admin access to all medications
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Allow regular users access to medications from their tenant
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_medications.tenant_id 
      AND is_active = true
    )
  );

-- 4. Test the fix
SELECT 'Testing after policy fix' as info;
SELECT COUNT(*) as medication_count FROM patient_medications;

-- 5. Show some sample data to verify
SELECT 'Sample medications now visible' as info;
SELECT 
  id,
  patient_id,
  name,
  tenant_id,
  created_at
FROM patient_medications 
ORDER BY created_at DESC 
LIMIT 3;
