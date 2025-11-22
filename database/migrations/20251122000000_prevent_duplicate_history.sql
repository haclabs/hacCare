-- ============================================================================
-- PREVENT DUPLICATE SIMULATION HISTORY RECORDS
-- ============================================================================
-- Add unique constraint to prevent duplicate history entries for same simulation
-- ============================================================================

-- First, clean up any existing duplicates (keep the one with data)
WITH ranked_history AS (
  SELECT 
    id,
    simulation_id,
    ROW_NUMBER() OVER (
      PARTITION BY simulation_id 
      ORDER BY 
        CASE WHEN student_activities IS NOT NULL AND student_activities != '[]'::jsonb THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM simulation_history
)
DELETE FROM simulation_history
WHERE id IN (
  SELECT id FROM ranked_history WHERE rn > 1
);

-- Add unique constraint on simulation_id
-- This prevents the same simulation from being completed twice
ALTER TABLE simulation_history
ADD CONSTRAINT simulation_history_simulation_id_unique UNIQUE (simulation_id);

COMMENT ON CONSTRAINT simulation_history_simulation_id_unique ON simulation_history IS 
'Prevents duplicate history records for the same simulation. Each simulation can only be completed once.';
