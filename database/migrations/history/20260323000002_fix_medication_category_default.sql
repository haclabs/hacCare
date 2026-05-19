-- ============================================================================
-- FIX MEDICATION CATEGORY DEFAULT FOR SNAPSHOT RESTORATION
-- ============================================================================
-- Migration: Add DEFAULT value to category column for backward compatibility
-- Author: GitHub Copilot
-- Date: 2026-03-23
-- ============================================================================
-- Purpose: Allow snapshot restoration to work without explicitly providing category
--          Old snapshots don't have 'category' field, they use 'is_prn' instead
-- ============================================================================

-- Add DEFAULT value to category column
-- This allows INSERT statements without category to succeed
ALTER TABLE "public"."patient_medications" 
  ALTER COLUMN "category" SET DEFAULT 'scheduled';

-- Add comment explaining the default
COMMENT ON COLUMN "public"."patient_medications"."category" IS 
  'Medication category: scheduled (default), unscheduled, prn, continuous, diabetic, stat. Defaults to scheduled for backward compatibility with snapshot restoration.';

-- Verification query
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'patient_medications'
  AND column_name = 'category';

-- Migration complete
SELECT 
  '✅ Migration Complete' as status,
  'category column now has DEFAULT value for snapshot compatibility' as description;
