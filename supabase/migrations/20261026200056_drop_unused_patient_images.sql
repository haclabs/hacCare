-- Drop the unused patient_images table.
--
-- Patient photos are stored inline on patients.photo_data (with illustrated avatars as the
-- fallback); patient_images was only written by an unrouted annotation component that has been
-- removed, and the patient-images storage bucket it relied on never existed. The table is empty.
--
-- Two reset functions still DELETE from it without an undefined_table guard, so they are
-- redeployed first with just those statements removed. The live definition is edited in place
-- (rather than retyped) so the access guard and everything else stay exactly as deployed.
-- delete_simulation, delete_simulation_template and delete_patient_template already wrap their
-- patient_images deletes in EXCEPTION WHEN undefined_table, so they are left untouched.
-- Snapshot / restore / template-state functions discover tables from information_schema, and no
-- stored snapshot contains a patient_images key.

DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.reset_simulation_for_next_session(uuid, uuid)'::regprocedure);
  v_new := regexp_replace(
    v_def,
    '[ \t]*DELETE FROM patient_images WHERE tenant_id = v_tenant_id;\r?\n'
    '[ \t]*GET DIAGNOSTICS v_count = ROW_COUNT;\r?\n'
    '[ \t]*RAISE NOTICE ''[^'']*Deleted % images'', v_count;\r?\n',
    ''
  );
  IF v_new = v_def OR v_new ~ 'patient_images' OR v_new !~ 'PERFORM public\.assert_' THEN
    RAISE EXCEPTION 'reset_simulation_for_next_session: unexpected definition, patient_images not removed cleanly';
  END IF;
  EXECUTE v_new;

  v_def := pg_get_functiondef('public.reset_simulation_with_template_updates(uuid, uuid)'::regprocedure);
  v_new := regexp_replace(v_def, '[ \t]*DELETE FROM patient_images WHERE tenant_id = v_tenant_id;\r?\n', '');
  IF v_new = v_def OR v_new ~ 'patient_images' OR v_new !~ 'PERFORM public\.assert_' THEN
    RAISE EXCEPTION 'reset_simulation_with_template_updates: unexpected definition, patient_images not removed cleanly';
  END IF;
  EXECUTE v_new;
END $$;

DELETE FROM public.simulation_table_config WHERE table_name = 'patient_images';

-- No CASCADE: fail loudly if anything unexpected still depends on the table.
DROP TABLE public.patient_images;
