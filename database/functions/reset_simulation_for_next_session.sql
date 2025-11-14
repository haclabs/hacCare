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
  -- STEP 1: SAVE PATIENT BARCODE IDs (CRITICAL!)
  -- =====================================================
  -- These are printed on labels and CANNOT change
  FOR v_patient_id, v_barcode IN 
    SELECT id, patient_id 
    FROM patients 
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at
  LOOP
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '💾 Saving barcode: patient % has barcode %', v_patient_id, v_barcode;
  END LOOP;

  -- =====================================================
  -- STEP 2: CALL restore_snapshot_to_tenant WITH BARCODE PRESERVATION
  -- =====================================================
  -- This will delete everything and restore from snapshot while preserving patient barcodes
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_patient_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;
  
  RAISE NOTICE '✅ Restored snapshot with preserved barcodes';
  RAISE NOTICE '📊 Restore result: %', jsonb_pretty(v_result);

  -- =====================================================
  -- STEP 3: RESET SIMULATION TIMER
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
  -- STEP 4: LOG THE RESET
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
    'Simulation reset for next session - used restore_snapshot_to_tenant with barcode preservation'
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
'Reset simulation for next class session - deletes student work but preserves patients and barcode IDs';
