-- ============================================================================
-- PATIENT TEMPLATES (reusable single-patient library)
-- ============================================================================
-- New feature: instructors (scoped to their program, same as simulation
-- templates) or super_admin can build a library of single-patient templates,
-- each backed by its own dedicated tenant for live editing (same
-- enter-tenant/save-snapshot workflow as simulation templates). A patient
-- template can then be copied into a simulation template any number of times,
-- always minting a fresh patient UUID + barcode on each copy so the same
-- library patient can be reused across multiple simulation templates/groups
-- without collisions. Copy-once semantics: no live sync back to templates
-- that already copied a patient template.
--
-- Reuses existing generic machinery unchanged:
--   - restore_snapshot_to_tenant: already purely additive (no deletes) and
--     already mints a fresh patient id + fresh random barcode when
--     p_preserve_barcodes=false, so it works as-is to append a library
--     patient into an existing simulation template tenant.
--   - simulation_template_status enum: reused for patient_templates.status.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE public.patient_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  tenant_id uuid NOT NULL,
  status public.simulation_template_status DEFAULT 'draft'::public.simulation_template_status,
  snapshot_data jsonb DEFAULT '{}'::jsonb,
  snapshot_taken_at timestamp with time zone,
  primary_categories text[] DEFAULT '{}'::text[],
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_templates_description_not_blank CHECK (btrim(description) <> '')
);

COMMENT ON TABLE public.patient_templates IS 'Reusable single-patient templates. Each has its own dedicated tenant for live editing; snapshot_data is copied (never synced) into simulation templates via add_patient_template_to_simulation_template().';

CREATE INDEX idx_patient_templates_tenant_id ON public.patient_templates USING btree (tenant_id);
CREATE INDEX idx_patient_templates_primary_categories ON public.patient_templates USING gin (primary_categories);

ALTER TABLE public.patient_templates ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES — mirrors simulation_templates' templates_select/insert/update/delete
-- ----------------------------------------------------------------------------
CREATE POLICY patient_templates_select ON public.patient_templates FOR SELECT TO authenticated USING (
  (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role])))
  OR (EXISTS (SELECT 1 FROM public.user_profiles up JOIN public.tenant_users tu ON tu.user_id = up.id WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'::public.user_role AND tu.tenant_id = patient_templates.tenant_id AND tu.is_active = true))
  OR (
    (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::public.user_role))
    AND (
      patient_templates.primary_categories IS NULL
      OR patient_templates.primary_categories = '{}'::text[]
      OR EXISTS (SELECT 1 FROM public.user_programs up_prog JOIN public.programs prog ON prog.id = up_prog.program_id WHERE up_prog.user_id = (SELECT auth.uid()) AND prog.code = ANY (patient_templates.primary_categories))
    )
  )
);

CREATE POLICY patient_templates_insert_policy ON public.patient_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))
);

CREATE POLICY patient_templates_update ON public.patient_templates FOR UPDATE TO authenticated USING (
  created_by = (SELECT auth.uid())
  OR (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role])))
  OR (EXISTS (SELECT 1 FROM public.user_profiles up JOIN public.tenant_users tu ON tu.user_id = up.id WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'::public.user_role AND tu.tenant_id = patient_templates.tenant_id AND tu.is_active = true))
  OR (
    (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::public.user_role))
    AND (
      patient_templates.primary_categories IS NULL
      OR patient_templates.primary_categories = '{}'::text[]
      OR EXISTS (SELECT 1 FROM public.user_programs up_prog JOIN public.programs prog ON prog.id = up_prog.program_id WHERE up_prog.user_id = (SELECT auth.uid()) AND prog.code = ANY (patient_templates.primary_categories))
    )
  )
) WITH CHECK (
  created_by = (SELECT auth.uid())
  OR (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role])))
  OR (EXISTS (SELECT 1 FROM public.user_profiles up JOIN public.tenant_users tu ON tu.user_id = up.id WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'::public.user_role AND tu.tenant_id = patient_templates.tenant_id AND tu.is_active = true))
  OR (
    (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::public.user_role))
    AND (
      patient_templates.primary_categories IS NULL
      OR patient_templates.primary_categories = '{}'::text[]
      OR EXISTS (SELECT 1 FROM public.user_programs up_prog JOIN public.programs prog ON prog.id = up_prog.program_id WHERE up_prog.user_id = (SELECT auth.uid()) AND prog.code = ANY (patient_templates.primary_categories))
    )
  )
);

