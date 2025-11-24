-- Add archive functionality to simulation_history table
-- Allows instructors to archive old completed simulations

-- Add archived column (defaults to false for existing records)
ALTER TABLE simulation_history
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false NOT NULL;

-- Add archived_at timestamp to track when it was archived
ALTER TABLE simulation_history
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add archived_by to track who archived it
ALTER TABLE simulation_history
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES user_profiles(id);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_simulation_history_archived 
ON simulation_history(archived, completed_at DESC);

-- Add helpful comment
COMMENT ON COLUMN simulation_history.archived IS 'Whether this simulation has been archived by an instructor';
COMMENT ON COLUMN simulation_history.archived_at IS 'Timestamp when the simulation was archived';
COMMENT ON COLUMN simulation_history.archived_by IS 'User ID of the instructor who archived this simulation';
