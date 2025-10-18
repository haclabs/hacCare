-- ===========================================================================
-- FIX: Simulation Participants - Include Full User Details in History
-- ===========================================================================
-- This fixes the complete_simulation function to store full participant details
-- (name, email, role) instead of just user_id, so the debrief report shows
-- actual names instead of blank fields.
-- ===========================================================================

DROP FUNCTION IF EXISTS complete_simulation(uuid) CASCADE;

CREATE OR REPLACE FUNCTION complete_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_simulation simulation_active%ROWTYPE;
  v_history_id uuid;
  v_metrics jsonb;
  v_participants jsonb;
  v_activity_summary jsonb;
  v_result json;
BEGIN
  -- Get simulation details
  SELECT * INTO v_simulation
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_simulation.id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Calculate metrics
  v_metrics := calculate_simulation_metrics(p_simulation_id);
  
  -- Get participants list WITH full user details (name, email)
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', sp.user_id,
      'role', sp.role,
      'name', COALESCE(up.first_name || ' ' || up.last_name, up.email, 'Unknown User'),
      'email', up.email,
      'first_name', up.first_name,
      'last_name', up.last_name,
      'granted_by', sp.granted_by,
      'granted_at', sp.granted_at
    )
  ) INTO v_participants
  FROM simulation_participants sp
  LEFT JOIN user_profiles up ON sp.user_id = up.id
  WHERE sp.simulation_id = p_simulation_id;
  
  -- Summarize activity
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'actions_by_type', jsonb_agg(DISTINCT action_type),
    'first_action', MIN(occurred_at),
    'last_action', MAX(occurred_at)
  ) INTO v_activity_summary
  FROM simulation_activity_log
  WHERE simulation_id = p_simulation_id;
  
  -- Create history record
  INSERT INTO simulation_history (
    simulation_id,
    template_id,
    name,
    status,
    duration_minutes,
    started_at,
    ended_at,
    completed_at,
    metrics,
    participants,
    activity_summary,
    created_by
  )
  VALUES (
    p_simulation_id,
    v_simulation.template_id,
    v_simulation.name,
    'completed',
    v_simulation.duration_minutes,
    v_simulation.starts_at,
    v_simulation.ends_at,
    now(),
    v_metrics,
    v_participants,
    v_activity_summary,
    v_simulation.created_by
  )
  RETURNING id INTO v_history_id;
  
  -- Update simulation status
  UPDATE simulation_active
  SET 
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = p_simulation_id;
  
  -- Log completion activity
  INSERT INTO simulation_activity_log (
    simulation_id,
    user_id,
    action_type,
    action_details,
    notes
  )
  VALUES (
    p_simulation_id,
    auth.uid(),
    'simulation_completed',
    v_metrics,
    'Simulation completed and archived to history'
  );
  
  v_result := json_build_object(
    'success', true,
    'history_id', v_history_id,
    'metrics', v_metrics,
    'message', 'Simulation completed and archived to history'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION complete_simulation(uuid) TO authenticated;

COMMENT ON FUNCTION complete_simulation IS 'Complete simulation and archive to history with full participant details';

SELECT '✅ Simulation participants now include full user details (name, email)!' as status;