CREATE POLICY patient_templates_delete ON public.patient_templates FOR DELETE TO authenticated USING (
  created_by = (SELECT auth.uid())
  OR (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role])))
  OR (EXISTS (SELECT 1 FROM public.user_profiles up JOIN public.tenant_users tu ON tu.user_id = up.id WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'::public.user_role AND tu.tenant_id = patient_templates.tenant_id AND tu.is_active = true))
  OR (
    (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::public.user_role))
    AND (
      patient_templates.primary_categories IS NULL
      OR patient_templates.primary_categories = '{}'::text[]
      OR EXISTS (SELECT 1 FROM public.user_programs up_prog JOIN public.programs prog ON prog.id = up_prog.program_id WHERE up_prog.user_id = (SELECT auth.uid()) AND prog.code = ANY (patient_templates.primary_categories))
    )
  )
);

-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------

-- Creates a patient template + its dedicated tenant. Mirrors create_simulation_template.
-- p_description is required (patient_templates.description is NOT NULL) so the
-- library list can show instructors what scenario each patient represents.
CREATE FUNCTION public.create_patient_template(
  p_name text,
  p_description text,
  p_primary_categories text[] DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_template_id UUID;
  v_subdomain TEXT;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  IF p_description IS NULL OR btrim(p_description) = '' THEN
    RETURN json_build_object('success', false, 'message', 'Description is required');
  END IF;

  v_subdomain := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
  v_subdomain := 'pt-' || substring(v_subdomain, 1, 20) || '-' || substring(gen_random_uuid()::text, 1, 8);

  INSERT INTO tenants (name, subdomain, tenant_type, is_simulation, status)
  VALUES (p_name || ' (Patient Template)', v_subdomain, 'patient_template', true, 'active')
  RETURNING id INTO v_tenant_id;

  INSERT INTO patient_templates (tenant_id, name, description, primary_categories, status, created_by)
  VALUES (v_tenant_id, p_name, p_description, p_primary_categories, 'draft', v_current_user_id)
  RETURNING id INTO v_template_id;

  INSERT INTO tenant_users (tenant_id, user_id, role, is_active)
  VALUES (v_tenant_id, v_current_user_id, 'admin', true);

  RETURN json_build_object(
    'success', true,
    'patient_template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Patient template created successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.create_patient_template(text, text, text[]) IS 'Creates a new single-patient template with its own dedicated tenant for live editing. Description is required. Mirrors create_simulation_template.';

-- Schema-agnostic snapshot capture for a patient template's tenant. Mirrors
-- save_template_snapshot_v2 exactly, writing to patient_templates instead of
-- simulation_templates, and excluding patient_templates itself from capture
-- (its own tenant_id column would otherwise self-match).
CREATE FUNCTION public.save_patient_template_snapshot(p_patient_template_id uuid) RETURNS jsonb
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
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM patient_templates
  WHERE id = p_patient_template_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient template not found: %', p_patient_template_id;
  END IF;

  -- STEP 1: tables with tenant_id
  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name <> 'patient_templates'
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

  -- STEP 2: tables linked via patient_id only (no tenant_id column)
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

  UPDATE patient_templates
  SET
    snapshot_data = v_snapshot,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_patient_template_id;

  RETURN jsonb_build_object(
    'success', true,
    'patient_template_id', p_patient_template_id,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Patient template snapshot saved successfully'
  );
END;
$_$;

COMMENT ON FUNCTION public.save_patient_template_snapshot(uuid) IS 'Schema-agnostic snapshot creation for patient templates. Mirrors save_template_snapshot_v2 but targets patient_templates.';

-- Copies a patient template's single patient (+ all clinical children) into a
-- simulation template's tenant. Always mints a fresh patient uuid + fresh
-- barcode (p_preserve_barcodes=false) so the same library patient can be
-- reused across many simulation templates without collisions.
-- restore_snapshot_to_tenant is purely additive (never deletes), so this is
-- safe to call repeatedly against a simulation template that already has
-- other patients.
-- admission_date is always stamped to CURRENT_DATE on the newly-copied patient
-- (not carried over from the library patient) since a patient template may sit
-- in the library for months before being reused — the date should reflect when
-- it was actually added to the simulation template, not when it was authored.
CREATE FUNCTION public.add_patient_template_to_simulation_template(
  p_patient_template_id uuid,
  p_simulation_template_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_snapshot jsonb;
  v_target_tenant_id uuid;
  v_patient_ids_before uuid[];
  v_patient_ids_after uuid[];
  v_new_patient_ids uuid[];
BEGIN
  SELECT snapshot_data INTO v_snapshot
  FROM patient_templates
  WHERE id = p_patient_template_id;

  IF v_snapshot IS NULL OR v_snapshot = '{}'::jsonb THEN
    RETURN json_build_object('success', false, 'message', 'Patient template has no saved snapshot yet — save it before adding it to a simulation template');
  END IF;

  SELECT tenant_id INTO v_target_tenant_id
  FROM simulation_templates
  WHERE id = p_simulation_template_id;

  IF v_target_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Simulation template not found');
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_patient_ids_before
  FROM patients WHERE tenant_id = v_target_tenant_id;

  PERFORM restore_snapshot_to_tenant(
    p_tenant_id := v_target_tenant_id,
    p_snapshot := v_snapshot,
    p_preserve_barcodes := false
  );

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_patient_ids_after
  FROM patients WHERE tenant_id = v_target_tenant_id;

  SELECT COALESCE(array_agg(pid), ARRAY[]::uuid[]) INTO v_new_patient_ids
  FROM unnest(v_patient_ids_after) pid
  WHERE pid <> ALL(v_patient_ids_before);

  IF array_length(v_new_patient_ids, 1) > 0 THEN
    UPDATE patients SET admission_date = CURRENT_DATE WHERE id = ANY(v_new_patient_ids);
  END IF;

  RETURN json_build_object(
    'success', true,
    'simulation_template_id', p_simulation_template_id,
    'tenant_id', v_target_tenant_id,
    'patients_added', COALESCE(array_length(v_new_patient_ids, 1), 0),
    'message', 'Patient added to simulation template'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.add_patient_template_to_simulation_template(uuid, uuid) IS 'Copies a patient template''s single patient + all clinical data into a simulation template''s tenant, minting a fresh patient id/barcode and stamping admission_date to CURRENT_DATE each time. Copy-once — no ongoing sync back to the patient template.';

-- Deletes a patient template AND its backing tenant. Mirrors delete_simulation_template.
CREATE FUNCTION public.delete_patient_template(p_patient_template_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_template_name text;
  v_tenant_id uuid;
  v_deleted_patients integer := 0;
BEGIN
  SELECT name, tenant_id INTO v_template_name, v_tenant_id
  FROM patient_templates
  WHERE id = p_patient_template_id;

  IF v_template_name IS NULL THEN
    RAISE EXCEPTION 'Patient template not found: %', p_patient_template_id;
  END IF;

  IF v_tenant_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_deleted_patients FROM patients WHERE tenant_id = v_tenant_id;

    BEGIN DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_notes WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_images WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_treatments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM device_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_results WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_panels WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_ack_events WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_orders WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_admission_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_screening_entries WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_active_living_profiles WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_assessment_scores WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_treatment_plan_rows WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_interdisciplinary_interps WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_progress_notes WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM bowel_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_intake_output_events WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wounds WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM devices WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_medications WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;

    DELETE FROM patients WHERE tenant_id = v_tenant_id;
    DELETE FROM tenant_users WHERE tenant_id = v_tenant_id;
    DELETE FROM patient_templates WHERE id = p_patient_template_id;
    DELETE FROM tenants WHERE id = v_tenant_id;
  ELSE
    DELETE FROM patient_templates WHERE id = p_patient_template_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'patient_template_id', p_patient_template_id,
    'template_name', v_template_name,
    'tenant_id', v_tenant_id,
    'deleted_patients', v_deleted_patients
  );
END;
$function$;

COMMENT ON FUNCTION public.delete_patient_template(uuid) IS 'Deletes a patient template AND its backing tenant (patients, meds, notes, everything). Mirrors delete_simulation_template. Uses SECURITY DEFINER to bypass RLS for complete cleanup.';
