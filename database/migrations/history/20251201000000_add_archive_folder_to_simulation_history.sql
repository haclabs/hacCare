-- =====================================================
-- ADD ARCHIVE FOLDER TO SIMULATION HISTORY
-- =====================================================
-- Adds archive_folder column to organize archived
-- simulations by instructor name and completion date
-- =====================================================

-- Add archive_folder column
ALTER TABLE simulation_history 
ADD COLUMN IF NOT EXISTS archive_folder TEXT;

-- Add index for faster queries when browsing archived folders
CREATE INDEX IF NOT EXISTS idx_simulation_history_archive_folder 
  ON simulation_history(archive_folder) 
  WHERE archive_folder IS NOT NULL;

-- Add comment
COMMENT ON COLUMN simulation_history.archive_folder IS 
  'Folder path for archived simulations (format: InstructorName/YYYY-MM-DD)';

-- Example folder structure:
-- John Smith/2025-11-15/
-- Jane Doe/2025-11-20/
-- John Smith/2025-11-22/
