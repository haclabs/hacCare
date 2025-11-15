-- =====================================================
-- RESET SIMULATION FOR NEXT SESSION
-- =====================================================
-- This function resets a simulation for the next class session by:
-- 1. KEEPING patients and their IDs (for barcode labels)
-- 2. DELETING all student-added work
-- 3. RESTORING baseline vitals/orders from template
-- 4. GENERATING debrief from student work (TODO: implement)
-- 5. RESETTING timer
-- =====================================================

CREATE OR REPLACE FUNCTION reset_simulation_for_next_session(p_simulation_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_stats jsonb := '{}'::jsonb;
BEGIN
  RAISE NOTICE '🔄 Starting session reset for simulation: %', p_simulation_id;
  
  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template has no snapshot data';
  END IF;

  RAISE NOTICE '✅ Found simulation - tenant: %, template: %', v_tenant_id, v_template_id;
  
  -- =====================================================
  -- STEP 1: SAVE PATIENT & MEDICATION BARCODE IDs (CRITICAL!)
  -- =====================================================
  -- These are printed on labels and CANNOT change
  
  -- Save patient barcodes
  FOR v_patient_id, v_barcode IN 
    SELECT id, patient_id 
    FROM patients 
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at
  LOOP
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '💾 Saving patient barcode: % has barcode %', v_patient_id, v_barcode;
  END LOOP;
  
  -- 🆕 Save medication UUIDs (for barcode compatibility)
  -- Map by patient + medication name to preserve across reset
  DECLARE
    v_medication_mappings jsonb := '{}'::jsonb;
    v_med_id uuid;
    v_med_name text;
    v_med_patient_id uuid;
    v_mapping_key text;
  BEGIN
    FOR v_med_id, v_med_name, v_med_patient_id IN
      SELECT pm.id, pm.name, pm.patient_id
      FROM patient_medications pm
      WHERE pm.tenant_id = v_tenant_id
      ORDER BY pm.created_at
    LOOP
      -- Create composite key: patient_id||medication_name
      v_mapping_key := v_med_patient_id::text || '||' || v_med_name;
      v_medication_mappings := v_medication_mappings || jsonb_build_object(v_mapping_key, v_med_id);
      RAISE NOTICE '💊 Saving medication mapping: % (%)', v_med_name, v_med_id;
    END LOOP;
    
    -- Store in v_patient_barcodes with special key (hacky but works with existing function signature)
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object('__medication_mappings__', v_medication_mappings);
  END;

  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (preserve medications!)
  -- =====================================================
  -- Delete student-added data but KEEP medications (preserve UUIDs for barcodes)
  
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % medication administrations', v_count;
  
  -- 🆕 DON'T delete medications - we'll update them in place to preserve UUIDs
  -- DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '💊 Preserving medication UUIDs for barcode compatibility';
  
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % vitals', v_count;
  
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % notes', v_count;
  
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % alerts', v_count;
  
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % images', v_count;
  
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % wound assessments', v_count;
  
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab results', v_count;
  
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab panels', v_count;
  
  DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % diabetic records', v_count;
  
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % doctors orders', v_count;
  
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % handover notes', v_count;
  
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab orders', v_count;
  
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % bowel records', v_count;
  
  -- Try tenant_id first, fall back to patient_id if column doesn't exist
  BEGIN
    DELETE FROM patient_intake_output_events WHERE tenant_id = v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via tenant_id)', v_count;
  EXCEPTION WHEN undefined_column THEN
    DELETE FROM patient_intake_output_events WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via patient_id)', v_count;
  END;
  
  -- Delete baseline items too (will be restored from snapshot)
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % wounds', v_count;
  
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % devices', v_count;
  
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % avatar locations', v_count;
  
  RAISE NOTICE '✅ All data deleted (except patients)';

  -- =====================================================
  -- STEP 3: RESTORE FROM SNAPSHOT WITH BARCODE PRESERVATION
  -- =====================================================
  -- Restore all baseline data, mapping to existing patients
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_patient_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;
  
  RAISE NOTICE '✅ Restored snapshot with preserved barcodes';
  RAISE NOTICE '📊 Restore result: %', jsonb_pretty(v_result);

  -- =====================================================
  -- STEP 3B: UPDATE MEDICATIONS IN PLACE (preserve UUIDs!)
  -- =====================================================
  -- Extract medication mappings from barcode mappings
  DECLARE
    v_medication_mappings jsonb;
    v_snapshot_med jsonb;
    v_med_name text;
    v_med_patient_id uuid;
    v_mapping_key text;
    v_existing_med_id uuid;
    v_snapshot_patient_id text;
    v_actual_patient_id uuid;
    v_meds_updated integer := 0;
    v_meds_inserted integer := 0;
  BEGIN
    v_medication_mappings := v_patient_barcodes->'__medication_mappings__';
    
    IF v_medication_mappings IS NOT NULL AND v_snapshot ? 'medications' THEN
      RAISE NOTICE '💊 Updating medications in place to preserve UUIDs...';
      
      -- Loop through snapshot medications
      FOR v_snapshot_med IN SELECT * FROM jsonb_array_elements(v_snapshot->'medications')
      LOOP
        v_med_name := v_snapshot_med->>'name';
        v_snapshot_patient_id := v_snapshot_med->>'patient_id';
        
        -- Map snapshot patient_id to actual patient_id
        v_actual_patient_id := (v_patient_barcodes->>v_snapshot_patient_id)::uuid;
        
        IF v_actual_patient_id IS NULL THEN
          -- Try direct UUID lookup
          v_actual_patient_id := v_snapshot_patient_id::uuid;
        END IF;
        
        -- Build composite key
        v_mapping_key := v_actual_patient_id::text || '||' || v_med_name;
        v_existing_med_id := (v_medication_mappings->>v_mapping_key)::uuid;
        
        IF v_existing_med_id IS NOT NULL THEN
          -- Update existing medication (preserves UUID!)
          UPDATE patient_medications
          SET
            name = v_med_name,
            dosage = v_snapshot_med->>'dosage',
            route = v_snapshot_med->>'route',
            frequency = v_snapshot_med->>'frequency',
            start_date = (v_snapshot_med->>'start_date')::timestamptz,
            prescribed_by = v_snapshot_med->>'prescribed_by',
            status = COALESCE(v_snapshot_med->>'status', 'active'),
            category = v_snapshot_med->>'category',
            last_administered = NULL,
            next_due = (v_snapshot_med->>'next_due')::timestamptz,
            admin_times = COALESCE((v_snapshot_med->>'admin_times')::jsonb, '[]'::jsonb),
            instructions = v_snapshot_med->>'instructions',
            indication = v_snapshot_med->>'indication',
            updated_at = NOW()
          WHERE id = v_existing_med_id;
          
          v_meds_updated := v_meds_updated + 1;
          RAISE NOTICE '💊 Updated medication: % (UUID preserved: %)', v_med_name, v_existing_med_id;
        ELSE
          -- New medication not in previous session - insert it
          -- (This handles medications added to template after last session)
          INSERT INTO patient_medications (
            tenant_id,
            patient_id,
            name,
            dosage,
            route,
            frequency,
            start_date,
            prescribed_by,
            status,
            category,
            next_due,
            admin_times,
            instructions,
            indication
          ) VALUES (
            v_tenant_id,
            v_actual_patient_id,
            v_med_name,
            v_snapshot_med->>'dosage',
            v_snapshot_med->>'route',
            v_snapshot_med->>'frequency',
            (v_snapshot_med->>'start_date')::timestamptz,
            v_snapshot_med->>'prescribed_by',
            COALESCE(v_snapshot_med->>'status', 'active'),
            v_snapshot_med->>'category',
            (v_snapshot_med->>'next_due')::timestamptz,
            COALESCE((v_snapshot_med->>'admin_times')::jsonb, '[]'::jsonb),
            v_snapshot_med->>'instructions',
            v_snapshot_med->>'indication'
          );
          
          v_meds_inserted := v_meds_inserted + 1;
          RAISE NOTICE '💊 Inserted new medication: % (not in previous session)', v_med_name;
        END IF;
      END LOOP;
      
      -- Delete medications that are no longer in template
      WITH snapshot_meds AS (
        SELECT 
          v_actual_patient_id as patient_id,
          med->>'name' as med_name
        FROM jsonb_array_elements(v_snapshot->'medications') med,
        LATERAL (
          SELECT (v_patient_barcodes->>(med->>'patient_id'))::uuid as v_actual_patient_id
        ) mapping
      )
      DELETE FROM patient_medications pm
      WHERE pm.tenant_id = v_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM snapshot_meds sm
        WHERE sm.patient_id = pm.patient_id
        AND sm.med_name = pm.name
      );
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '💊 Medications updated: %, inserted: %, removed: %', v_meds_updated, v_meds_inserted, v_count;
    END IF;
  END;

  -- =====================================================
  -- STEP 4: RESET SIMULATION TIMER
  -- =====================================================
  
  UPDATE simulation_active
  SET
    status = 'running',
    starts_at = NOW(),
    ends_at = NOW() + (v_duration_minutes || ' minutes')::interval,
    completed_at = NULL,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  RAISE NOTICE '⏱️  Timer reset: duration = % minutes', v_duration_minutes;

  -- =====================================================
  -- STEP 5: LOG THE RESET
  -- =====================================================
  
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
    'simulation_reset',
    v_result,
    'Simulation reset for next session - preserved patient and medication UUIDs for barcode compatibility'
  );

  RAISE NOTICE '🎉 Session reset complete!';
  
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_simulation_for_next_session(uuid) TO authenticated;

COMMENT ON FUNCTION reset_simulation_for_next_session IS 
'Reset simulation for next class session - deletes student work but preserves patient and medication UUIDs for barcode compatibility';
