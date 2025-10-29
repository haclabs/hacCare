-- EMERGENCY RECOVERY - Restore patients from template snapshot

CREATE OR REPLACE FUNCTION recover_simulation_patients(p_simulation_id UUID)
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
  v_patients_restored INTEGER := 0;
  v_total_restored INTEGER := 0;
BEGIN
  RAISE NOTICE '🚑 Emergency patient recovery for simulation %', p_simulation_id;

  -- Get simulation metadata
  SELECT template_id, tenant_id INTO v_template_id, v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Simulation not found or no template associated'
    );
  END IF;

  -- Get the template snapshot
  SELECT jsonb_object_agg(table_name, records) INTO v_snapshot
  FROM (
    SELECT 
      table_name,
      jsonb_agg(data ORDER BY created_at) as records
    FROM simulation_template_snapshots
    WHERE template_id = v_template_id
    GROUP BY table_name
  ) grouped_records;

  IF v_snapshot IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No template snapshot found'
    );
  END IF;

  -- Restore patients first
  IF v_snapshot ? 'patients' THEN
    FOR v_record IN SELECT value FROM jsonb_array_elements(v_snapshot->'patients')
    LOOP
      -- Update tenant_id to simulation tenant
      v_record := v_record || jsonb_build_object('tenant_id', v_tenant_id);
      
      BEGIN
        INSERT INTO patients 
        SELECT * FROM jsonb_populate_record(null::patients, v_record);
        
        v_patients_restored := v_patients_restored + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Patient insert failed: %', SQLERRM;
      END;
    END LOOP;
  END IF;

  -- Restore other patient data
  FOR v_table_name IN 
    SELECT unnest(ARRAY['patient_medications', 'patient_alerts', 'patient_notes'])
    WHERE v_snapshot ? unnest(ARRAY['patient_medications', 'patient_alerts', 'patient_notes'])
  LOOP
    FOR v_record IN SELECT value FROM jsonb_array_elements(v_snapshot->v_table_name)
    LOOP
      -- Update tenant_id
      v_record := v_record || jsonb_build_object('tenant_id', v_tenant_id);
      
      BEGIN
        EXECUTE format('
          INSERT INTO %I 
          SELECT * FROM jsonb_populate_record(null::%I, $1)
        ', v_table_name, v_table_name)
        USING v_record;
        
        v_total_restored := v_total_restored + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert failed in %: %', v_table_name, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE '🎉 Recovery complete!';
  
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'patients_restored', v_patients_restored,
    'total_records_restored', v_total_restored,
    'message', format('Recovered %s patients and %s other records', v_patients_restored, v_total_restored),
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'simulation_id', p_simulation_id
  );
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION recover_simulation_patients(UUID) TO authenticated;