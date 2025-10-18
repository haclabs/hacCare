-- ===========================================================================
-- SIMULATION SYSTEM V2.0 - DATABASE FUNCTIONS
-- ===========================================================================
-- Purpose: Helper functions for simulation management
-- Run after: 003_create_simulation_rls_policies.sql
-- ===========================================================================

-- ============================================================================
-- TEMPLATE MANAGEMENT FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Create a new simulation template with tenant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_simulation_template(
  p_name text,
  p_description text DEFAULT NULL,
  p_default_duration_minutes integer DEFAULT 120
)
RETURNS json AS $$
DECLARE
  v_template_id uuid;
  v_tenant_id uuid;
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = v_user_id
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins and super admins can create simulation templates';
  END IF;
  
  -- Create simulation tenant with unique subdomain
  INSERT INTO tenants (
    name, 
    subdomain, 
    tenant_type, 
    is_simulation, 
    simulation_config,
    status,
    settings
  )
  VALUES (
    'sim_template_' || p_name,
    'sim-tpl-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_template',
    true,
    jsonb_build_object('template_mode', true),
    'active',
    '{}'::jsonb
  )
  RETURNING id INTO v_tenant_id;
  
  -- Create template record
  INSERT INTO simulation_templates (
    name,
    description,
    tenant_id,
    default_duration_minutes,
    created_by,
    status
  )
  VALUES (
    p_name,
    p_description,
    v_tenant_id,
    p_default_duration_minutes,
    v_user_id,
    'draft'
  )
  RETURNING id INTO v_template_id;
  
  -- Return result
  v_result := json_build_object(
    'success', true,
    'template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Template created successfully. Switch to tenant to build simulation.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Save snapshot of template tenant data
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION save_template_snapshot(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb;
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  -- Get template tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Build snapshot of all data in template tenant
  v_snapshot := jsonb_build_object(
    'patients', (
      SELECT json_agg(row_to_json(p.*))
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_medications', (
      SELECT json_agg(row_to_json(pm.*))
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_vitals', (
      SELECT json_agg(row_to_json(pv.*))
      FROM patient_vitals pv
      JOIN patients p ON p.id = pv.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_notes', (
      SELECT json_agg(row_to_json(pn.*))
      FROM patient_notes pn
      JOIN patients p ON p.id = pn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_alerts', (
      SELECT json_agg(row_to_json(pa.*))
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'advanced_directives', (
      SELECT json_agg(row_to_json(ad.*))
      FROM advanced_directives ad
      JOIN patients p ON p.id = ad.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'admission_records', (
      SELECT json_agg(row_to_json(ar.*))
      FROM admission_records ar
      JOIN patients p ON p.id = ar.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'diabetic_records', (
      SELECT json_agg(row_to_json(dr.*))
      FROM diabetic_records dr
      JOIN patients p ON p.id = dr.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'wound_care_assessments', (
      SELECT json_agg(row_to_json(wca.*))
      FROM wound_care_assessments wca
      JOIN patients p ON p.id = wca.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', v_user_id,
      'tenant_id', v_tenant_id
    )
  );
  
  -- Update template with snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_template_id;
  
  v_result := json_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'message', 'Snapshot saved successfully. Template is now ready to launch.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ACTIVE SIMULATION FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Launch a new simulation from template
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION launch_simulation(
  p_template_id uuid,
  p_name text,
  p_duration_minutes integer,
  p_participant_user_ids uuid[],
  p_participant_roles text[] DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_simulation_id uuid;
  v_new_tenant_id uuid;
  v_template_tenant_id uuid;
  v_snapshot jsonb;
  v_snapshot_version integer;
  v_user_id uuid;
  v_result json;
  v_participant_id uuid;
  v_role text;
  i integer;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify template exists and is ready
  SELECT tenant_id, snapshot_data, snapshot_version
  INTO v_template_tenant_id, v_snapshot, v_snapshot_version
  FROM simulation_templates
  WHERE id = p_template_id
  AND status = 'ready';
  
  IF v_template_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found or not ready';
  END IF;
  
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template has no snapshot data';
  END IF;
  
  -- Create new simulation tenant with unique subdomain
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    parent_tenant_id,
    simulation_config,
    status,
    settings
  )
  VALUES (
    'sim_active_' || p_name || '_' || extract(epoch from now())::text,
    'sim-act-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_active',
    true,
    (SELECT tenant_id FROM user_profiles WHERE id = v_user_id),
    jsonb_build_object(
      'template_id', p_template_id,
      'launched_at', now()
    ),
    'active',
    '{}'::jsonb
  )
  RETURNING id INTO v_new_tenant_id;
  
  -- Create active simulation record
  INSERT INTO simulation_active (
    template_id,
    name,
    tenant_id,
    duration_minutes,
    template_snapshot_version,
    status,
    created_by
  )
  VALUES (
    p_template_id,
    p_name,
    v_new_tenant_id,
    p_duration_minutes,
    v_snapshot_version,
    'running',
    v_user_id
  )
  RETURNING id INTO v_simulation_id;
  
  -- Add participants
  IF array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1) LOOP
      v_participant_id := p_participant_user_ids[i];
      
      -- Determine role (default to student if not specified)
      IF p_participant_roles IS NOT NULL AND i <= array_length(p_participant_roles, 1) THEN
        v_role := p_participant_roles[i];
      ELSE
        v_role := 'student';
      END IF;
      
      INSERT INTO simulation_participants (
        simulation_id,
        user_id,
        role,
        granted_by
      )
      VALUES (
        v_simulation_id,
        v_participant_id,
        v_role::simulation_role,
        v_user_id
      );
    END LOOP;
  END IF;
  
  -- Restore snapshot data to new tenant
  PERFORM restore_snapshot_to_tenant(v_new_tenant_id, v_snapshot);
  
  v_result := json_build_object(
    'success', true,
    'simulation_id', v_simulation_id,
    'tenant_id', v_new_tenant_id,
    'message', 'Simulation launched successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Restore snapshot data to a tenant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_tenant_id uuid,
  p_snapshot jsonb
)
RETURNS void AS $$
DECLARE
  v_patient_record jsonb;
  v_new_patient_id uuid;
  v_old_patient_id uuid;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_record jsonb;
BEGIN
  -- Restore patients first (create ID mapping)
  IF p_snapshot->'patients' IS NOT NULL THEN
    FOR v_patient_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_patient_record->>'id')::uuid;
      
      INSERT INTO patients (
        patient_id, name, date_of_birth, gender, blood_type,
        allergies, medical_history, emergency_contact,
        emergency_contact_phone, condition, tenant_id
      )
      VALUES (
        v_patient_record->>'patient_id',
        v_patient_record->>'name',
        (v_patient_record->>'date_of_birth')::date,
        v_patient_record->>'gender',
        v_patient_record->>'blood_type',
        v_patient_record->>'allergies',
        v_patient_record->>'medical_history',
        v_patient_record->>'emergency_contact',
        v_patient_record->>'emergency_contact_phone',
        v_patient_record->>'condition',
        p_tenant_id
      )
      RETURNING id INTO v_new_patient_id;
      
      -- Store mapping
      v_patient_mapping := v_patient_mapping || jsonb_build_object(
        v_old_patient_id::text, v_new_patient_id::text
      );
    END LOOP;
  END IF;
  
  -- Restore patient_medications (using patient mapping)
  IF p_snapshot->'patient_medications' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      INSERT INTO patient_medications (
        patient_id, medication_name, dosage, frequency, route,
        start_date, end_date, instructions, status, prescribed_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        v_record->>'medication_name',
        v_record->>'dosage',
        v_record->>'frequency',
        v_record->>'route',
        (v_record->>'start_date')::timestamptz,
        (v_record->>'end_date')::timestamptz,
        v_record->>'instructions',
        v_record->>'status',
        (v_record->>'prescribed_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore vitals (using patient mapping)
  IF p_snapshot->'patient_vitals' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_vitals')
    LOOP
      INSERT INTO patient_vitals (
        patient_id, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, respiratory_rate, temperature, oxygen_saturation,
        pain_level, recorded_by
      )
      VALUES (
        (v_patient_mapping->(v_record->>'patient_id'))::uuid,
        (v_record->>'blood_pressure_systolic')::integer,
        (v_record->>'blood_pressure_diastolic')::integer,
        (v_record->>'heart_rate')::integer,
        (v_record->>'respiratory_rate')::integer,
        (v_record->>'temperature')::numeric,
        (v_record->>'oxygen_saturation')::integer,
        (v_record->>'pain_level')::integer,
        (v_record->>'recorded_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Continue for other data types (notes, alerts, etc.)
  -- Add similar blocks for each data type in snapshot
  
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
  
  -- Delete all existing data in simulation tenant
  DELETE FROM patient_vitals WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM medications WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE patient_id IN (
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  );
  DELETE FROM patients WHERE tenant_id = v_tenant_id;
  
  -- Restore snapshot
  PERFORM restore_snapshot_to_tenant(v_tenant_id, v_snapshot);
  
  -- Reset simulation timestamps
  UPDATE simulation_active
  SET 
    starts_at = now(),
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
  SELECT json_agg(
    json_build_object(
      'user_id', sp.user_id,
      'role', sp.role,
      'name', up.full_name,
      'email', up.email
    )
  ) INTO v_participants
  FROM simulation_participants sp
  JOIN user_profiles up ON up.id = sp.user_id
  WHERE sp.simulation_id = p_simulation_id;
  
  -- Summarize activity
  SELECT json_build_object(
    'total_actions', COUNT(*),
    'actions_by_type', json_agg(DISTINCT action_type),
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
  
  v_result := json_build_object(
    'success', true,
    'history_id', v_history_id,
    'message', 'Simulation completed and archived to history'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Calculate simulation performance metrics
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
      FROM medications m
      WHERE m.tenant_id = v_tenant_id
      AND m.administered_at IS NOT NULL
    ),
    'vitals_recorded', (
      SELECT COUNT(*)
      FROM patient_vitals pv
      JOIN patients p ON p.id = pv.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'notes_created', (
      SELECT COUNT(*)
      FROM patient_notes pn
      JOIN patients p ON p.id = pn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'alerts_generated', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'alerts_acknowledged', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
      AND pa.acknowledged = true
    ),
    'total_actions', (
      SELECT COUNT(*)
      FROM simulation_activity_log
      WHERE simulation_id = p_simulation_id
    ),
    'unique_participants', (
      SELECT COUNT(DISTINCT user_id)
      FROM simulation_activity_log
      WHERE simulation_id = p_simulation_id
    )
  );
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Delete simulation and cleanup tenant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_simulation(
  p_simulation_id uuid,
  p_archive_to_history boolean DEFAULT true
)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_result json;
BEGIN
  -- Get tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Archive to history if requested
  IF p_archive_to_history THEN
    PERFORM complete_simulation(p_simulation_id);
  END IF;
  
  -- Delete simulation record (cascade will handle participants)
  DELETE FROM simulation_active WHERE id = p_simulation_id;
  
  -- Delete tenant (cascade will handle all data)
  DELETE FROM tenants WHERE id = v_tenant_id;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Simulation and tenant deleted successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Check for expired simulations and auto-complete them
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_expired_simulations()
RETURNS json AS $$
DECLARE
  v_expired_count integer := 0;
  v_sim_record simulation_active%ROWTYPE;
BEGIN
  -- Find and complete expired simulations
  FOR v_sim_record IN
    SELECT * FROM simulation_active
    WHERE status = 'running'
    AND ends_at < now()
  LOOP
    PERFORM complete_simulation(v_sim_record.id);
    
    -- Auto cleanup if configured
    IF v_sim_record.auto_cleanup THEN
      PERFORM delete_simulation(v_sim_record.id, false); -- Already archived
    END IF;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'checked_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule this function to run periodically (e.g., via pg_cron or external scheduler)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION create_simulation_template IS 'Create new simulation template with dedicated tenant';
COMMENT ON FUNCTION save_template_snapshot IS 'Capture snapshot of template tenant data';
COMMENT ON FUNCTION launch_simulation IS 'Launch new simulation instance from template';
COMMENT ON FUNCTION restore_snapshot_to_tenant IS 'Restore snapshot data to target tenant';
COMMENT ON FUNCTION reset_simulation IS 'Reset simulation to original template state';
COMMENT ON FUNCTION complete_simulation IS 'Complete simulation and archive to history with metrics';
COMMENT ON FUNCTION calculate_simulation_metrics IS 'Calculate performance metrics for simulation';
COMMENT ON FUNCTION delete_simulation IS 'Delete simulation and cleanup tenant';
COMMENT ON FUNCTION check_expired_simulations IS 'Check for and complete expired simulations';

-- Functions complete
-- Next step: Create TypeScript types and React components
