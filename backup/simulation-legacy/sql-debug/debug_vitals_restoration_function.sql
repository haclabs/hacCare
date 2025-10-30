-- TEST FUNCTION: Debug the restoration process and return errors
CREATE OR REPLACE FUNCTION debug_vitals_restoration(p_simulation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_record jsonb;
  v_simulation_patients uuid[];
  v_patient_index integer;
  v_simulation_patient_uuid uuid;
  v_vitals_counter integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_success_count integer := 0;
BEGIN
  -- Get simulation details
  SELECT sa.tenant_id, sa.template_id, st.snapshot_data
  INTO v_tenant_id, v_template_id, v_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Simulation not found');
  END IF;

  -- Get simulation patients
  SELECT array_agg(p.id ORDER BY p.created_at, p.id) INTO v_simulation_patients
  FROM patients p
  WHERE p.tenant_id = v_tenant_id;

  -- Check if we have vitals in snapshot
  IF NOT (v_snapshot ? 'patient_vitals') THEN
    RETURN jsonb_build_object('error', 'No patient_vitals in snapshot');
  END IF;

  -- Process each vitals record
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_snapshot->'patient_vitals')
  LOOP
    v_vitals_counter := v_vitals_counter + 1;
    v_patient_index := ((v_vitals_counter - 1) % array_length(v_simulation_patients, 1)) + 1;
    v_simulation_patient_uuid := v_simulation_patients[v_patient_index];
    
    -- Update tenant_id and patient_id
    v_record := v_record || jsonb_build_object('tenant_id', v_tenant_id);
    v_record := v_record || jsonb_build_object('patient_id', v_simulation_patient_uuid);
    
    -- Try to insert
    BEGIN
      EXECUTE format('
        INSERT INTO patient_vitals 
        SELECT * FROM jsonb_populate_record(null::patient_vitals, $1)
      ')
      USING v_record;
      
      v_success_count := v_success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'vitals_number', v_vitals_counter,
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'record', v_record
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'vitals_in_snapshot', jsonb_array_length(v_snapshot->'patient_vitals'),
    'simulation_patients', array_length(v_simulation_patients, 1),
    'success_count', v_success_count,
    'error_count', jsonb_array_length(v_errors),
    'errors', v_errors
  );
END;
$$;