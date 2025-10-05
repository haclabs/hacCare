-- ===========================================================================
-- Fix reset_simulation, complete_simulation and calculate_simulation_metrics
-- Fix: medications table doesn't exist - should be patient_medications
-- Fix: administered_at doesn't exist - should be last_administered
-- ===========================================================================

DROP FUNCTION IF EXISTS reset_simulation(uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_simulation_metrics(uuid) CASCADE;
DROP FUNCTION IF EXISTS complete_simulation(uuid) CASCADE;

-- ---------------------------------------------------------------------------
-- Calculate simulation performance metrics (FIXED)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_simulation_metrics(p_simulation_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_metrics jsonb;
  v_tenant_id uuid;
BEGIN
  -- Get simulation tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  -- Calculate various metrics
  v_metrics := jsonb_build_object(
    'medications_administered', (
      SELECT COUNT(*)
      FROM patient_medications pm
      WHERE pm.tenant_id = v_tenant_id
      AND pm.last_administered IS NOT NULL
    ),
    'vitals_recorded', (
      SELECT COUNT(*)
      FROM patient_vitals pv
      WHERE pv.tenant_id = v_tenant_id
    ),
    'notes_created', (
      SELECT COUNT(*)
      FROM patient_notes pn
      WHERE pn.tenant_id = v_tenant_id
    ),
    'alerts_created', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'assessments_completed', (
      SELECT COUNT(*)
      FROM wound_assessments wa
      WHERE wa.tenant_id = v_tenant_id
    ),
    'total_patients', (
      SELECT COUNT(*)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'activity_count', (
      SELECT COUNT(*)
      FROM simulation_activity_log sal
      WHERE sal.simulation_id = p_simulation_id
    )
  );
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Complete simulation and archive to history
-- ---------------------------------------------------------------------------
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
  
  -- Get participants list
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', sp.user_id,
      'role', sp.role,
      'granted_by', sp.granted_by,
      'granted_at', sp.granted_at
    )
  ) INTO v_participants
  FROM simulation_participants sp
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

-- ---------------------------------------------------------------------------
-- Reset simulation to template snapshot
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_simulation(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_result json;
BEGIN
  -- Get simulation details
  SELECT tenant_id, template_id INTO v_tenant_id, v_template_id
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Get template snapshot
  SELECT snapshot_data INTO v_snapshot
  FROM simulation_templates
  WHERE id = v_template_id;
  
  -- Delete all existing data in simulation tenant (all 14 patient tables)
  DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  
  -- Delete from tables without tenant_id (use patient_id join)
  DELETE FROM patient_admission_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_advanced_directives WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM bowel_records WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patient_wounds WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM handover_notes WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  
  -- Delete patients last
  DELETE FROM patients WHERE tenant_id = v_tenant_id;
  
  -- Restore snapshot
  PERFORM restore_snapshot_to_tenant(v_tenant_id, v_snapshot);
  
  -- Reset simulation timestamps
  UPDATE simulation_active
  SET 
    starts_at = now(),
    ends_at = now() + (duration_minutes || ' minutes')::interval,
    status = 'running',
    updated_at = now()
  WHERE id = p_simulation_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Simulation reset successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION reset_simulation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_simulation(uuid) TO anon;
GRANT EXECUTE ON FUNCTION calculate_simulation_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_simulation_metrics(uuid) TO anon;
GRANT EXECUTE ON FUNCTION complete_simulation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_simulation(uuid) TO anon;

SELECT '✅ reset_simulation, complete_simulation and calculate_simulation_metrics functions FIXED!' as status;
