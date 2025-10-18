-- ===========================================================================
-- OPTION 4 IMPLEMENTATION: Multiple Simulation ID Sets for Label Pre-Printing
-- ===========================================================================
-- This allows you to:
-- 1. Generate IDs for multiple planned simulation sessions upfront
-- 2. Pre-print labels for each session with unique IDs
-- 3. Run multiple simulations simultaneously without ID conflicts
-- ===========================================================================

-- Step 1: Add column to store multiple ID sets
ALTER TABLE simulation_templates 
ADD COLUMN IF NOT EXISTS simulation_id_sets jsonb DEFAULT '[]'::jsonb;

-- Step 2: Function to generate multiple ID sets at once
DROP FUNCTION IF EXISTS generate_simulation_id_sets(uuid, integer, text[]) CASCADE;

CREATE OR REPLACE FUNCTION generate_simulation_id_sets(
  p_template_id uuid,
  p_session_count integer,
  p_session_names text[] DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_id_sets jsonb := '[]'::jsonb;
  v_session_data jsonb;
  v_patient_mappings jsonb;
  v_med_mappings jsonb;
  v_tenant_id uuid;
  v_patient_record record;
  v_med_record record;
  v_new_uuid uuid;
  i integer;
  v_session_name text;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  -- Generate ID sets for each session
  FOR i IN 1..p_session_count LOOP
    v_patient_mappings := '{}'::jsonb;
    v_med_mappings := '{}'::jsonb;
    
    -- Determine session name
    IF p_session_names IS NOT NULL AND i <= array_length(p_session_names, 1) THEN
      v_session_name := p_session_names[i];
    ELSE
      v_session_name := 'Session ' || i;
    END IF;
    
    RAISE NOTICE 'Generating IDs for session %: %', i, v_session_name;
    
    -- Generate unique IDs for patients
    FOR v_patient_record IN 
      SELECT id, patient_id, first_name, last_name 
      FROM patients 
      WHERE tenant_id = v_tenant_id
    LOOP
      v_new_uuid := gen_random_uuid();
      v_patient_mappings := jsonb_set(
        v_patient_mappings,
        ARRAY[v_patient_record.id::text],
        to_jsonb(v_new_uuid::text)
      );
      
      RAISE NOTICE '  Patient: % % -> %', v_patient_record.first_name, v_patient_record.last_name, v_new_uuid;
    END LOOP;
    
    -- Generate unique IDs for medications
    FOR v_med_record IN 
      SELECT pm.id, pm.medication_name
      FROM patient_medications pm 
      JOIN patients p ON p.id = pm.patient_id 
      WHERE p.tenant_id = v_tenant_id
    LOOP
      v_new_uuid := gen_random_uuid();
      v_med_mappings := jsonb_set(
        v_med_mappings,
        ARRAY[v_med_record.id::text],
        to_jsonb(v_new_uuid::text)
      );
      
      RAISE NOTICE '  Medication: % -> %', v_med_record.medication_name, v_new_uuid;
    END LOOP;
    
    -- Build session data
    v_session_data := jsonb_build_object(
      'session_number', i,
      'session_name', v_session_name,
      'created_at', now(),
      'patient_count', (SELECT count(*) FROM patients WHERE tenant_id = v_tenant_id),
      'medication_count', (SELECT count(*) FROM patient_medications pm JOIN patients p ON p.id = pm.patient_id WHERE p.tenant_id = v_tenant_id),
      'id_mappings', jsonb_build_object(
        'patients', v_patient_mappings,
        'medications', v_med_mappings
      )
    );
    
    -- Add to sets array
    v_id_sets := v_id_sets || jsonb_build_array(v_session_data);
  END LOOP;
  
  -- Store all sets in template
  UPDATE simulation_templates
  SET 
    simulation_id_sets = v_id_sets,
    updated_at = now()
  WHERE id = p_template_id;
  
  RETURN json_build_object(
    'success', true,
    'session_count', p_session_count,
    'sessions', v_id_sets
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Function to get label data for a specific session
DROP FUNCTION IF EXISTS get_simulation_label_data(uuid, integer) CASCADE;

CREATE OR REPLACE FUNCTION get_simulation_label_data(
  p_template_id uuid,
  p_session_number integer
)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_session_data jsonb;
  v_id_mappings jsonb;
  v_label_data json;
BEGIN
  -- Get template info
  SELECT tenant_id, simulation_id_sets->>(p_session_number - 1)
  INTO v_tenant_id, v_session_data
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_session_data IS NULL THEN
    RAISE EXCEPTION 'Session % not found for template %', p_session_number, p_template_id;
  END IF;
  
  v_id_mappings := v_session_data->'id_mappings';
  
  -- Build label data with pre-allocated IDs
  SELECT json_build_object(
    'session_name', v_session_data->>'session_name',
    'session_number', p_session_number,
    'patients', (
      SELECT json_agg(json_build_object(
        'simulation_id', (v_id_mappings->'patients'->>p.id::text)::uuid,
        'patient_id', p.patient_id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'full_name', p.first_name || ' ' || p.last_name,
        'date_of_birth', p.date_of_birth,
        'blood_type', p.blood_type,
        'allergies', p.allergies,
        'room_number', p.room_number,
        'bed_number', p.bed_number
      ))
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'medications', (
      SELECT json_agg(json_build_object(
        'simulation_id', (v_id_mappings->'medications'->>pm.id::text)::uuid,
        'medication_name', pm.medication_name,
        'dosage', pm.dosage,
        'route', pm.route,
        'frequency', pm.frequency,
        'patient_id', p.patient_id,
        'patient_name', p.first_name || ' ' || p.last_name,
        'room_number', p.room_number
      ))
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    )
  ) INTO v_label_data;
  
  RETURN v_label_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update launch_simulation to use session-specific IDs
DROP FUNCTION IF EXISTS launch_simulation(uuid, text, integer, uuid[], text[], integer) CASCADE;

CREATE OR REPLACE FUNCTION launch_simulation(
  p_template_id uuid,
  p_name text,
  p_duration_minutes integer,
  p_participant_user_ids uuid[],
  p_participant_roles text[] DEFAULT NULL,
  p_session_number integer DEFAULT NULL
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
  v_id_mappings jsonb;
  v_session_data jsonb;
  i integer;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify template exists and is ready
  SELECT tenant_id, snapshot_data, snapshot_version, simulation_id_sets
  INTO v_template_tenant_id, v_snapshot, v_snapshot_version, v_session_data
  FROM simulation_templates
  WHERE id = p_template_id
  AND status = 'ready';
  
  IF v_template_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found or not ready';
  END IF;
  
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template has no snapshot data';
  END IF;
  
  -- Get ID mappings for specific session
  IF p_session_number IS NOT NULL THEN
    IF v_session_data IS NULL OR jsonb_array_length(v_session_data) = 0 THEN
      RAISE EXCEPTION 'No simulation ID sets found. Generate ID sets first using generate_simulation_id_sets()';
    END IF;
    
    IF p_session_number < 1 OR p_session_number > jsonb_array_length(v_session_data) THEN
      RAISE EXCEPTION 'Invalid session number %. Available sessions: 1-%', p_session_number, jsonb_array_length(v_session_data);
    END IF;
    
    v_id_mappings := (v_session_data->(p_session_number - 1))->'id_mappings';
    RAISE NOTICE 'Using pre-allocated IDs for session %', p_session_number;
  ELSE
    RAISE NOTICE 'No session number provided - will generate random IDs';
    v_id_mappings := NULL;
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
    v_template_tenant_id,
    jsonb_build_object(
      'template_id', p_template_id,
      'session_number', p_session_number,
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
    p_name || COALESCE(' (Session ' || p_session_number || ')', ''),
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
  
  -- Restore snapshot data to new tenant WITH pre-allocated IDs
  PERFORM restore_snapshot_to_tenant(v_new_tenant_id, v_snapshot, v_id_mappings);
  
  -- Log activity
  INSERT INTO simulation_activity_log (
    simulation_id,
    user_id,
    action_type,
    action_details,
    notes
  )
  VALUES (
    v_simulation_id,
    v_user_id,
    'simulation_launched',
    jsonb_build_object(
      'template_id', p_template_id,
      'tenant_id', v_new_tenant_id,
      'session_number', p_session_number,
      'participant_count', array_length(p_participant_user_ids, 1)
    ),
    'Simulation launched from template' || 
    COALESCE(' using Session ' || p_session_number, '') || 
    ': ' || (SELECT name FROM simulation_templates WHERE id = p_template_id)
  );
  
  v_result := json_build_object(
    'success', true,
    'simulation_id', v_simulation_id,
    'tenant_id', v_new_tenant_id,
    'session_number', p_session_number,
    'message', 'Simulation launched successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_simulation_id_sets(uuid, integer, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_simulation_label_data(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION launch_simulation(uuid, text, integer, uuid[], text[], integer) TO authenticated;

SELECT '✅ Option 4 implementation complete! You can now generate multiple ID sets for pre-printing labels.' as status;
