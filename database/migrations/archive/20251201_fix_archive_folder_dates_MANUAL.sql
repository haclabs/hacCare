-- =====================================================
-- FIX EXISTING ARCHIVE FOLDER DATES
-- =====================================================
-- Updates archive_folder paths to use local date instead of UTC
-- Run this AFTER adding the archive_folder column
-- =====================================================

-- Update existing archived records to use local date format
UPDATE simulation_history
SET archive_folder = CONCAT(
  instructor_name,
  '/',
  TO_CHAR(completed_at AT TIME ZONE 'America/Denver', 'YYYY-MM-DD')
)
WHERE archived = true 
  AND completed_at IS NOT NULL 
  AND instructor_name IS NOT NULL
  AND archive_folder IS NOT NULL;

-- Show updated records
SELECT 
  name,
  instructor_name,
  TO_CHAR(completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') as utc_time,
  TO_CHAR(completed_at AT TIME ZONE 'America/Denver', 'YYYY-MM-DD HH24:MI:SS') as mst_time,
  archive_folder
FROM simulation_history
WHERE archived = true
ORDER BY completed_at DESC;
