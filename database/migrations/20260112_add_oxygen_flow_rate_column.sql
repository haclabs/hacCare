-- =====================================================
-- ADD OXYGEN FLOW RATE COLUMN TO PATIENT_VITALS
-- =====================================================
-- Applied: January 12, 2026
-- Purpose: Add oxygen flow rate field to separate device type from flow rate
-- Related: feat/age-based-vital-ranges branch - oxygen delivery enhancement
-- =====================================================

-- Add oxygen_flow_rate column to patient_vitals table
ALTER TABLE "public"."patient_vitals" 
  ADD COLUMN IF NOT EXISTS "oxygen_flow_rate" TEXT DEFAULT 'N/A';

-- Add comment explaining the field
COMMENT ON COLUMN "public"."patient_vitals"."oxygen_flow_rate" IS 
  'Oxygen flow rate: N/A, <1L, 1L-15L, >15L. Separates device type from flow rate for clinical accuracy.';

-- Update existing records to have default N/A flow rate
UPDATE "public"."patient_vitals" 
  SET "oxygen_flow_rate" = 'N/A'
  WHERE "oxygen_flow_rate" IS NULL;

-- No index needed - this is a display-only field, not used in queries
