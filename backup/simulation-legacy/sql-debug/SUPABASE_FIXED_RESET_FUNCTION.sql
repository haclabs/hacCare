-- DEPLOY THIS FIXED VERSION - Issue was in vitals restoration logic

CREATE OR REPLACE FUNCTION reset_simulation_for_next_session_v2(p_simulation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_tenant_id UUID;
  v_snapshot JSONB;
  v_table_name TEXT;
  v_record JSONB;
  v_total_cleared INTEGER := 0;
  v_total_restored INTEGER := 0;
  v_count INTEGER;
  v_stats JSONB := '{}';
  
  -- For vitals cyclical distribution
  v_simulation_patients UUID[];
  v_patient_count INTEGER;
BEGIN
  RAISE NOTICE '🚀 Starting smart session reset for simulation %', p_simulation_id;

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

  RAISE NOTICE '📋 Found template: % for tenant: %', v_template_id, v_tenant_id;

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

  RAISE NOTICE '📊 Template snapshot contains tables: %', array_to_string(ARRAY(SELECT jsonb_object_keys(v_snapshot)), ', ');

  -- Get simulation patients BEFORE clearing data (for vitals distribution)
  SELECT array_agg(p.id ORDER BY p.created_at, p.id), COUNT(*) 
  INTO v_simulation_patients, v_patient_count
  FROM patients p
  WHERE p.tenant_id = v_tenant_id;

  RAISE NOTICE '👥 Found % simulation patients for vitals distribution', COALESCE(v_patient_count, 0);

  -- SMART CLEANUP: Clear everything except medications (preserve medication IDs for barcodes)
  FOR v_table_name IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE 'patient_%'
      AND table_name NOT IN ('patient_medications')
  LOOP
    -- Skip if table doesn't have tenant_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = v_table_name AND column_name = 'tenant_id') THEN
      CONTINUE;
    END IF;
    
    -- Clear tenant data
    EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table_name) USING v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_total_cleared := v_total_cleared + v_count;
    
    RAISE NOTICE '🗑️ Cleared % records from %', v_count, v_table_name;
  END LOOP;

  -- SMART RESTORATION: Restore all data from template snapshot
  IF v_snapshot IS NOT NULL THEN
    FOR v_table_name IN SELECT jsonb_object_keys(v_snapshot)
    LOOP
      RAISE NOTICE '📦 Restoring template records for %', v_table_name;
      
      -- Special handling for patient_vitals - distribute across simulation patients
      IF v_table_name = 'patient_vitals' AND v_patient_count > 0 THEN
        DECLARE
          v_vitals_counter integer := 0;
          v_patient_index integer;
          v_simulation_patient_uuid uuid;
          v_vitals_array JSONB;
        BEGIN
          -- Get vitals array safely
          v_vitals_array := v_snapshot->v_table_name;
          
          -- Check if we have vitals to restore
          IF v_vitals_array IS NOT NULL AND jsonb_array_length(v_vitals_array) > 0 THEN
            -- Process each vitals record
            FOR v_record IN SELECT value FROM jsonb_array_elements(v_vitals_array)
            LOOP
              v_vitals_counter := v_vitals_counter + 1;
              v_patient_index := ((v_vitals_counter - 1) % v_patient_count) + 1;
              v_simulation_patient_uuid := v_simulation_patients[v_patient_index];
              
              -- Insert vitals with explicit field mapping
              BEGIN
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
                
                v_total_restored := v_total_restored + 1;
              EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ VITALS INSERT FAILED: % - Record: %', SQLERRM, v_record;
              END;
            END LOOP;
            
            RAISE NOTICE '  ✅ Restored % vitals records across % patients', v_vitals_counter, v_patient_count;
          ELSE
            RAISE NOTICE '  ⚠️ No vitals records in snapshot to restore';
          END IF;
        END;
      ELSE
        -- Regular restore for other tables
        DECLARE
          v_records_array JSONB;
        BEGIN
          v_records_array := v_snapshot->v_table_name;
          
          IF v_records_array IS NOT NULL AND jsonb_array_length(v_records_array) > 0 THEN
            FOR v_record IN SELECT value FROM jsonb_array_elements(v_records_array)
            LOOP
              -- Make sure tenant_id is correct
              IF EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = v_table_name AND column_name = 'tenant_id') THEN
                v_record := v_record || jsonb_build_object('tenant_id', v_tenant_id);
              END IF;
              
              -- Dynamically insert record
              BEGIN
                EXECUTE format('
                  INSERT INTO %I 
                  SELECT * FROM jsonb_populate_record(null::%I, $1)
                ', v_table_name, v_table_name)
                USING v_record;
                
                v_total_restored := v_total_restored + 1;
              EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '❌ INSERT FAILED in %: %', v_table_name, SQLERRM;
              END;
            END LOOP;
          END IF;
        END;
      END IF;
      
      RAISE NOTICE '  📦 Completed restoration for %', v_table_name;
    END LOOP;
  END IF;
  
  -- Count preserved medications and restored data
  SELECT count(*) INTO v_count FROM patient_medications WHERE tenant_id = v_tenant_id;
  v_stats := v_stats || jsonb_build_object('medications_preserved', v_count);
  RAISE NOTICE '💊 Preserved % medications (IDs unchanged)', v_count;
  
  -- Count vitals
  SELECT count(*) INTO v_count FROM patient_vitals WHERE tenant_id = v_tenant_id;
  v_stats := v_stats || jsonb_build_object('vitals_restored', v_count);
  RAISE NOTICE '📊 Restored % vitals', v_count;
  
  -- Update simulation metadata
  UPDATE simulation_active
  SET
    session_number = COALESCE(session_number, 0) + 1,
    last_reset_at = now(),
    reset_count = COALESCE(reset_count, 0) + 1,
    updated_at = now()
  WHERE id = p_simulation_id;

  RAISE NOTICE '🎉 Smart session reset complete!';
  
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'tenant_id', v_tenant_id,
    'reset_type', 'smart_session_reset_v2',
    'total_cleared', v_total_cleared,
    'total_restored', v_total_restored,
    'stats', v_stats,
    'message', 'Smart reset complete. Medications preserved, all other data restored to snapshot state.',
    'timestamp', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during smart reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE,
    'simulation_id', p_simulation_id
  );
END;
$$;