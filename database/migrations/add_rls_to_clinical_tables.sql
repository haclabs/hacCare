-- Migration: Add RLS policies to clinical tables
-- This adds row-level security to patient_admission_records, bowel_records, and advanced_directives

-- ============================================================================
-- PATIENT ADMISSION RECORDS
-- ============================================================================

-- Add missing columns to patient_admission_records
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_admission_records' AND column_name='admission_date') THEN
    ALTER TABLE patient_admission_records ADD COLUMN admission_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_admission_records' AND column_name='admitting_diagnosis') THEN
    ALTER TABLE patient_admission_records ADD COLUMN admitting_diagnosis TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_admission_records' AND column_name='allergies') THEN
    ALTER TABLE patient_admission_records ADD COLUMN allergies TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_admission_records' AND column_name='current_medications') THEN
    ALTER TABLE patient_admission_records ADD COLUMN current_medications TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_admission_records' AND column_name='emergency_contact_name') THEN
    ALTER TABLE patient_admission_records ADD COLUMN emergency_contact_name TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_admission_records' AND column_name='emergency_contact_phone') THEN
    ALTER TABLE patient_admission_records ADD COLUMN emergency_contact_phone TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_admission_records' AND column_name='emergency_contact_relationship') THEN
    ALTER TABLE patient_admission_records ADD COLUMN emergency_contact_relationship TEXT;
  END IF;
END $$;

-- Create unique constraint on patient_id for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'patient_admission_records_patient_id_key'
  ) THEN
    ALTER TABLE patient_admission_records ADD CONSTRAINT patient_admission_records_patient_id_key UNIQUE (patient_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE patient_admission_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view admission records for their tenant" ON patient_admission_records;
DROP POLICY IF EXISTS "Users can insert admission records for their tenant" ON patient_admission_records;
DROP POLICY IF EXISTS "Users can update admission records for their tenant" ON patient_admission_records;
DROP POLICY IF EXISTS "Users can delete admission records for their tenant" ON patient_admission_records;

-- Create RLS policies using user_profiles (to match auto_set_tenant_id trigger)
CREATE POLICY "Users can view admission records for their tenant" ON patient_admission_records
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert admission records for their tenant" ON patient_admission_records
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update admission records for their tenant" ON patient_admission_records
  FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete admission records for their tenant" ON patient_admission_records
  FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- BOWEL RECORDS
-- ============================================================================

-- Enable RLS
ALTER TABLE bowel_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view bowel records for their tenant" ON bowel_records;
DROP POLICY IF EXISTS "Users can insert bowel records for their tenant" ON bowel_records;
DROP POLICY IF EXISTS "Users can update bowel records for their tenant" ON bowel_records;
DROP POLICY IF EXISTS "Users can delete bowel records for their tenant" ON bowel_records;

-- Create RLS policies using user_profiles
CREATE POLICY "Users can view bowel records for their tenant" ON bowel_records
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert bowel records for their tenant" ON bowel_records
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update bowel records for their tenant" ON bowel_records
  FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete bowel records for their tenant" ON bowel_records
  FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- ADVANCED DIRECTIVES
-- ============================================================================

-- Enable RLS
ALTER TABLE patient_advanced_directives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view advanced directives for their tenant" ON patient_advanced_directives;
DROP POLICY IF EXISTS "Users can insert advanced directives for their tenant" ON patient_advanced_directives;
DROP POLICY IF EXISTS "Users can update advanced directives for their tenant" ON patient_advanced_directives;
DROP POLICY IF EXISTS "Users can delete advanced directives for their tenant" ON patient_advanced_directives;

-- Create RLS policies using user_profiles
CREATE POLICY "Users can view advanced directives for their tenant" ON patient_advanced_directives
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert advanced directives for their tenant" ON patient_advanced_directives
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update advanced directives for their tenant" ON patient_advanced_directives
  FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete advanced directives for their tenant" ON patient_advanced_directives
  FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- CREATE TRIGGERS FOR AUTO-SET TENANT_ID
-- ============================================================================

-- Ensure all three tables have the auto_set_tenant_id trigger

-- Patient Admission Records
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_admission_records;
CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_admission_records
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

-- Bowel Records
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON bowel_records;
CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON bowel_records
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

-- Advanced Directives
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_advanced_directives;
CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_advanced_directives
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Check that RLS is enabled
DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled on patient_admission_records: %', 
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'patient_admission_records');
  RAISE NOTICE '✅ RLS enabled on bowel_records: %', 
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'bowel_records');
  RAISE NOTICE '✅ RLS enabled on patient_advanced_directives: %', 
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'patient_advanced_directives');
END $$;

-- List all policies created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('patient_admission_records', 'bowel_records', 'patient_advanced_directives')
ORDER BY tablename, cmd;

-- List all triggers created
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('patient_admission_records', 'bowel_records', 'patient_advanced_directives')
AND trigger_name = 'set_tenant_id_before_insert'
ORDER BY event_object_table;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE patient_admission_records IS 'Patient admission records with RLS enabled for multi-tenant isolation';
COMMENT ON TABLE bowel_records IS 'Bowel movement records with RLS enabled for multi-tenant isolation';
COMMENT ON TABLE patient_advanced_directives IS 'Patient advanced care directives with RLS enabled for multi-tenant isolation';
