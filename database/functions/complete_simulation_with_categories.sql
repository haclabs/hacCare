-- ============================================================================
-- COMPLETE SIMULATION WITH CATEGORIES
-- ============================================================================
-- Updates the complete_simulation RPC function to handle category fields
-- ============================================================================

-- Drop existing function variations to avoid conflicts
DROP FUNCTION IF EXISTS complete_simulation(UUID);
DROP FUNCTION IF EXISTS complete_simulation(UUID, JSONB);
DROP FUNCTION IF EXISTS complete_simulation(UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION complete_simulation(
  p_simulation_id UUID,
  p_activities JSONB DEFAULT '[]'::jsonb,
  p_instructor_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_simulation simulation_active%ROWTYPE;
  v_history_id UUID;
  v_metrics JSONB;
  v_participants JSONB;
  v_activity_summary JSONB;
  v_result JSON;
BEGIN
  -- Get simulation details
  SELECT * INTO v_simulation
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_simulation.id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Build simple metrics
  v_metrics := jsonb_build_object(
    'duration_minutes', v_simulation.duration_minutes,
    'activities_count', jsonb_array_length(p_activities)
  );
  
  -- Get participants list
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', sp.user_id,
      'role', sp.role,
      'granted_at', sp.granted_at
    )
  ) INTO v_participants
  FROM simulation_participants sp
  WHERE sp.simulation_id = p_simulation_id;
  
  -- Activity summary (deprecated - keep for backward compatibility)
  v_activity_summary := jsonb_build_object(
    'total_activities', jsonb_array_length(p_activities),
    'activities', p_activities
  );
  
  -- Insert into history with categories and instructor name
  INSERT INTO simulation_history (
    simulation_id,
    template_id,
    name,
    status,
    duration_minutes,
    started_at,
    ended_at,
    completed_at,
    participants,
    activity_summary,
    student_activities,
    created_by,
    primary_categories,
    sub_categories,
    instructor_name
  )
  VALUES (
    v_simulation.id,
    v_simulation.template_id,
    v_simulation.name,
    'completed',
    v_simulation.duration_minutes,
    v_simulation.starts_at,
    v_simulation.ends_at,
    NOW(),
    v_participants,
    v_activity_summary,
    p_activities,
    v_simulation.created_by,
    v_simulation.primary_categories,
    v_simulation.sub_categories,
    p_instructor_name
  )
  RETURNING id INTO v_history_id;
  
  -- Update simulation status
  UPDATE simulation_active
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  v_result := json_build_object(
    'success', true,
    'history_id', v_history_id,
    'metrics', v_metrics,
    'message', 'Simulation completed and archived to history with categories'
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION complete_simulation IS 'Complete simulation and archive to history with categories preserved';
