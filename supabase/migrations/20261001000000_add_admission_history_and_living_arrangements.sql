-- Add Medical History, Surgical History, and Current Living Arrangements fields
-- to the admission assessment form (patient_admission_records table).
-- These are plain nullable text fields; no RLS/policy changes needed since the
-- table's existing tenant-isolation policies apply to all columns.

ALTER TABLE "public"."patient_admission_records"
  ADD COLUMN IF NOT EXISTS "medical_history" "text",
  ADD COLUMN IF NOT EXISTS "surgical_history" "text",
  ADD COLUMN IF NOT EXISTS "current_living_arrangements" "text";

COMMENT ON COLUMN "public"."patient_admission_records"."medical_history" IS 'Relevant past medical history, captured on the admission assessment form';
COMMENT ON COLUMN "public"."patient_admission_records"."surgical_history" IS 'Relevant past surgical history, captured on the admission assessment form';
COMMENT ON COLUMN "public"."patient_admission_records"."current_living_arrangements" IS 'Patient''s living situation at time of admission (e.g. lives alone, with family, long-term care)';
