-- ============================================================================
-- UPDATE EXISTING ACTIVE SIMULATIONS WITH CATEGORIES
-- ============================================================================
-- Safe way to add category tags to running simulations without disrupting them
-- ============================================================================

-- Function to update categories on an active simulation
CREATE OR REPLACE FUNCTION update_simulation_categories(
  p_simulation_id UUID,
  p_primary_categories TEXT[] DEFAULT '{}',
  p_sub_categories TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simply update the categories - doesn't affect any other simulation data
  UPDATE simulation_active
  SET 
    primary_categories = p_primary_categories,
    sub_categories = p_sub_categories,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Updated categories for simulation: %', p_simulation_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Simulation not found: %', p_simulation_id;
    RETURN FALSE;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_simulation_categories IS 'Safely update category tags on existing active simulations';

-- ============================================================================
-- EXAMPLE USAGE - Update categories for a specific simulation
-- ============================================================================

/*
-- Example 1: Add categories to a simulation
SELECT update_simulation_categories(
  'your-simulation-id-here',
  ARRAY['PN', 'NESA']::TEXT[],  -- Primary categories
  ARRAY['Labs']::TEXT[]         -- Sub categories
);

-- Example 2: Clear all categories
SELECT update_simulation_categories(
  'your-simulation-id-here',
  ARRAY[]::TEXT[],  -- Empty primary
  ARRAY[]::TEXT[]   -- Empty sub
);

-- Example 3: Add only primary categories
SELECT update_simulation_categories(
  'your-simulation-id-here',
  ARRAY['SIM Hub']::TEXT[],
  ARRAY[]::TEXT[]
);
*/

-- ============================================================================
-- BATCH UPDATE - Add categories to ALL active simulations at once
-- ============================================================================

/*
-- WARNING: This updates ALL active simulations with the same categories
-- Use carefully! Better to update individually.

UPDATE simulation_active
SET 
  primary_categories = ARRAY['PN']::TEXT[],
  sub_categories = ARRAY['Simulation']::TEXT[],
  updated_at = NOW()
WHERE status = 'running';
*/
