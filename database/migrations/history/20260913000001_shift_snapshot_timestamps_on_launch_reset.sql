-- Migration: Re-base snapshot wall-clock timestamps at launch/reset time
-- Date: 2026-09-13
--
-- Bug: restore_snapshot_to_tenant() copies every non-id/tenant/patient/audit
-- column verbatim from a template's snapshot_data. I&O events, vitals,
-- neuro assessments, orders, lab panels, medication administration history/
-- next_due, wound treatments, etc. all carry the literal wall-clock date/time
-- of whenever the template (or named state) was last saved. Launching or
-- resetting a template built months earlier restores data still stamped with
-- that old date — e.g. the "last 8/12/24h" I&O window shows nothing because
-- every entry is months old.
--
-- Fix: shift EVERY timestamp/timestamptz column (except created_at/updated_at,
-- which already get a fresh DEFAULT now() since they're excluded from the
-- restore's column copy) across the WHOLE snapshot JSONB by a single fixed
-- interval = (restore instant - snapshot's own capture instant), applied
-- once right after the snapshot is loaded in launch_simulation(),
-- reset_simulation_for_next_session(), and reset_simulation_with_template_
-- updates(). This preserves the relative spacing between entries (so I&O
-- windows/vital trends still look sensible) while landing them around
-- "now" instead of the template's original build date. Applies uniformly to
-- past AND future-relative fields (e.g. wound_treatments.next_treatment_due),
-- since both are shifted by the same offset.
--
-- Deliberately schema-agnostic (auto-detects shiftable columns via
-- information_schema, same philosophy as restore_snapshot_to_tenant itself)
-- rather than a hand-maintained per-table list — this repo's own conventions
-- flag hand-maintained per-table lists as a recurring bug source. `patients`
-- naturally has nothing to shift: its only timestamptz columns are the
-- excluded created_at/updated_at, and admission_date/date_of_birth are plain
-- `date` columns (a separate, already-known, NOT addressed by this migration).
--
-- Anchor per source: the default snapshot uses simulation_templates.
-- snapshot_taken_at; a named state (e.g. "Week 3") uses that state's own
-- simulation_template_states.updated_at, since it was captured independently.
--
-- Scope check performed before writing this migration: compare_simulation_
-- vs_template/compare_simulation_template_patients only diff row COUNTS and
-- patient demographics (never per-row timestamps), and the medication sync in
-- reset_simulation_with_template_updates matches by name/dosage/route — none
-- of those are affected by shifted timestamps.

-- ============================================================================
-- STEP 1: New helper — shifts every shiftable timestamp column in a snapshot
-- ============================================================================
CREATE OR REPLACE FUNCTION public.shift_snapshot_timestamps(
  p_snapshot jsonb,
  p_shift interval
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_table_name text;
  v_actual_table_name text;
  v_shiftable_cols text[];
  v_rows jsonb;
  v_row jsonb;
  v_new_rows jsonb;
  i integer;
BEGIN
  IF p_shift IS NULL OR p_shift = interval '0' THEN
    RETURN p_snapshot;
  END IF;

  FOR v_table_name IN SELECT jsonb_object_keys(p_snapshot)
  LOOP
    IF v_table_name = 'snapshot_metadata' THEN
      CONTINUE;
    END IF;

    v_rows := p_snapshot->v_table_name;
    IF jsonb_typeof(v_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(v_rows) = 0 THEN
      CONTINUE;
    END IF;

    -- Same 'medications' -> 'patient_medications' alias restore_snapshot_to_tenant uses
    v_actual_table_name := CASE WHEN v_table_name = 'medications' THEN 'patient_medications' ELSE v_table_name END;

    SELECT array_agg(column_name) INTO v_shiftable_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = v_actual_table_name
      AND data_type IN ('timestamp with time zone', 'timestamp without time zone')
      AND column_name NOT IN ('created_at', 'updated_at');

    IF v_shiftable_cols IS NULL THEN
      CONTINUE;
    END IF;

    v_new_rows := '[]'::jsonb;
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows)
    LOOP
      FOR i IN 1..array_length(v_shiftable_cols, 1) LOOP
        IF v_row ? v_shiftable_cols[i] AND (v_row->v_shiftable_cols[i]) IS DISTINCT FROM 'null'::jsonb THEN
          v_row := jsonb_set(
            v_row,
            ARRAY[v_shiftable_cols[i]],
            to_jsonb(((v_row->>v_shiftable_cols[i])::timestamptz + p_shift))
          );
        END IF;
      END LOOP;
      v_new_rows := v_new_rows || jsonb_build_array(v_row);
    END LOOP;

    p_snapshot := jsonb_set(p_snapshot, ARRAY[v_table_name], v_new_rows);
  END LOOP;

  RETURN p_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.shift_snapshot_timestamps(jsonb, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shift_snapshot_timestamps(jsonb, interval) TO authenticated;

COMMENT ON FUNCTION public.shift_snapshot_timestamps(jsonb, interval) IS 'Shifts every timestamp/timestamptz column (except created_at/updated_at) across all tables in a snapshot JSONB by a fixed interval, preserving relative spacing. Used by launch_simulation/reset_simulation_for_next_session/reset_simulation_with_template_updates to re-base a template''s baked-in wall-clock times around the actual launch/reset instant.';

-- ============================================================================
-- STEP 2: launch_simulation() — shift right after resolving which snapshot to use
-- ============================================================================
CREATE OR REPLACE FUNCTION public.launch_simulation(
  p_template_id uuid,
  p_name text,
  p_duration_minutes integer,
  p_participant_user_ids uuid[],
  p_participant_roles text[] DEFAULT NULL::text[],
  p_primary_categories text[] DEFAULT '{}'::text[],
  p_sub_categories text[] DEFAULT '{}'::text[],
  p_state_id uuid DEFAULT NULL
) RETURNS TABLE(simulation_id uuid, tenant_id uuid, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_simulation_tenant_id UUID;
  v_home_tenant_id UUID;
  v_user_role TEXT;
  v_simulation_id UUID;
  v_snapshot JSONB;
  v_snapshot_anchor timestamptz;
  v_patient_count INTEGER;
  v_template_snapshot_version INTEGER;
BEGIN
  -- Get user's role from user_profiles
  SELECT up.role INTO v_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Get user's home tenant_id from user_tenant_access
  SELECT uta.tenant_id INTO v_home_tenant_id
  FROM user_tenant_access uta
  WHERE uta.user_id = auth.uid()
    AND uta.is_active = true
  LIMIT 1;
  
  -- Super admins without tenant: use first non-simulation tenant
  IF v_home_tenant_id IS NULL AND v_user_role = 'super_admin' THEN
    SELECT t.id INTO v_home_tenant_id
    FROM tenants t
    WHERE t.is_simulation = false
    ORDER BY t.created_at ASC
    LIMIT 1;
  END IF;

  -- Confirm the template exists (and grab its version regardless of which
  -- snapshot we end up launching from).
  SELECT st.snapshot_version
  INTO v_template_snapshot_version
  FROM simulation_templates st
  WHERE st.id = p_template_id;

  IF v_template_snapshot_version IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF p_state_id IS NOT NULL THEN
    SELECT sts.snapshot_data, sts.updated_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_template_states sts
    WHERE sts.id = p_state_id AND sts.template_id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this template: %', p_state_id;
    END IF;
  ELSE
    SELECT st.snapshot_data, st.snapshot_taken_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_templates st
    WHERE st.id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template has no snapshot data';
    END IF;
  END IF;

  -- Re-base wall-clock timestamps (I&O, vitals, orders, medication history/
  -- next_due, etc.) baked into the snapshot so they land relative to THIS
  -- launch instead of showing whenever the template/state was last saved.
  v_snapshot := shift_snapshot_timestamps(v_snapshot, now() - v_snapshot_anchor);

  -- Generate new simulation ID
  v_simulation_id := gen_random_uuid();

  -- Create new simulation tenant (temporary tenant for this simulation session)
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    parent_tenant_id,
    simulation_config,
    status
  )
  VALUES (
    'sim_active_' || p_name || '_' || extract(epoch from now())::text,
    'sim-act-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_active',
    true,
    v_home_tenant_id,
    jsonb_build_object(
      'template_id', p_template_id,
      'launched_at', now()
    ),
    'active'
  )
  RETURNING id INTO v_simulation_tenant_id;

  -- Restore snapshot to the NEW simulation tenant (creates patients and all baseline data)
  PERFORM restore_snapshot_to_tenant(
    p_tenant_id := v_simulation_tenant_id,
    p_snapshot := v_snapshot,
    p_preserve_barcodes := false
  );

  -- Count patients created
  SELECT COUNT(*) INTO v_patient_count
  FROM patients p
  WHERE p.tenant_id = v_simulation_tenant_id;

  -- Create simulation_active record with categories
  INSERT INTO simulation_active (
    id,
    tenant_id,
    template_id,
    name,
    duration_minutes,
    starts_at,
    ends_at,
    created_by,
    status,
    template_snapshot_version,
    template_snapshot_version_synced,
    primary_categories,
    sub_categories,
    current_state_id
  )
  VALUES (
    v_simulation_id,
    v_simulation_tenant_id,
    p_template_id,
    p_name,
    p_duration_minutes,
    NOW(),
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    auth.uid(),
    'running',
    v_template_snapshot_version,
    v_template_snapshot_version,  -- Launched at current template version
    p_primary_categories,
    p_sub_categories,
    p_state_id
  );

  RAISE NOTICE 'Simulation launched: % (%) with categories: Primary=[%], Sub=[%], state=%',
    v_simulation_id, p_name, 
    array_to_string(p_primary_categories, ', '), 
    array_to_string(p_sub_categories, ', '),
    p_state_id;

  -- Add the launching instructor to tenant_users so they can read all clinical
  -- tables when generating the debrief on completion.
  INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
  VALUES (auth.uid(), v_simulation_tenant_id, true, 'admin')
  ON CONFLICT ON CONSTRAINT tenant_users_tenant_id_user_id_key DO UPDATE
    SET is_active = true, role = 'admin';

  RAISE NOTICE '✅ Launching instructor added to simulation tenant_users for debrief access';

  -- Add participants if provided
  IF p_participant_user_ids IS NOT NULL AND array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1)
    LOOP
      -- Add to simulation_participants table
      INSERT INTO simulation_participants (
        simulation_id,
        user_id,
        role,
        granted_by
      )
      VALUES (
        v_simulation_id,
        p_participant_user_ids[i],
        COALESCE(p_participant_roles[i], 'student')::simulation_role,
        auth.uid()
      );
      
      -- Add to tenant_users for RLS access to simulation tenant data
      -- Map simulation roles to valid tenant_users roles: instructor→admin, student→nurse
      INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
      VALUES (
        p_participant_user_ids[i], 
        v_simulation_tenant_id, 
        true,
        CASE COALESCE(p_participant_roles[i], 'student')
          WHEN 'instructor' THEN 'admin'
          WHEN 'student' THEN 'nurse'
          ELSE 'nurse'
        END
      )
      ON CONFLICT ON CONSTRAINT tenant_users_tenant_id_user_id_key DO UPDATE
        SET is_active = true;
    END LOOP;
    
    RAISE NOTICE '✅ Added % participants to simulation with tenant access', array_length(p_participant_user_ids, 1);
  END IF;

  RETURN QUERY SELECT 
    v_simulation_id AS simulation_id,
    v_simulation_tenant_id AS tenant_id,
    format('Simulation "%s" launched successfully with %s patients', p_name, v_patient_count) AS message;
END;
$$;

GRANT EXECUTE ON FUNCTION public.launch_simulation(uuid, text, integer, uuid[], text[], text[], text[], uuid) TO authenticated;

COMMENT ON FUNCTION public.launch_simulation(uuid, text, integer, uuid[], text[], text[], text[], uuid) IS 'Launches a new active simulation from a template (or one of its named states). Re-bases the snapshot''s wall-clock timestamps (I&O/vitals/orders/meds/etc.) to land relative to the launch instant instead of the template''s original build date.';

-- ============================================================================
-- STEP 3: reset_simulation_for_next_session() — same anchor+shift, added
-- right after resolving which snapshot (default vs named state) to restore
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_simulation_for_next_session(
  p_simulation_id UUID,
  p_state_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_snapshot_anchor timestamptz;
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
    st.snapshot_data,
    st.snapshot_taken_at
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot,
    v_snapshot_anchor
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- If a named state was requested, use its snapshot instead of the template's default
  IF p_state_id IS NOT NULL THEN
    SELECT snapshot_data, updated_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_template_states
    WHERE id = p_state_id AND template_id = v_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this simulation''s template: %', p_state_id;
    END IF;

    RAISE NOTICE '📦 Using named state % for reset', p_state_id;
  END IF;

  -- Re-base wall-clock timestamps (I&O, vitals, orders, medication history, etc.)
  -- so they land relative to THIS reset instead of the template/state's original
  -- build date.
  v_snapshot := shift_snapshot_timestamps(v_snapshot, now() - v_snapshot_anchor);

  -- Save original snapshot (before we remove medications)
  v_snapshot_original := v_snapshot;

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
  
  -- 🔄 Reset medication administration timing (for back-to-back sessions)
  UPDATE patient_medications
  SET last_administered = NULL
  WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🔄 Reset % medication administration times for new session', v_count;
  
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
  
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % BBIT entries', v_count;
  
  DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % newborn assessments', v_count;

  -- 📋 Flowsheet system assessments: delete ONLY student entries.
  -- Instructor-set baseline entries (is_baseline = true) survive the reset so
  -- that clinical context (e.g. "patient has chronic pain, baseline 7/10")
  -- is still visible to students in the next session.
  DELETE FROM patient_system_assessments
  WHERE tenant_id = v_tenant_id
    AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % system assessments (student entries only, baseline preserved)', v_count;

  -- 🧩 TR module tables: delete student entries, preserve instructor baselines
  DELETE FROM tr_screening_entries WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR screening entries (student only)', v_count;

  DELETE FROM tr_active_living_profiles WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR active living profiles (student only)', v_count;

  DELETE FROM tr_assessment_scores WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR assessment scores (student only)', v_count;

  DELETE FROM tr_treatment_plan_rows WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR treatment plan rows (student only)', v_count;

  DELETE FROM tr_interdisciplinary_interps WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR interdisciplinary interpretations (student only)', v_count;

  DELETE FROM tr_progress_notes WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR progress notes', v_count;

  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % doctors orders', v_count;
  
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % handover notes', v_count;
  
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % advanced directives', v_count;
  
  DELETE FROM patient_admission_records WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % admission records', v_count;
  
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
  
  RAISE NOTICE '✅ All data deleted (except patients and medications)';

  -- =====================================================
  -- STEP 3: RESTORE FROM SNAPSHOT WITH BARCODE PRESERVATION
  -- =====================================================
  -- Remove medications from snapshot - they're preserved like patients
  -- KEEP patients in snapshot - restore function needs them to build patient mapping!
  v_snapshot := v_snapshot - 'patient_medications';
  RAISE NOTICE '💊 Removed medications from snapshot (preserved with their UUIDs)';

  -- Remove system assessments from snapshot - baseline rows are preserved
  -- in-place (is_baseline = true), so restoring from snapshot would duplicate them.
  v_snapshot := v_snapshot - 'patient_system_assessments';
  RAISE NOTICE '📋 Removed system assessments from snapshot (baseline rows preserved in-place)';

  -- Strip TR tables from snapshot — baseline rows preserved in-place
  v_snapshot := v_snapshot - 'tr_screening_entries';
  v_snapshot := v_snapshot - 'tr_active_living_profiles';
  v_snapshot := v_snapshot - 'tr_assessment_scores';
  v_snapshot := v_snapshot - 'tr_treatment_plan_rows';
  v_snapshot := v_snapshot - 'tr_interdisciplinary_interps';
  v_snapshot := v_snapshot - 'tr_progress_notes';
  RAISE NOTICE '🧩 Removed TR module tables from snapshot (baseline rows preserved in-place)';

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
  -- STEP 4: SET STATUS TO PENDING (Ready to start, NOT auto-start)
  -- =====================================================
  
  UPDATE simulation_active
  SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    completed_at = NULL,
    current_state_id = p_state_id,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  RAISE NOTICE '✅ Status set to PENDING - simulation ready to start manually';
  RAISE NOTICE '⏱️  Timer will be set when instructor clicks Play';

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
    CASE WHEN p_state_id IS NOT NULL
      THEN format('Simulation reset to template state %s - status set to pending, ready for manual start', p_state_id)
      ELSE 'Simulation reset for next session - status set to pending, ready for manual start'
    END
  );

  RAISE NOTICE '🎉 Session reset complete! Simulation ready to start.';
  
  -- Return success with pending status message and detailed restore info
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'status', 'pending',
    'state_id', p_state_id,
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

COMMENT ON FUNCTION reset_simulation_for_next_session(uuid, uuid) IS 'Reset simulation for next session - preserves patient/medication barcodes, sets status to pending (manual start required). Optional p_state_id resets into a named template state instead of the template''s default snapshot. Re-bases snapshot wall-clock timestamps to land relative to the reset instant.';

GRANT EXECUTE ON FUNCTION reset_simulation_for_next_session(uuid, uuid) TO authenticated;

-- ============================================================================
-- STEP 4: reset_simulation_with_template_updates() — shift added right after
-- resolving the snapshot, BEFORE the medication-sync loop reads next_due/
-- start_date/end_date and before the later restore_snapshot_to_tenant call
-- ============================================================================
DROP FUNCTION IF EXISTS reset_simulation_with_template_updates(UUID);
CREATE OR REPLACE FUNCTION reset_simulation_with_template_updates(
  p_simulation_id UUID,
  p_state_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_snapshot_anchor timestamptz;
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
  
  -- STEP 0: Check if patient lists match (CRITICAL VALIDATION)
  SELECT compare_simulation_template_patients(p_simulation_id) INTO v_patient_comparison;
  
  IF (v_patient_comparison->>'requires_relaunch')::boolean = true THEN
    RAISE EXCEPTION 'PATIENT_LIST_CHANGED: Cannot preserve barcodes - patient list changed.';
  END IF;
  
  RAISE NOTICE '✅ Patient lists match - barcodes can be preserved';
  
  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data,
    st.snapshot_version,
    st.snapshot_taken_at
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot,
    v_template_version,
    v_snapshot_anchor
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- If a named state was requested, use its snapshot instead of the template's default
  IF p_state_id IS NOT NULL THEN
    SELECT snapshot_data, updated_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_template_states
    WHERE id = p_state_id AND template_id = v_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this simulation''s template: %', p_state_id;
    END IF;

    RAISE NOTICE '📦 Using named state % for sync reset', p_state_id;
  END IF;

  -- Re-base wall-clock timestamps (I&O, vitals, orders, medication history/
  -- next_due, etc.) so they land relative to THIS reset instead of the
  -- template/state's original build date. Must happen BEFORE the medication
  -- sync loop below reads next_due/start_date/end_date off v_snapshot.
  v_snapshot := shift_snapshot_timestamps(v_snapshot, now() - v_snapshot_anchor);
  
  RAISE NOTICE '📋 Simulation Details:';
  RAISE NOTICE '  - Simulation ID: %', p_simulation_id;
  RAISE NOTICE '  - Tenant ID: %', v_tenant_id;
  RAISE NOTICE '  - Template ID: %', v_template_id;
  RAISE NOTICE '  - Template Version: %', v_template_version;
  RAISE NOTICE '  - Snapshot medications: %', jsonb_array_length(v_snapshot->'patient_medications');

  -- Build mapping: template patient UUID → barcode
  -- Extract from snapshot's patients array
  FOR i IN 0..jsonb_array_length(v_snapshot->'patients') - 1 LOOP
    v_patient_id := ((v_snapshot->'patients')->i->>'id')::uuid;
    v_barcode := (v_snapshot->'patients')->i->>'patient_id';
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '🔗 Template patient % → Barcode %', v_patient_id, v_barcode;
  END LOOP;

  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (keep meds & patients!)
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
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_admission_records WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;

  -- 📋 Flowsheet system assessments: delete ONLY student entries (was ON HOLD, now active)
  DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id AND is_baseline = false;

  -- 🧩 TR module tables: delete student entries, preserve instructor baselines
  DELETE FROM tr_screening_entries WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_active_living_profiles WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_assessment_scores WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_treatment_plan_rows WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_interdisciplinary_interps WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_progress_notes WHERE tenant_id = v_tenant_id;

  -- =====================================================
  -- STEP 3: INSERT NEW MEDICATIONS (Property-based matching)
  -- =====================================================
  -- Since simulation launch creates NEW UUIDs, we can't compare by ID
  -- Instead: match by patient barcode + medication properties
  -- New meds get NEW UUIDs = NEW barcodes (print labels for these only)
  
  v_template_meds := v_snapshot->'patient_medications';
  IF v_template_meds IS NOT NULL THEN
    v_template_med_count := jsonb_array_length(v_template_meds);
    
    -- Count existing meds BEFORE sync
    SELECT COUNT(*) INTO v_sim_med_count FROM patient_medications WHERE tenant_id = v_tenant_id;
    
    RAISE NOTICE '📋 Template has % medications, simulation currently has %', v_template_med_count, v_sim_med_count;
    
    FOR i IN 0..jsonb_array_length(v_template_meds) - 1 LOOP
      v_template_med := v_template_meds->i;
      
      -- Get template patient demographics (not barcode - barcodes change!)
      SELECT 
        pat.value->>'first_name',
        pat.value->>'last_name',
        pat.value->>'date_of_birth'
      INTO v_first_name, v_last_name, v_dob
      FROM jsonb_array_elements(v_snapshot->'patients') AS pat
      WHERE (pat.value->>'id')::uuid = (v_template_med->>'patient_id')::uuid;
      
      IF v_first_name IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication % - patient UUID % not found in snapshot', 
          v_template_med->>'name', v_template_med->>'patient_id';
        CONTINUE;
      END IF;
      
      RAISE NOTICE '🔍 Medication: % (%s %s) for patient % % (DOB: %)', 
        v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route',
        v_first_name, v_last_name, v_dob;
      
      -- Find simulation patient by demographics (NOT barcode!)
      SELECT id, patient_id INTO v_patient_id, v_barcode
      FROM patients 
      WHERE tenant_id = v_tenant_id 
        AND first_name = v_first_name
        AND last_name = v_last_name
        AND date_of_birth = v_dob::date;
      
      IF v_patient_id IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication - patient % % (DOB: %) not found in simulation', 
          v_first_name, v_last_name, v_dob;
        CONTINUE;
      END IF;
      
      RAISE NOTICE '   → Mapped to simulation patient % (barcode: %)', v_patient_id, v_barcode;
      
      -- Check if medication exists by properties (name, dosage, route for this patient)
      SELECT EXISTS (
        SELECT 1 FROM patient_medications
        WHERE tenant_id = v_tenant_id 
          AND patient_id = v_patient_id
          AND name = v_template_med->>'name'
          AND dosage = v_template_med->>'dosage'
          AND route = v_template_med->>'route'
      ) INTO v_med_exists;
      
      IF NOT v_med_exists THEN
        RAISE NOTICE '➕ Adding new medication: % %mg %s for patient %', 
          v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route', v_barcode;
        
        BEGIN
          -- Insert with NEW UUID. Copy catalog_id + barcode from template so
          -- physical QR labels printed for this medication remain valid.
          INSERT INTO patient_medications (
            tenant_id, patient_id, name, dosage, route, frequency,
            admin_time, admin_times, category, start_date, end_date,
            next_due, prescribed_by, status, last_administered,
            catalog_id, barcode
          ) VALUES (
            v_tenant_id,
            v_patient_id,  -- Mapped to simulation patient
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
            NULL,  -- last_administered
            CASE WHEN v_template_med->>'catalog_id' IS NOT NULL
                 THEN (v_template_med->>'catalog_id')::uuid
                 ELSE NULL END,
            v_template_med->>'barcode'  -- NULL for free-entry meds
          );
          
          v_meds_added := v_meds_added + 1;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '❌ ERROR inserting medication: % - Error: %', v_template_med->>'name', SQLERRM;
        END;
      ELSE
        RAISE NOTICE '⏭️ Already exists: % for patient %', v_template_med->>'name', v_barcode;
      END IF;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 MEDICATION SYNC: % new medications added', v_meds_added;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  END IF;

  -- =====================================================
  -- STEP 3B: DELETE REMOVED MEDICATIONS
  -- =====================================================
  -- Find sim medications that DON'T exist in template and delete them
  -- Preserves medication_administrations (student work history)
  
  RAISE NOTICE '🔍 Checking for medications removed from template...';
  
  FOR v_med_record IN 
    SELECT pm.id, pm.name, pm.dosage, pm.route, p.first_name, p.last_name, p.date_of_birth
    FROM patient_medications pm
    JOIN patients p ON p.id = pm.patient_id
    WHERE pm.tenant_id = v_tenant_id
  LOOP
    -- Check if this medication exists in template
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
      RAISE NOTICE '➖ Removing deleted medication: % % %s for patient % %', 
        v_med_record.name, v_med_record.dosage, v_med_record.route,
        v_med_record.first_name, v_med_record.last_name;
      
      DELETE FROM patient_medications WHERE id = v_med_record.id;
      v_meds_removed := v_meds_removed + 1;
    END IF;
  END LOOP;
  
  IF v_meds_removed > 0 THEN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REMOVED: % medications deleted from template', v_meds_removed;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '✅ No medications removed from template';
  END IF;

  -- =====================================================
  -- STEP 4: RESTORE OTHER DATA FROM TEMPLATE
  -- =====================================================
  
  -- Remove patient_medications from snapshot (we handled it above)
  v_snapshot := v_snapshot - 'patient_medications';

  -- Strip PSA and TR tables — baseline rows preserved in-place, restore would duplicate
  v_snapshot := v_snapshot - 'patient_system_assessments';
  v_snapshot := v_snapshot - 'tr_screening_entries';
  v_snapshot := v_snapshot - 'tr_active_living_profiles';
  v_snapshot := v_snapshot - 'tr_assessment_scores';
  v_snapshot := v_snapshot - 'tr_treatment_plan_rows';
  v_snapshot := v_snapshot - 'tr_interdisciplinary_interps';
  v_snapshot := v_snapshot - 'tr_progress_notes';

  -- Build barcode mapping for restore_snapshot_to_tenant (sim patient UUID → barcode)
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
  -- STEP 5: UPDATE SIMULATION STATUS & LOG
  -- =====================================================
  
  UPDATE simulation_active SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    template_snapshot_version_synced = v_template_version,
    current_state_id = p_state_id,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  -- Only log if we have an authenticated user (skip during direct SQL testing)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO simulation_activity_log (
      simulation_id, user_id, action_type, action_details, notes
    ) VALUES (
      p_simulation_id, auth.uid(), 'synced_from_template',
      jsonb_build_object(
        'template_version', v_template_version,
        'state_id', p_state_id,
        'meds_added', v_meds_added,
        'meds_removed', v_meds_removed
      ),
      format('Synced to template v%s%s: %s added, %s removed', 
        v_template_version,
        CASE WHEN p_state_id IS NOT NULL THEN format(' (state %s)', p_state_id) ELSE '' END,
        v_meds_added, v_meds_removed)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_version_synced', v_template_version,
    'state_id', p_state_id,
    'medications_added', v_meds_added,
    'medications_removed', v_meds_removed,
    'template_medication_count', v_template_med_count,
    'simulation_medication_count_before', v_sim_med_count,
    'simulation_medication_count_after', v_sim_med_count + v_meds_added - v_meds_removed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION reset_simulation_with_template_updates(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION reset_simulation_with_template_updates(uuid, uuid) IS 'Smart template sync: Matches medications by properties (patient+name+dosage+route), not UUIDs. Inserts NEW medications with NEW UUIDs/barcodes. Instructor prints labels for newly added medications only. Existing medication barcodes unchanged. Optional p_state_id syncs from a named template state instead of the template''s default snapshot. Re-bases snapshot wall-clock timestamps to land relative to the reset instant.';
