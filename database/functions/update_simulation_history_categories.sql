-- ============================================================================
-- UPDATE COMPLETED SIMULATIONS IN HISTORY WITH CATEGORIES
-- ============================================================================
-- Safe way to add category tags to completed simulations in history
-- ============================================================================

-- Function to update categories on a completed simulation in history
CREATE OR REPLACE FUNCTION update_simulation_history_categories(
  p_simulation_id UUID,
  p_primary_categories TEXT[] DEFAULT '{}',
  p_sub_categories TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the categories in simulation_history
  UPDATE simulation_history
  SET 
    primary_categories = p_primary_categories,
    sub_categories = p_sub_categories
  WHERE id = p_simulation_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Updated categories for simulation in history: %', p_simulation_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Simulation not found in history: %', p_simulation_id;
    RETURN FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_simulation_history_categories IS 'Safely update category tags on completed simulations in history';

-- ============================================================================
-- EXAMPLE USAGE - Update categories for completed simulations
-- ============================================================================

/*
-- Update your two specific simulations:
SELECT update_simulation_history_categories(
  'ca2a8ee8-db2f-4652-8cf1-064ae5911313',  -- The Nursing Shift - TE2225
  ARRAY['PN']::TEXT[],        -- Primary: PN
  ARRAY['Simulation']::TEXT[] -- Sub: Simulation
);

SELECT update_simulation_history_categories(
  'ebe76a46-daff-4741-9ca0-b17c6b74cc8d',  -- The Nursing Shift - TE2226
  ARRAY['PN']::TEXT[],        -- Primary: PN
  ARRAY['Simulation']::TEXT[] -- Sub: Simulation
);

-- Or update both at once:
DO $$
BEGIN
  PERFORM update_simulation_history_categories(
    'ca2a8ee8-db2f-4652-8cf1-064ae5911313',
    ARRAY['PN']::TEXT[],
    ARRAY['Simulation']::TEXT[]
  );
  
  PERFORM update_simulation_history_categories(
    'ebe76a46-daff-4741-9ca0-b17c6b74cc8d',
    ARRAY['PN']::TEXT[],
    ARRAY['Simulation']::TEXT[]
  );
END $$;
*/

-- ============================================================================
-- BATCH UPDATE - Add categories to ALL history records at once
-- ============================================================================

/*
-- Direct UPDATE if you want to tag ALL completed simulations with same categories
UPDATE simulation_history
SET 
  primary_categories = ARRAY['PN']::TEXT[],
  sub_categories = ARRAY['Simulation']::TEXT[],
  updated_at = NOW()
WHERE status = 'completed';
*/
