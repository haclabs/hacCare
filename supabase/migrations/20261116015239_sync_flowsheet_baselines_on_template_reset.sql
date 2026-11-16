-- ============================================================================
-- "Reset with template updates" now brings in template flowsheet baselines
-- ============================================================================
-- reset_simulation_with_template_updates kept a simulation's flowsheet
-- baselines in place and left patient_system_assessments out of the snapshot
-- restore, so baselines an instructor added or edited in the template after
-- launch never reached the simulation.
--
-- Now, when the snapshot captured flowsheets, the simulation's flowsheet rows
-- are replaced with the snapshot's baselines. Each is attached to the
-- simulation patient with the same first name, last name and date of birth
-- (launch gives patients new UUIDs and barcodes, so those can't be matched).
-- The patients table is only read, so patient barcodes never change.
--
-- Snapshots saved before flowsheets were captured have no
-- patient_system_assessments key; for those, only student entries are deleted,
-- as before, so existing baselines are not lost.
--
-- reset_simulation_for_next_session is unchanged. The live definition is
-- edited in place so the access guard and everything else stay as deployed.
-- ============================================================================

DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.reset_simulation_with_template_updates(uuid, uuid)'::regprocedure);
  v_new := regexp_replace(
    v_def,
    '[ \t]*DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id AND is_baseline = false;\r?\n',
    $blk$
  IF jsonb_typeof(v_snapshot->'patient_system_assessments') = 'array' THEN
    DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id;
    -- Match by name + DOB, never UUID or barcode; patients is only read.
    INSERT INTO patient_system_assessments (
      patient_id, tenant_id, system_type, assessment_data,
      nurse_id, nurse_name, recorded_at, is_baseline
    )
    SELECT sp.id, v_tenant_id, e->>'system_type', COALESCE(e->'assessment_data', '{}'::jsonb),
           NULLIF(e->>'nurse_id', '')::uuid, e->>'nurse_name',
           COALESCE((e->>'recorded_at')::timestamptz, now()), true
    FROM jsonb_array_elements(v_snapshot->'patient_system_assessments') e
    JOIN jsonb_array_elements(v_snapshot->'patients') tp ON tp->>'id' = e->>'patient_id'
    JOIN patients sp ON sp.tenant_id = v_tenant_id
                    AND sp.first_name = tp->>'first_name'
                    AND sp.last_name = tp->>'last_name'
                    AND sp.date_of_birth = (tp->>'date_of_birth')::date;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Flowsheet baselines restored from template: %', v_count;
  ELSE
    -- Snapshot predates flowsheet capture: keep the simulation's baselines.
    DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id AND is_baseline = false;
  END IF;
$blk$
  );
  IF v_new = v_def
     OR v_new !~ 'Flowsheet baselines restored from template'
     OR v_new !~ 'PERFORM public\.assert_can_manage_simulation'
     OR v_new !~ 'v_snapshot := v_snapshot - ''patient_system_assessments'''
     OR v_new ~ 'UPDATE patients' THEN
    RAISE EXCEPTION 'reset_simulation_with_template_updates: unexpected definition, flowsheet sync not applied';
  END IF;
  EXECUTE v_new;
END $$;
