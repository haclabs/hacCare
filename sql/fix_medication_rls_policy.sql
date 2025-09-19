-- Fix RLS policy for patient_medications to allow tenant users to see medications
-- This will ensure users can see medications for patients in their tenant

-- First, check current RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'patient_medications';

-- Check existing policies
SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'patient_medications';

-- If RLS is enabled but there are no proper policies, create them
-- Drop any existing restrictive policies first
DROP POLICY IF EXISTS "Users can only see medications in their tenant" ON patient_medications;
DROP POLICY IF EXISTS "Tenant users can access patient medications" ON patient_medications;

-- Create a comprehensive policy that allows tenant users to see medications
CREATE POLICY "Tenant users can access patient medications"
ON patient_medications
FOR ALL
TO authenticated
USING (
  -- User can see medications if they have access to the tenant that owns the medication
  tenant_id IN (
    SELECT tu.tenant_id 
    FROM tenant_users tu 
    WHERE tu.user_id = auth.uid()
  )
  OR
  -- OR if they have access to the tenant that owns the patient
  patient_id IN (
    SELECT p.id 
    FROM patients p
    JOIN tenant_users tu ON p.tenant_id = tu.tenant_id
    WHERE tu.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_medications TO authenticated;

-- Verify the policy was created
SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'patient_medications';