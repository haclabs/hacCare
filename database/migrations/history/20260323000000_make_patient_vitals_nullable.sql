-- ============================================================================
-- MAKE PATIENT VITALS COLUMNS NULLABLE FOR PARTIAL VITAL SIGNS
-- ============================================================================
-- Migration: Support optional vital signs fields for clinical scenarios
-- Author: GitHub Copilot
-- Date: 2026-03-23
-- ============================================================================
-- Purpose: Allow partial vital signs entry (e.g., newborns without BP readings)
--          Supports clinical reality where not all vitals can always be measured
-- ============================================================================

-- Make vital signs columns nullable
ALTER TABLE "public"."patient_vitals" 
  ALTER COLUMN "temperature" DROP NOT NULL,
  ALTER COLUMN "heart_rate" DROP NOT NULL,
  ALTER COLUMN "blood_pressure_systolic" DROP NOT NULL,
  ALTER COLUMN "blood_pressure_diastolic" DROP NOT NULL,
  ALTER COLUMN "respiratory_rate" DROP NOT NULL,
  ALTER COLUMN "oxygen_saturation" DROP NOT NULL;

-- Add check constraint: at least ONE vital sign must be present
ALTER TABLE "public"."patient_vitals" 
  ADD CONSTRAINT "patient_vitals_at_least_one_vital" CHECK (
    temperature IS NOT NULL OR
    heart_rate IS NOT NULL OR
    blood_pressure_systolic IS NOT NULL OR
    blood_pressure_diastolic IS NOT NULL OR
    respiratory_rate IS NOT NULL OR
    oxygen_saturation IS NOT NULL
  );

-- Add check constraint: if either BP value is present, both must be present
ALTER TABLE "public"."patient_vitals" 
  ADD CONSTRAINT "patient_vitals_bp_pair" CHECK (
    (blood_pressure_systolic IS NULL AND blood_pressure_diastolic IS NULL) OR
    (blood_pressure_systolic IS NOT NULL AND blood_pressure_diastolic IS NOT NULL)
  );

-- Add comments
COMMENT ON CONSTRAINT "patient_vitals_at_least_one_vital" ON "public"."patient_vitals" IS 
  'Ensures at least one vital sign measurement is recorded per entry';

COMMENT ON CONSTRAINT "patient_vitals_bp_pair" ON "public"."patient_vitals" IS 
  'Ensures blood pressure values are recorded together (both systolic and diastolic or neither)';

-- Update table comment
COMMENT ON TABLE "public"."patient_vitals" IS 
  'Patient vital signs records. All vital fields are optional to support clinical scenarios where not all measurements can be obtained (e.g., newborns without BP). At least one vital sign must be present per record.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check column nullability
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'patient_vitals'
  AND column_name IN (
    'temperature',
    'heart_rate', 
    'blood_pressure_systolic',
    'blood_pressure_diastolic',
    'respiratory_rate',
    'oxygen_saturation'
  )
ORDER BY column_name;

-- Check constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'patient_vitals'::regclass
  AND conname LIKE 'patient_vitals_%'
ORDER BY conname;

-- Migration complete
SELECT 
  '✅ Migration Complete' as status,
  'patient_vitals columns now nullable with validation constraints' as description;
