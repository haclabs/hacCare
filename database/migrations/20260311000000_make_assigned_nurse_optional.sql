-- ============================================================================
-- MAKE ASSIGNED_NURSE OPTIONAL IN PATIENTS TABLE
-- ============================================================================
-- Migration: Make assigned_nurse column nullable
-- Author: GitHub Copilot
-- Date: 2026-03-11
-- ============================================================================
-- Purpose: Support simulation workflows where assigned nurse concept doesn't
--          apply (students, instructors, program tenants). The assigned_nurse
--          field was designed for production nursing workflows but is now
--          optional for multi-role education environments.
-- ============================================================================

-- Drop NOT NULL constraint on patients table
ALTER TABLE patients 
ALTER COLUMN assigned_nurse DROP NOT NULL;

COMMENT ON COLUMN patients.assigned_nurse IS 
'Optional assigned nurse name (TEXT field, not a foreign key). Legacy field from production nursing workflows. Not required for simulation environments.';

-- Drop NOT NULL constraint on simulation_patients table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'simulation_patients'
  ) THEN
    -- Check if column exists and has NOT NULL constraint
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'simulation_patients'
        AND column_name = 'assigned_nurse'
        AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE simulation_patients 
      ALTER COLUMN assigned_nurse DROP NOT NULL;
      
      COMMENT ON COLUMN simulation_patients.assigned_nurse IS 
      'Optional assigned nurse name. Not required for simulation workflows.';
      
      RAISE NOTICE 'Made simulation_patients.assigned_nurse nullable';
    END IF;
  END IF;
END $$;

-- Verify changes
SELECT 
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'assigned_nurse'
  AND table_name IN ('patients', 'simulation_patients')
ORDER BY table_name;
