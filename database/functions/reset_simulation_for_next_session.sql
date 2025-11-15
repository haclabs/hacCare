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
  v_snapshot_original jsonb;  -- Keep original snapshot with medications
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
  
  -- Save original snapshot (before we remove medications)
  v_snapshot_original := v_snapshot;

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
  


  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (preserve medications!)
  -- =====================================================
  -- Delete student-added data but KEEP medications (preserve UUIDs for barcodes)
  
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % medication administrations', v_count;
  
  -- 🆕 DON'T delete medications - preserve them like we preserve patients!
  -- DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '💊 Preserving medications (like patients) - UUIDs and barcodes stay consistent';
  
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
  -- Remove medications from snapshot - they're preserved like patients
  -- KEEP patients in snapshot - restore function needs them to build patient mapping!
  v_snapshot := v_snapshot - 'patient_medications';
  RAISE NOTICE '💊 Removed medications from snapshot (preserved with their UUIDs)';
  RAISE NOTICE '👥 Keeping patients in snapshot for ID mapping (will not create new patients due to preserve_barcodes flag)';
  
  -- Restore all baseline data, mapping to existing patients
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_patient_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;
  
  RAISE NOTICE '✅ Restored snapshot with preserved barcodes';
  RAISE NOTICE '📊 Restore result: %', jsonb_pretty(v_result);
  RAISE NOTICE '💊 Medications preserved unchanged (like patients) - UUIDs and barcodes stay consistent';

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
