-- Migration: Named "weekly states" for simulation templates
-- Date: 2026-09-12
--
-- Lets an instructor save multiple named snapshots of a template (e.g. "Week 1",
-- "Week 2 - Deterioration") and pick which one to load when RESETTING an active
-- simulation — without ever touching patient/medication barcodes (the existing
-- barcode-preserving restore_snapshot_to_tenant(..., p_preserve_barcodes := true)
-- path is reused unchanged; only the source snapshot JSONB changes).
--
-- Replaces the old auto-archive-on-every-save version history
-- (simulation_template_versions / save_template_version / restore_template_version /
-- compare_template_versions). That system had ZERO UI consumers on the read/
-- restore/compare side (verified via grep across src/ 2026-09-12) — every save
-- silently archived a version nobody ever looked at. It also modeled a
-- different problem (linear undo history that overwrites "current") rather
-- than named, independently-selectable scenario states.

-- ============================================================================
-- STEP 1: Drop the old unused version-history system
-- ============================================================================
DROP FUNCTION IF EXISTS public.compare_template_versions(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.restore_template_version(uuid, integer, uuid, text);
DROP FUNCTION IF EXISTS public.save_template_version(uuid, jsonb, text, uuid);
DROP TABLE IF EXISTS public.simulation_template_versions;

-- ============================================================================
-- STEP 2: New named-states table
-- ============================================================================
CREATE TABLE public.simulation_template_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.simulation_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  changelog_note text,
  snapshot_data jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT simulation_template_states_label_unique UNIQUE (template_id, label)
);

CREATE INDEX idx_template_states_template ON public.simulation_template_states(template_id, sort_order);

COMMENT ON TABLE public.simulation_template_states IS 'Instructor-named snapshot states per template (e.g. "Week 1", "Week 2"), independently selectable when resetting an active simulation.';

ALTER TABLE public.simulation_template_states ENABLE ROW LEVEL SECURITY;

-- Mirrors the tenant_users membership check used by enterTemplateTenant() for
-- template editing access (see TemplateEditingBanner / TenantContext), plus
-- the standard super_admin/coordinator bypass.
CREATE POLICY template_states_select ON public.simulation_template_states
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = simulation_template_states.tenant_id
        AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator')
    )
  );

CREATE POLICY template_states_insert ON public.simulation_template_states
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = simulation_template_states.tenant_id
        AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator')
    )
  );

CREATE POLICY template_states_update ON public.simulation_template_states
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = simulation_template_states.tenant_id
        AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = simulation_template_states.tenant_id
        AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator')
    )
  );

CREATE POLICY template_states_delete ON public.simulation_template_states
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = simulation_template_states.tenant_id
        AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator')
    )
  );

-- ============================================================================
-- STEP 3: save_template_state() — capture the template tenant's current data
-- as a new named state. Mirrors save_template_snapshot_v2's auto-discovery
-- capture loop (already excludes tenant_users/programs admin metadata).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_template_state(
  p_template_id uuid,
  p_label text,
  p_changelog_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
  v_state_id uuid;
  v_state_count integer;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF p_label IS NULL OR trim(p_label) = '' THEN
    RAISE EXCEPTION 'A label is required to save a template state';
  END IF;

  SELECT COUNT(*) INTO v_state_count FROM simulation_template_states WHERE template_id = p_template_id;
  IF v_state_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum of 10 states per template reached');
  END IF;

  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name NOT IN ('tenant_users', 'programs')
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  FOR v_table_record IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2
      WHERE c2.table_name = t.table_name
      AND c2.column_name = 'tenant_id'
    )
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      JOIN patients p ON p.id = t.patient_id
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', auth.uid(),
      'tenant_id', v_tenant_id,
      'total_tables_scanned', v_total_tables,
      'total_records_captured', v_total_records,
      'schema_version', '2.0'
    )
  );

  BEGIN
    INSERT INTO simulation_template_states (
      tenant_id, template_id, label, changelog_note, snapshot_data, sort_order, created_by
    ) VALUES (
      v_tenant_id, p_template_id, trim(p_label), p_changelog_note, v_snapshot, v_state_count, auth.uid()
    )
    RETURNING id INTO v_state_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'A state with that label already exists for this template');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'state_id', v_state_id,
    'template_id', p_template_id,
    'label', p_label,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Template state saved successfully'
  );
END;
$_$;

COMMENT ON FUNCTION public.save_template_state(uuid, text, text) IS 'Captures the template tenant''s current clinical data as a new named state (e.g. "Week 2"), independent of the template''s default snapshot_data.';

GRANT EXECUTE ON FUNCTION public.save_template_state(uuid, text, text) TO authenticated;

-- ============================================================================
-- STEP 4: reset_simulation_for_next_session — add optional p_state_id
-- ============================================================================
-- CREATE OR REPLACE with a different parameter list creates a new overload
-- rather than replacing the old one — drop the old single-arg signature first
-- to avoid "function name is not unique" ambiguity errors on later calls.
DROP FUNCTION IF EXISTS reset_simulation_for_next_session(UUID);

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

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- If a named state was requested, use its snapshot instead of the template's default
  IF p_state_id IS NOT NULL THEN
    SELECT snapshot_data INTO v_snapshot
    FROM simulation_template_states
    WHERE id = p_state_id AND template_id = v_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this simulation''s template: %', p_state_id;
    END IF;

    RAISE NOTICE '📦 Using named state % for reset', p_state_id;
  END IF;

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

COMMENT ON FUNCTION reset_simulation_for_next_session(uuid, uuid) IS 'Reset simulation for next session - preserves patient/medication barcodes, sets status to pending (manual start required). Optional p_state_id resets into a named template state instead of the template''s default snapshot.';

GRANT EXECUTE ON FUNCTION reset_simulation_for_next_session(uuid, uuid) TO authenticated;
