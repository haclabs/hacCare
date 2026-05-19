-- ============================================================================
-- REDEPLOY RESET FUNCTIONS WITH BBIT + ADVANCED DIRECTIVES FIX
-- ============================================================================
-- Migration: Ensure database functions include DELETE for new tables
-- Date: 2026-03-25
-- Root Cause: patient_bbit_entries and patient_advanced_directives were added
--   AFTER the reset functions were last deployed to the database. Old function
--   definitions skip these tables → entries accumulate on each reset instead
--   of being cleared.
-- Fix: Re-deploy both reset functions with complete delete lists.
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: reset_simulation_for_next_session
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_simulation_for_next_session(
  p_simulation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_snapshot_original jsonb;
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_stats jsonb := '{}'::jsonb;
BEGIN
  RAISE NOTICE '🔄 Starting session reset for simulation: %', p_simulation_id;

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

  v_snapshot_original := v_snapshot;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template has no snapshot data';
  END IF;

  RAISE NOTICE '✅ Found simulation - tenant: %, template: %', v_tenant_id, v_template_id;

  -- =====================================================
  -- STEP 1: SAVE PATIENT & MEDICATION BARCODES
  -- =====================================================
  FOR v_patient_id, v_barcode IN
    SELECT id, patient_id FROM patients WHERE tenant_id = v_tenant_id ORDER BY created_at
  LOOP
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '💾 Saving patient barcode: % has barcode %', v_patient_id, v_barcode;
  END LOOP;

  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK
  -- =====================================================

  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % medication administrations', v_count;

  RAISE NOTICE '💊 Preserving medications (UUIDs and barcodes stay consistent)';

  UPDATE patient_medications SET last_administered = NULL WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🔄 Reset % medication administration times', v_count;

  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % vitals', v_count;

  DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % neuro assessments', v_count;

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

  DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % device assessments', v_count;

  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab results', v_count;

  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab panels', v_count;

  -- 🆕 BBIT entries (patient_bbit_entries added 2026-03-24)
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % BBIT entries', v_count;

  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % doctors orders', v_count;

  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % handover notes', v_count;

  -- 🆕 Advanced directives (patient_advanced_directives — had no delete)
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % advanced directives', v_count;

  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab orders', v_count;

  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % bowel records', v_count;

  BEGIN
    DELETE FROM patient_intake_output_events WHERE tenant_id = v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via tenant_id)', v_count;
  EXCEPTION WHEN undefined_column THEN
    DELETE FROM patient_intake_output_events WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via patient_id)', v_count;
  END;

  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % wounds', v_count;

  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % devices', v_count;

  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % avatar locations', v_count;

  RAISE NOTICE '✅ All student work deleted (patients and medications preserved)';

  -- =====================================================
  -- STEP 3: RESTORE FROM SNAPSHOT
  -- =====================================================
  v_snapshot := v_snapshot - 'patient_medications';
  RAISE NOTICE '💊 Removed medications from snapshot (preserved with their UUIDs)';

  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_patient_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;

  RAISE NOTICE '✅ Restored snapshot';
  RAISE NOTICE '📊 Restore result: %', jsonb_pretty(v_result);

  -- =====================================================
  -- STEP 4: SET STATUS TO PENDING
  -- =====================================================
  UPDATE simulation_active
  SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    completed_at = NULL,
    updated_at = NOW()
  WHERE id = p_simulation_id;

  RAISE NOTICE '✅ Status set to PENDING';

  -- =====================================================
  -- STEP 5: LOG THE RESET
  -- =====================================================
  INSERT INTO simulation_activity_log (
    simulation_id, user_id, action_type, action_details, notes
  )
  VALUES (
    p_simulation_id,
    auth.uid(),
    'simulation_reset',
    v_result,
    'Simulation reset for next session - status set to pending, ready for manual start'
  );

  RAISE NOTICE '🎉 Session reset complete!';

  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'status', 'pending',
    'message', 'Simulation reset successfully. Click Play to start when ready.',
    'restore_details', v_result,
    'restored_counts', COALESCE(v_result->'restored_counts', '{}'::jsonb),
    'patients_preserved', (SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant_id),
    'medications_preserved', (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = v_tenant_id)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

COMMENT ON FUNCTION reset_simulation_for_next_session IS
  'Reset simulation for next session. 2026-03-25: Added BBIT and advanced directives deletion.';

