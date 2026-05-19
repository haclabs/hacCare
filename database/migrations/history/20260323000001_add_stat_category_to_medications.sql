-- ============================================================================
-- ADD STAT CATEGORY TO PATIENT MEDICATIONS
-- ============================================================================
-- Migration: Add 'stat' to allowed medication categories
-- Author: GitHub Copilot
-- Date: 2026-03-23
-- ============================================================================
-- Purpose: Support STAT (one-time administration) medication category
-- ============================================================================

-- Drop existing check constraint
ALTER TABLE "public"."patient_medications" 
  DROP CONSTRAINT IF EXISTS "patient_medications_category_check";

-- Add updated check constraint with 'stat' category
ALTER TABLE "public"."patient_medications" 
  ADD CONSTRAINT "patient_medications_category_check" 
  CHECK (category IN ('scheduled', 'unscheduled', 'prn', 'continuous', 'diabetic', 'stat'));

-- Add comment explaining the categories
COMMENT ON CONSTRAINT "patient_medications_category_check" ON "public"."patient_medications" IS 
  'Allowed medication categories: scheduled (time-based), unscheduled (irregular), prn (as needed), continuous (IV/infusion), diabetic (glucose monitoring), stat (one-time administration)';

-- Verification query
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'patient_medications'::regclass
  AND conname = 'patient_medications_category_check';

-- Migration complete
SELECT 
  '✅ Migration Complete' as status,
  'STAT category added to patient_medications' as description;
