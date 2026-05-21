-- Migration: Add is_baseline flag to patient_system_assessments
-- Date: 2026-05-21
--
-- Distinguishes instructor-set baseline entries (preserved on session reset)
-- from student-entered entries (cleared on session reset).
--
-- is_baseline = true  → instructor entered in template editing mode → survives reset_simulation_for_next_session
-- is_baseline = false → student entered during live simulation      → deleted on reset_simulation_for_next_session
--
-- reset_simulation_with_template_updates does a full snapshot re-apply, so
-- it naturally restores baseline rows regardless of this flag.

ALTER TABLE patient_system_assessments
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN NOT NULL DEFAULT false;

-- Partial index — reset queries only target non-baseline rows
CREATE INDEX IF NOT EXISTS idx_psa_student_entries
  ON patient_system_assessments(tenant_id)
  WHERE is_baseline = false;
