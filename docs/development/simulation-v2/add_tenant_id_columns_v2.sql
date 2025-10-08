-- ============================================================================
-- ADD TENANT_ID COLUMN TO PATIENT DATA TABLES (SAFE VERSION)
-- ============================================================================
-- 
-- Purpose: Add tenant_id column to tables that need multi-tenant isolation
-- This version is safe to run multiple times
-- 
-- ============================================================================

-- Add tenant_id to patient_vitals if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'patient_vitals' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE patient_vitals ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    RAISE NOTICE '✅ Added tenant_id column to patient_vitals';
  ELSE
    RAISE NOTICE '⏭️  tenant_id already exists in patient_vitals';
  END IF;
END $$;

-- Add tenant_id to patient_medications if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'patient_medications' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE patient_medications ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    RAISE NOTICE '✅ Added tenant_id column to patient_medications';
  ELSE
    RAISE NOTICE '⏭️  tenant_id already exists in patient_medications';
  END IF;
END $$;

-- Add tenant_id to medication_administrations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'medication_administrations' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE medication_administrations ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    RAISE NOTICE '✅ Added tenant_id column to medication_administrations';
  ELSE
    RAISE NOTICE '⏭️  tenant_id already exists in medication_administrations';
  END IF;
END $$;

-- Add tenant_id to patient_notes if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'patient_notes' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE patient_notes ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    RAISE NOTICE '✅ Added tenant_id column to patient_notes';
  ELSE
    RAISE NOTICE '⏭️  tenant_id already exists in patient_notes';
  END IF;
END $$;

-- Add tenant_id to patient_alerts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'patient_alerts' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE patient_alerts ADD COLUMN tenant_id UUID REFERENCES tenants(id);
    RAISE NOTICE '✅ Added tenant_id column to patient_alerts';
  ELSE
    RAISE NOTICE '⏭️  tenant_id already exists in patient_alerts';
  END IF;
END $$;

-- Add tenant_id to diabetic_records if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'diabetic_records') THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'diabetic_records' 
      AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE diabetic_records ADD COLUMN tenant_id UUID REFERENCES tenants(id);
      RAISE NOTICE '✅ Added tenant_id column to diabetic_records';
    ELSE
      RAISE NOTICE '⏭️  tenant_id already exists in diabetic_records';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  diabetic_records table does not exist';
  END IF;
END $$;

-- Add tenant_id to bowel_records if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bowel_records') THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'bowel_records' 
      AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE bowel_records ADD COLUMN tenant_id UUID REFERENCES tenants(id);
      RAISE NOTICE '✅ Added tenant_id column to bowel_records';
    ELSE
      RAISE NOTICE '⏭️  tenant_id already exists in bowel_records';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  bowel_records table does not exist';
  END IF;
END $$;

-- ============================================================================
-- Populate tenant_id from related patient records
-- ============================================================================
-- Strategy: Match child table records to patients by patient_id
-- Handle both UUID and TEXT patient_id types
-- ============================================================================

-- Update patient_vitals.tenant_id from patients table
DO $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE patient_vitals pv
  SET tenant_id = p.tenant_id
  FROM patients p
  WHERE pv.patient_id::text = p.id::text
  AND pv.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % patient_vitals records with tenant_id', v_updated_count;
END $$;

-- Update patient_medications.tenant_id from patients table  
DO $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE patient_medications pm
  SET tenant_id = p.tenant_id
  FROM patients p
  WHERE pm.patient_id::text = p.id::text
  AND pm.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % patient_medications records with tenant_id', v_updated_count;
END $$;

-- Update medication_administrations.tenant_id from patients table
DO $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE medication_administrations ma
  SET tenant_id = p.tenant_id
  FROM patients p
  WHERE ma.patient_id::text = p.id::text
  AND ma.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % medication_administrations records with tenant_id', v_updated_count;
END $$;

-- Update patient_notes.tenant_id from patients table
DO $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE patient_notes pn
  SET tenant_id = p.tenant_id
  FROM patients p
  WHERE pn.patient_id::text = p.id::text
  AND pn.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % patient_notes records with tenant_id', v_updated_count;
END $$;

-- Update patient_alerts.tenant_id from patients table
DO $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE patient_alerts pa
  SET tenant_id = p.tenant_id
  FROM patients p
  WHERE pa.patient_id::text = p.id::text
  AND pa.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % patient_alerts records with tenant_id', v_updated_count;
END $$;

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_patient_vitals_tenant_id ON patient_vitals(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_patient_medications_tenant_id ON patient_medications(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_medication_administrations_tenant_id ON medication_administrations(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_patient_notes_tenant_id ON patient_notes(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_patient_alerts_tenant_id ON patient_alerts(tenant_id);
  
  RAISE NOTICE '✅ Created indexes on tenant_id columns';
END $$;

-- ============================================================================
-- Summary: Show which tables now have tenant_id
-- ============================================================================

DO $$
DECLARE
  v_table_count integer;
BEGIN
  SELECT COUNT(DISTINCT table_name) INTO v_table_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
  AND (table_name LIKE 'patient%' OR table_name LIKE '%medication%');
  
  RAISE NOTICE '📊 Total tables with tenant_id: %', v_table_count;
END $$;

-- List all tables with tenant_id column
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'tenant_id'
AND (table_name LIKE 'patient%' OR table_name LIKE '%medication%')
ORDER BY table_name;
