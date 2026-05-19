-- ============================================================================
-- ADD NURSING NOTES TO HANDOVER NOTES
-- ============================================================================
-- Adds a free-text nursing_notes field to handover_notes.
-- This appears above the SBAR fields to allow nurses to document
-- general nursing observations before the structured SBAR section.
-- ============================================================================

ALTER TABLE handover_notes
  ADD COLUMN IF NOT EXISTS nursing_notes text;

COMMENT ON COLUMN handover_notes.nursing_notes IS
  'Free-text nursing observations, displayed above the SBAR fields in the handover form.';

SELECT '✅ Migration Complete' as status,
       'Added nursing_notes column to handover_notes' as description;
