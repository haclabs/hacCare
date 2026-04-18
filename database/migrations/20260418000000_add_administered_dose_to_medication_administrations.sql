-- Migration: Add administered_dose column to medication_administrations
-- Date: 2026-04-18
-- Purpose: Separate the label concentration (dosage) from what the student actually drew up
--          and administered (administered_dose), so both are visible in debrief reports.
--
-- Context:
--   The BCMA verify step now requires students to calculate their own dose from the
--   doctor's orders and enter what they drew up (e.g., "2 mL"), while the label
--   concentration (e.g., "500mg/2mL") stays in the existing `dosage` column.
--   This lets instructors see in the debrief:
--     - Label concentration: 500mg/2mL
--     - Student administered: 2 mL
--   and verify the calculation was correct.

ALTER TABLE medication_administrations
  ADD COLUMN IF NOT EXISTS administered_dose TEXT;

COMMENT ON COLUMN medication_administrations.administered_dose IS
  'Volume/units drawn up and administered by the student (e.g., "2 mL"). '
  'Distinct from dosage which stores the label concentration (e.g., "500mg/2mL"). '
  'Populated via the BCMA verify step where students enter their calculated dose.';
