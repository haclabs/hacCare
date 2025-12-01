-- =====================================================
-- ADD ARCHIVE_FOLDER COLUMN TO SIMULATION_HISTORY
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================

-- Add archive_folder column to simulation_history table
-- This stores the folder structure: "InstructorName/YYYY-MM-DD"

ALTER TABLE simulation_history 
ADD COLUMN IF NOT EXISTS archive_folder TEXT;

COMMENT ON COLUMN simulation_history.archive_folder IS 
'Archive folder structure: InstructorName/CompletionDate (e.g., "John Smith/2025-11-30")';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_history' 
  AND column_name = 'archive_folder';
