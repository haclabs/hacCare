-- Fix Medication Administration Database Permissions
-- This ensures proper RLS policies for medication_administrations table
-- Run this in your Supabase SQL Editor

BEGIN;

-- =============================================================================
-- Step 1: Check current state of medication_administrations table
-- =============================================================================

-- Check if table exists and RLS status
SELECT 
  'Table Status Check' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'medication_administrations';

-- Check existing policies
SELECT 
  'Existing Policies' as check_type,
  policyname,
  cmd as operation,
  permissive,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'medication_administrations'
ORDER BY cmd, policyname;

-- =============================================================================
-- Step 2: Ensure RLS is enabled and create comprehensive policies
-- =============================================================================

-- Enable RLS on medication_administrations table
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view med administrations from their tenant" ON medication_administrations;
DROP POLICY IF EXISTS "Users can only see med administrations from their tenant" ON medication_administrations;
DROP POLICY IF EXISTS "medication_administrations_select_policy" ON medication_administrations;
DROP POLICY IF EXISTS "medication_administrations_insert_policy" ON medication_administrations;
DROP POLICY IF EXISTS "medication_administrations_update_policy" ON medication_administrations;
DROP POLICY IF EXISTS "medication_administrations_delete_policy" ON medication_administrations;

-- CREATE comprehensive RLS policies for medication_administrations

-- SELECT policy: Users can view medication administrations from their tenant
CREATE POLICY "Users can view medication_administrations in their tenant"
  ON medication_administrations FOR SELECT
  USING (
    -- Super admins can see everything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can see records from their tenant
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT policy: Users can create medication administrations in their tenant
CREATE POLICY "Users can insert medication_administrations in their tenant"
  ON medication_administrations FOR INSERT
  WITH CHECK (
    -- Super admins can insert anywhere
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can insert records for their tenant
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- UPDATE policy: Users can update medication administrations in their tenant
CREATE POLICY "Users can update medication_administrations in their tenant"
  ON medication_administrations FOR UPDATE
  USING (
    -- Super admins can update everything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Users can update records in their tenant
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    -- Ensure updated records still belong to user's tenant
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- DELETE policy: Only super admins and admins can delete medication administrations
CREATE POLICY "Users can delete medication_administrations in their tenant"
  ON medication_administrations FOR DELETE
  USING (
    -- Super admins can delete everything
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Admins can delete records in their tenant
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      tenant_id IN (
        SELECT tenant_id 
        FROM tenant_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- =============================================================================
-- Step 3: Grant necessary table permissions
-- =============================================================================

-- Grant appropriate permissions while maintaining RLS security
GRANT SELECT, INSERT, UPDATE ON medication_administrations TO authenticated;
GRANT DELETE ON medication_administrations TO authenticated; -- Will be restricted by RLS policy

-- =============================================================================
-- Step 4: Ensure tenant_id is properly set on medication administrations
-- =============================================================================

-- Function to automatically set tenant_id based on patient
CREATE OR REPLACE FUNCTION set_medication_administration_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- If tenant_id is not provided, get it from the patient
  IF NEW.tenant_id IS NULL THEN
    SELECT p.tenant_id INTO NEW.tenant_id
    FROM patients p
    WHERE p.patient_id = NEW.patient_id OR p.id::text = NEW.patient_id;
    
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine tenant_id for patient %', NEW.patient_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set tenant_id
DROP TRIGGER IF EXISTS set_medication_administration_tenant_trigger ON medication_administrations;
CREATE TRIGGER set_medication_administration_tenant_trigger
  BEFORE INSERT ON medication_administrations
  FOR EACH ROW
  EXECUTE FUNCTION set_medication_administration_tenant();

-- =============================================================================
-- Step 5: Verification and testing
-- =============================================================================

-- Verify RLS is enabled
SELECT 
  'Final RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'medication_administrations';

-- List all policies for verification
SELECT 
  'Final Policy List' as check_type,
  policyname,
  cmd as operation,
  permissive
FROM pg_policies 
WHERE tablename = 'medication_administrations'
ORDER BY cmd, policyname;

-- Test current user permissions
SELECT 
  'Current User Test' as check_type,
  auth.uid() as user_id,
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) as is_super_admin,
  (
    SELECT COUNT(*) 
    FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  ) as active_tenant_count;

-- Check if medication_administrations table has the required columns
SELECT 
  'Table Structure Check' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'medication_administrations'
AND column_name IN ('tenant_id', 'patient_id', 'medication_id', 'administered_by_id')
ORDER BY column_name;

COMMIT;

-- =============================================================================
-- Usage Notes
-- =============================================================================

-- After running this script:
-- 1. Users can now insert medication administration records for patients in their tenant
-- 2. The tenant_id will be automatically set based on the patient
-- 3. RLS policies ensure proper multi-tenant isolation
-- 4. The BCMA system should now work without permission errors

SELECT 'Medication administration permissions fixed successfully' as status;