-- ============================================================================
-- FUNCTION 2: reset_simulation_with_template_updates
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_simulation_with_template_updates(
  p_simulation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_restore_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_template_version INT;
  v_patient_comparison JSONB;
  v_template_meds JSONB;
  v_template_med JSONB;
  v_meds_added INT := 0;
  v_med_exists BOOLEAN;
  v_med_id UUID;
  v_med_record RECORD;
  v_template_med_count INT := 0;
  v_sim_med_count INT := 0;
  v_meds_removed INT := 0;
  i INT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_dob TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔄 Starting template sync reset for simulation: %', p_simulation_id;
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  SELECT compare_simulation_template_patients(p_simulation_id) INTO v_patient_comparison;

  IF (v_patient_comparison->>'requires_relaunch')::boolean = true THEN
    RAISE EXCEPTION 'PATIENT_LIST_CHANGED: Cannot preserve barcodes - patient list changed.';
  END IF;

  RAISE NOTICE '✅ Patient lists match - barcodes can be preserved';

  SELECT
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data,
    st.snapshot_version
  INTO
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot,
    v_template_version
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  RAISE NOTICE '📋 Simulation Details:';
  RAISE NOTICE '  - Tenant ID: %', v_tenant_id;
  RAISE NOTICE '  - Template ID: %', v_template_id;
  RAISE NOTICE '  - Template Version: %', v_template_version;
  RAISE NOTICE '  - Snapshot medications: %', jsonb_array_length(v_snapshot->'patient_medications');

  FOR i IN 0..jsonb_array_length(v_snapshot->'patients') - 1 LOOP
    v_patient_id := ((v_snapshot->'patients')->i->>'id')::uuid;
    v_barcode := (v_snapshot->'patients')->i->>'patient_id';
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '🔗 Template patient % → Barcode %', v_patient_id, v_barcode;
  END LOOP;

  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK
  -- =====================================================

  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  UPDATE patient_medications SET last_administered = NULL WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  -- 🆕 BBIT entries
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  -- 🆕 Advanced directives
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;

  -- =====================================================
  -- STEP 3: SYNC MEDICATIONS FROM TEMPLATE
  -- =====================================================

  v_template_meds := v_snapshot->'patient_medications';
  IF v_template_meds IS NOT NULL THEN
    v_template_med_count := jsonb_array_length(v_template_meds);
    SELECT COUNT(*) INTO v_sim_med_count FROM patient_medications WHERE tenant_id = v_tenant_id;

    RAISE NOTICE '📋 Template has % medications, simulation currently has %', v_template_med_count, v_sim_med_count;

    FOR i IN 0..jsonb_array_length(v_template_meds) - 1 LOOP
      v_template_med := v_template_meds->i;

      SELECT
        pat.value->>'first_name',
        pat.value->>'last_name',
        pat.value->>'date_of_birth'
      INTO v_first_name, v_last_name, v_dob
      FROM jsonb_array_elements(v_snapshot->'patients') AS pat
      WHERE (pat.value->>'id')::uuid = (v_template_med->>'patient_id')::uuid;

      IF v_first_name IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication % - patient not found in snapshot', v_template_med->>'name';
        CONTINUE;
      END IF;

      SELECT id, patient_id INTO v_patient_id, v_barcode
      FROM patients
      WHERE tenant_id = v_tenant_id
        AND first_name = v_first_name
        AND last_name = v_last_name
        AND date_of_birth = v_dob::date;

      IF v_patient_id IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication - patient % % not found in simulation', v_first_name, v_last_name;
        CONTINUE;
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM patient_medications
        WHERE tenant_id = v_tenant_id
          AND patient_id = v_patient_id
          AND name = v_template_med->>'name'
          AND dosage = v_template_med->>'dosage'
          AND route = v_template_med->>'route'
      ) INTO v_med_exists;

      IF NOT v_med_exists THEN
        BEGIN
          INSERT INTO patient_medications (
            tenant_id, patient_id, name, dosage, route, frequency,
            admin_time, admin_times, category, start_date, end_date,
            next_due, prescribed_by, status, last_administered
          ) VALUES (
            v_tenant_id,
            v_patient_id,
            v_template_med->>'name',
            v_template_med->>'dosage',
            v_template_med->>'route',
            v_template_med->>'frequency',
            v_template_med->>'admin_time',
            v_template_med->'admin_times',
            v_template_med->>'category',
            (v_template_med->>'start_date')::date,
            CASE WHEN v_template_med->>'end_date' IS NOT NULL
                 THEN (v_template_med->>'end_date')::date
                 ELSE NULL END,
            CASE WHEN v_template_med->>'next_due' IS NOT NULL
                 THEN (v_template_med->>'next_due')::timestamptz
                 ELSE NULL END,
            v_template_med->>'prescribed_by',
            COALESCE(v_template_med->>'status', 'active'),
            NULL
          );
          v_meds_added := v_meds_added + 1;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '❌ ERROR inserting medication: % - %', v_template_med->>'name', SQLERRM;
        END;
      ELSE
        RAISE NOTICE '⏭️ Already exists: % for patient %', v_template_med->>'name', v_barcode;
      END IF;
    END LOOP;

    RAISE NOTICE '📊 MEDICATION SYNC: % new medications added', v_meds_added;
  END IF;

  -- =====================================================
  -- STEP 3B: DELETE REMOVED MEDICATIONS
  -- =====================================================

  FOR v_med_record IN
    SELECT pm.id, pm.name, pm.dosage, pm.route, p.first_name, p.last_name, p.date_of_birth
    FROM patient_medications pm
    JOIN patients p ON p.id = pm.patient_id
    WHERE pm.tenant_id = v_tenant_id
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_snapshot->'patient_medications') AS med
      JOIN jsonb_array_elements(v_snapshot->'patients') AS pat
        ON (pat.value->>'id')::uuid = (med.value->>'patient_id')::uuid
      WHERE med.value->>'name' = v_med_record.name
        AND med.value->>'dosage' = v_med_record.dosage
        AND med.value->>'route' = v_med_record.route
        AND pat.value->>'first_name' = v_med_record.first_name
        AND pat.value->>'last_name' = v_med_record.last_name
        AND (pat.value->>'date_of_birth')::date = v_med_record.date_of_birth
    ) THEN
      DELETE FROM patient_medications WHERE id = v_med_record.id;
      v_meds_removed := v_meds_removed + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '📊 REMOVED: % medications deleted from template', v_meds_removed;

  -- =====================================================
  -- STEP 4: RESTORE OTHER DATA FROM TEMPLATE
  -- =====================================================

  v_snapshot := v_snapshot - 'patient_medications';

  FOR v_patient_id, v_barcode IN
    SELECT id, patient_id FROM patients WHERE tenant_id = v_tenant_id ORDER BY created_at
  LOOP
    v_restore_barcodes := v_restore_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
  END LOOP;

  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_restore_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;

  -- =====================================================
  -- STEP 5: UPDATE STATUS & LOG
  -- =====================================================

  UPDATE simulation_active SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    template_snapshot_version_synced = v_template_version,
    updated_at = NOW()
  WHERE id = p_simulation_id;

  IF auth.uid() IS NOT NULL THEN
    INSERT INTO simulation_activity_log (
      simulation_id, user_id, action_type, action_details, notes
    ) VALUES (
      p_simulation_id, auth.uid(), 'synced_from_template',
      jsonb_build_object(
        'template_version', v_template_version,
        'meds_added', v_meds_added,
        'meds_removed', v_meds_removed
      ),
      format('Synced to template v%s: %s added, %s removed',
        v_template_version, v_meds_added, v_meds_removed)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'template_version_synced', v_template_version,
    'medications_added', v_meds_added,
    'medications_removed', v_meds_removed,
    'template_medication_count', v_template_med_count,
    'simulation_medication_count_before', v_sim_med_count,
    'simulation_medication_count_after', v_sim_med_count + v_meds_added - v_meds_removed
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during template sync reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION reset_simulation_with_template_updates TO authenticated;

COMMENT ON FUNCTION reset_simulation_with_template_updates IS
  'Smart template sync reset. 2026-03-25: Added BBIT and advanced directives deletion.';

-- ============================================================================
-- REGISTER NEW TABLES IN SIMULATION CONFIG (safe upsert)
-- ============================================================================
-- Ensures save_template_snapshot_v2 captures these tables in template snapshots
-- so baseline instructor-added BBIT/neuro entries survive reset.

INSERT INTO public.simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT
  'patient_bbit_entries', 'student_work', true, true, true, 5, true,
  'BBIT chart entries — captured in snapshot so template baseline entries survive reset'
WHERE NOT EXISTS (
  SELECT 1 FROM public.simulation_table_config WHERE table_name = 'patient_bbit_entries'
);

INSERT INTO public.simulation_table_config (
  table_name, category, has_patient_id, has_tenant_id,
  requires_id_mapping, delete_order, enabled, notes
)
SELECT
  'patient_neuro_assessments', 'student_work', true, true, true, 5, true,
  'Neurological assessment entries — deleted on reset'
WHERE NOT EXISTS (
  SELECT 1 FROM public.simulation_table_config WHERE table_name = 'patient_neuro_assessments'
);

SELECT '✅ Migration Complete' AS status,
       'Redeployed reset functions with BBIT + advanced directives deletes' AS description;
