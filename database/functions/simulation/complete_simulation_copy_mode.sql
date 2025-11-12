-- ============================================================================
-- COMPLETE SIMULATION (COPY MODE)
-- ============================================================================
-- When a simulation session is complete, this function:
-- 1. COPIES the simulation record to simulation_history with timestamped name
-- 2. Updates status to 'completed' in simulation_active (keeps it there)
-- 3. Sets completed_at timestamp
-- 4. Allows simulation to be restarted for next class session
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_simulation(p_simulation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_simulation RECORD;
  v_participants jsonb;
  v_history_id uuid;
  v_timestamped_name text;
  v_now timestamptz := now();
BEGIN
  -- Get the simulation record
  SELECT * INTO v_simulation
  FROM simulation_active
  WHERE id = p_simulation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Simulation not found'
    );
  END IF;

  -- Get all participants with their full details
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sp.id,
      'user_id', sp.user_id,
      'role', sp.role,
      'granted_at', sp.granted_at,
      'granted_by', sp.granted_by,
      'user_profile', jsonb_build_object(
        'id', up.id,
        'email', up.email,
        'first_name', up.first_name,
        'last_name', up.last_name
      )
    )
  ) INTO v_participants
  FROM simulation_participants sp
  LEFT JOIN user_profiles up ON up.id = sp.user_id
  WHERE sp.simulation_id = p_simulation_id;

  -- Create timestamped name for history
  -- Format: "Original Name - Nov 12, 2025 2:30 PM"
  v_timestamped_name := v_simulation.name || ' - ' || to_char(v_now, 'Mon DD, YYYY HH:MI AM');

  -- Generate new UUID for history record
  v_history_id := gen_random_uuid();

  -- INSERT (copy) to simulation_history with timestamped name
  INSERT INTO simulation_history (
    id,
    name,
    tenant_id,
    template_id,
    created_by,
    started_at,
    completed_at,
    status,
    duration_minutes,
    participant_count,
    participants,
    created_at,
    updated_at
  ) VALUES (
    v_history_id,
    v_timestamped_name,  -- Timestamped name for history
    v_simulation.tenant_id,
    v_simulation.template_id,
    v_simulation.created_by,
    v_simulation.starts_at,
    v_now,
    'completed',
    v_simulation.duration_minutes,
    v_simulation.participant_count,
    COALESCE(v_participants, '[]'::jsonb),
    v_simulation.created_at,
    v_now
  );

  -- UPDATE simulation_active to mark as completed (but keep it there)
  UPDATE simulation_active
  SET 
    status = 'completed',
    completed_at = v_now,
    updated_at = v_now
  WHERE id = p_simulation_id;

  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'history_id', v_history_id,
    'history_name', v_timestamped_name,
    'message', 'Simulation marked complete and copied to history for debrief'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION complete_simulation(uuid) TO authenticated;

COMMENT ON FUNCTION complete_simulation IS 
'Marks simulation as complete and copies it to history with timestamped name. Keeps original in active table for restart.';
