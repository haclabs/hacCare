-- Add instructor_name to simulation_history table
-- Allows tracking which instructor completed/debriefed the simulation

ALTER TABLE simulation_history
ADD COLUMN IF NOT EXISTS instructor_name TEXT;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_simulation_history_instructor_name 
ON simulation_history(instructor_name);

-- Add helpful comment
COMMENT ON COLUMN simulation_history.instructor_name IS 'Name of the instructor who completed and debriefed this simulation';
