-- STEP-BY-STEP VITALS RESTORATION DEBUG

CREATE OR REPLACE FUNCTION debug_vitals_restoration_only(p_simulation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_tenant_id UUID;
  v_snapshot JSONB;
  v_record JSONB;
  v_simulation_patients UUID[];
  v_patient_count INTEGER;
  v_vitals_counter INTEGER := 0;
  v_vitals_restored INTEGER := 0;
  v_patient_index INTEGER;
  v_simulation_patient_uuid UUID;
  v_vitals_array JSONB;
BEGIN
  RAISE NOTICE '🩺 Testing ONLY vitals restoration for simulation %', p_simulation_id;

  -- Get simulation metadata
  SELECT template_id, tenant_id INTO v_template_id, v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id
  LIMIT 1;

  RAISE NOTICE 'Found template: % tenant: %', v_template_id, v_tenant_id;

  -- Get current patients in simulation
  SELECT array_agg(p.id ORDER BY p.created_at, p.id), COUNT(*) 
  INTO v_simulation_patients, v_patient_count
  FROM patients p
  WHERE p.tenant_id = v_tenant_id;

  RAISE NOTICE 'Found % patients in simulation: %', v_patient_count, v_simulation_patients;

  IF v_patient_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No patients found in simulation'
    );
  END IF;

  -- Get template snapshot
  SELECT jsonb_object_agg(table_name, records) INTO v_snapshot
  FROM (
    SELECT 
      table_name,
      jsonb_agg(data ORDER BY created_at) as records
    FROM simulation_template_snapshots
    WHERE template_id = v_template_id
    GROUP BY table_name
  ) grouped_records;

  -- Check if we have vitals in snapshot
  IF v_snapshot IS NULL OR NOT (v_snapshot ? 'patient_vitals') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No vitals found in template snapshot'
    );
  END IF;

  -- Get vitals array
  v_vitals_array := v_snapshot->'patient_vitals';
  
  RAISE NOTICE 'Found % vitals in template snapshot', jsonb_array_length(v_vitals_array);

  -- Process each vitals record one by one
  FOR v_record IN SELECT value FROM jsonb_array_elements(v_vitals_array)
  LOOP
    v_vitals_counter := v_vitals_counter + 1;
    v_patient_index := ((v_vitals_counter - 1) % v_patient_count) + 1;
    v_simulation_patient_uuid := v_simulation_patients[v_patient_index];
    
    RAISE NOTICE 'Processing vital #% -> patient #% (UUID: %)', v_vitals_counter, v_patient_index, v_simulation_patient_uuid;
    RAISE NOTICE 'Vitals data: %', v_record;
    
    BEGIN
      -- Try to insert this specific vitals record
      INSERT INTO patient_vitals (
        patient_id,
        tenant_id,
        temperature,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        heart_rate,
        respiratory_rate,
        oxygen_saturation,
        oxygen_delivery,
        recorded_at
      ) VALUES (
        v_simulation_patient_uuid,
        v_tenant_id,
        (v_record->>'temperature')::DECIMAL,
        (v_record->>'blood_pressure_systolic')::INTEGER,
        (v_record->>'blood_pressure_diastolic')::INTEGER,
        (v_record->>'heart_rate')::INTEGER,
        (v_record->>'respiratory_rate')::INTEGER,
        (v_record->>'oxygen_saturation')::INTEGER,
        v_record->>'oxygen_delivery',
        COALESCE((v_record->>'recorded_at')::TIMESTAMPTZ, NOW())
      );
      
      v_vitals_restored := v_vitals_restored + 1;
      RAISE NOTICE '✅ Successfully inserted vital #%', v_vitals_counter;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ FAILED to insert vital #%: % - SQLSTATE: %', v_vitals_counter, SQLERRM, SQLSTATE;
      RAISE NOTICE '❌ Failed record data: %', v_record;
      
      -- Return the specific error for debugging
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed on vital #' || v_vitals_counter || ': ' || SQLERRM,
        'sqlstate', SQLSTATE,
        'failed_record', v_record,
        'target_patient', v_simulation_patient_uuid,
        'vitals_processed', v_vitals_counter - 1,
        'vitals_restored', v_vitals_restored
      );
    END;
  END LOOP;

  RAISE NOTICE '🎉 Vitals restoration test complete!';
  
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'patients_found', v_patient_count,
    'vitals_in_snapshot', jsonb_array_length(v_vitals_array),
    'vitals_restored', v_vitals_restored,
    'message', format('Successfully restored %s vitals across %s patients', v_vitals_restored, v_patient_count),
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Outer exception: ' || SQLERRM,
    'detail', SQLSTATE,
    'simulation_id', p_simulation_id
  );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION debug_vitals_restoration_only(UUID) TO authenticated;