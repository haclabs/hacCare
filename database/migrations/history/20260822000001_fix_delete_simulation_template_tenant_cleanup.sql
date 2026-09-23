-- Migration: Fix deleteSimulationTemplate() to actually delete the tenant
-- Date: 2026-08-22
--
-- Bug: deleteSimulationTemplate() (src/services/simulation/templateService.ts) does a
-- raw `DELETE FROM simulation_templates WHERE id = X`. That's it. It never touches the
-- `tenants` row backing the template (tenant_type = 'simulation_template'), so:
--   1. The tenant row (and everything in it: patients, meds, notes, etc.) is orphaned
--      forever — "not removing the template from the database".
--   2. `patients.tenant_id` is `ON DELETE SET NULL` (not CASCADE) back to `tenants`, and
--      several clinical tables (patient_medications, patient_alerts, patient_images,
--      medication_administrations) have NO cascade behavior at all — so even a direct
--      `DELETE FROM tenants` would either silently NULL out patient.tenant_id (patient
--      floats around with no tenant — "showing up when not in a tenant specifically")
--      or fail outright with a foreign key violation, depending on what data exists.
--
-- There WAS a `delete_simulation_template()` RPC (created 20260125, dropped 20260427 as
-- "dead code" since nothing called it via supabase.rpc()) — but even that old function
-- had the identical bug: `DELETE FROM simulation_templates WHERE id = p_template_id;`
-- and nothing else. So this has never actually worked correctly.
--
-- Fix: new `delete_simulation_template()` RPC that mirrors the already-correct,
-- production-proven `delete_simulation()` pattern (delete_simulation.sql) — explicitly
-- delete all tenant-scoped clinical data (children before parents), then patients, then
-- tenant_users, then the simulation_templates row, then the tenant row itself.
-- templateService.ts now calls this RPC instead of a raw table delete.

CREATE OR REPLACE FUNCTION public.delete_simulation_template(
  p_template_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_template_name text;
  v_tenant_id uuid;
  v_active_simulations_count integer;
  v_deleted_patients integer := 0;
BEGIN
  SELECT name, tenant_id INTO v_template_name, v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;

  IF v_template_name IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Warn (but don't block) if simulations launched from this template still exist
  SELECT COUNT(*) INTO v_active_simulations_count
  FROM simulation_active
  WHERE template_id = p_template_id;

  IF v_active_simulations_count > 0 THEN
    RAISE WARNING 'Template % has % active simulations that will continue running',
      v_template_name, v_active_simulations_count;
  END IF;

  IF v_tenant_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_deleted_patients FROM patients WHERE tenant_id = v_tenant_id;

    -- Delete all tenant-scoped clinical data, children before parents.
    -- Wrapped per-table so a schema change (new/renamed table) can't block the whole delete.
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

    -- Patients last (referenced by most of the above)
    DELETE FROM patients WHERE tenant_id = v_tenant_id;

    -- Tenant membership + the template row, then the tenant itself
    DELETE FROM tenant_users WHERE tenant_id = v_tenant_id;
    DELETE FROM simulation_templates WHERE id = p_template_id;
    DELETE FROM tenants WHERE id = v_tenant_id;
  ELSE
    -- No tenant on record (shouldn't normally happen) — just remove the metadata row
    DELETE FROM simulation_templates WHERE id = p_template_id;
  END IF;

  RAISE NOTICE 'Deleted template % (%) with tenant % — removed % patients',
    p_template_id, v_template_name, v_tenant_id, v_deleted_patients;

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'template_name', v_template_name,
    'tenant_id', v_tenant_id,
    'deleted_patients', v_deleted_patients,
    'active_simulations_warning', v_active_simulations_count > 0,
    'active_simulations_count', v_active_simulations_count
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_simulation_template TO authenticated;

COMMENT ON FUNCTION public.delete_simulation_template IS
'Deletes a simulation template AND its backing tenant (patients, meds, notes, everything).
Mirrors the delete_simulation() pattern since patients.tenant_id is ON DELETE SET NULL
(not CASCADE) and several clinical tables have no cascade at all, so a raw tenant delete
would either orphan patients (tenant_id -> NULL) or fail with a FK violation.
Warns (does not block) if active simulations still reference this template.
Uses SECURITY DEFINER to bypass RLS for complete cleanup.';
