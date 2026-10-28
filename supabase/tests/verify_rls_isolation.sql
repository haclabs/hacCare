-- ============================================================================
-- RLS isolation verification
-- ============================================================================
-- Run AFTER applying 20260921000000..20260921000002. Proves cross-tenant
-- isolation by impersonating real users and asserting what they cannot see.
--
--   local:  psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" \
--             -f supabase/tests/verify_rls_isolation.sql
--   dev:    psql "$DEV_DB_URL" -f supabase/tests/verify_rls_isolation.sql
--
-- Safe on production: read-only, wrapped in a transaction that always rolls
-- back. It asserts rather than prints -- any violation raises an exception.
--
-- Impersonation works by setting the same GUCs PostgREST sets per request:
--   set local role authenticated;
--   set local request.jwt.claims to '{"sub":"<user uuid>","role":"authenticated"}';
-- `set local` is transaction-scoped, so the rollback restores everything.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_student      uuid;
  v_student_sim  uuid;
  v_foreign_tid  uuid;
  v_n            bigint;
  v_total        bigint;
BEGIN
  -- A student, the tenant of the simulation they are assigned to, and some
  -- tenant they have nothing to do with.
  SELECT up.id INTO v_student
  FROM user_profiles up WHERE up.role = 'student' AND up.is_active LIMIT 1;

  IF v_student IS NULL THEN
    RAISE NOTICE 'SKIP: no active student in this database (expected on a fresh local reset)';
    RETURN;
  END IF;

  SELECT tu.tenant_id INTO v_student_sim
  FROM tenant_users tu JOIN tenants t ON t.id = tu.tenant_id
  WHERE tu.user_id = v_student AND tu.is_active AND t.tenant_type = 'simulation_active'
  LIMIT 1;

  SELECT t.id INTO v_foreign_tid
  FROM tenants t
  WHERE t.id IS DISTINCT FROM v_student_sim
    AND NOT EXISTS (SELECT 1 FROM tenant_users tu
                    WHERE tu.user_id = v_student AND tu.tenant_id = t.id AND tu.is_active)
  LIMIT 1;

  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_student, 'role', 'authenticated')::text,
                     true);

  -- 1. A student must not be able to enrol themselves into a foreign tenant.
  IF public.user_may_join_tenant(v_foreign_tid) THEN
    RAISE EXCEPTION 'FAIL 1: student % may join foreign tenant %', v_student, v_foreign_tid;
  END IF;

  -- 2. ...and must still be able to (re)join their own simulation.
  IF v_student_sim IS NOT NULL AND NOT public.user_may_join_tenant(v_student_sim) THEN
    RAISE EXCEPTION 'FAIL 2: student % locked out of own simulation tenant %',
      v_student, v_student_sim;
  END IF;

  -- 3. tenant_users must not be fully readable.
  SELECT count(*) INTO v_n FROM tenant_users;
  RESET role;
  SELECT count(*) INTO v_total FROM tenant_users;
  IF v_n >= v_total AND v_total > 1 THEN
    RAISE EXCEPTION 'FAIL 3: student sees % of % tenant_users rows', v_n, v_total;
  END IF;

  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_student, 'role', 'authenticated')::text, true);

  -- 4. The user directory must not be fully readable.
  SELECT count(*) INTO v_n FROM user_profiles;
  RESET role;
  SELECT count(*) INTO v_total FROM user_profiles;
  IF v_n >= v_total AND v_total > 1 THEN
    RAISE EXCEPTION 'FAIL 4: student sees % of % user_profiles rows', v_n, v_total;
  END IF;

  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_student, 'role', 'authenticated')::text, true);

  -- 5. No patient rows outside the student's own tenants.
  SELECT count(*) INTO v_n FROM patients p
  WHERE p.tenant_id NOT IN (SELECT public.caller_tenant_ids());
  IF v_n > 0 THEN
    RAISE EXCEPTION 'FAIL 5: student sees % patients outside their tenants', v_n;
  END IF;

  -- 6. Handover notes must be scoped to accessible patients.
  SELECT count(*) INTO v_n FROM handover_notes h
  WHERE h.patient_id NOT IN (
    SELECT p.id FROM patients p WHERE p.tenant_id IN (SELECT public.caller_tenant_ids()));
  IF v_n > 0 THEN
    RAISE EXCEPTION 'FAIL 6: student sees % foreign handover notes', v_n;
  END IF;

  RESET role;
  RAISE NOTICE 'PASS: all RLS isolation assertions held for student %', v_student;
END $$;

-- The forgeable-super_admin fallback must be gone.
DO $$
BEGIN
  IF pg_get_functiondef('public.current_user_is_super_admin()'::regprocedure)
       ILIKE '%user_metadata%' THEN
    RAISE EXCEPTION 'FAIL 7: current_user_is_super_admin() still trusts user_metadata';
  END IF;
  RAISE NOTICE 'PASS: no user_metadata fallback in current_user_is_super_admin()';
END $$;

-- The permissive policies must be gone.
DO $$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(tablename || '.' || policyname, ', ') INTO v_bad
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN ('tenant_users_auth_select','tenant_users_auth_insert',
                       'tenants_auth_insert','tenants_auth_update','tenants_auth_delete',
                       'user_profiles_auth_select');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 8: permissive policies still present: %', v_bad;
  END IF;
  RAISE NOTICE 'PASS: all permissive policies removed';
END $$;

-- Templates, simulations and history are scoped to their owning institution
-- (20261026024148), and instructors can read their assigned programs (20261026024318).
DO $$
DECLARE
  v_instr     uuid;
  v_inst      uuid;
  v_foreign   uuid;
  v_n         bigint;
BEGIN
  -- An instructor whose program belongs to an institution that owns templates.
  SELECT up.id, pr.tenant_id INTO v_instr, v_inst
  FROM user_profiles up
  JOIN user_programs upr ON upr.user_id = up.id
  JOIN programs pr ON pr.id = upr.program_id
  WHERE up.role = 'instructor' AND up.is_active
    AND EXISTS (SELECT 1 FROM simulation_templates st WHERE st.owner_institution_id = pr.tenant_id)
  LIMIT 1;

  IF v_instr IS NULL THEN
    RAISE NOTICE 'SKIP: no instructor at an institution that owns templates';
    RETURN;
  END IF;

  SELECT st.tenant_id INTO v_foreign
  FROM simulation_templates st
  WHERE st.owner_institution_id IS DISTINCT FROM v_inst AND st.owner_institution_id IS NOT NULL
  LIMIT 1;

  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_instr, 'role', 'authenticated')::text,
                     true);

  -- 9. No foreign-institution templates (including status='ready' ones).
  SELECT count(*) INTO v_n FROM simulation_templates
  WHERE owner_institution_id IS DISTINCT FROM v_inst AND created_by IS DISTINCT FROM v_instr;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'FAIL 9: instructor % sees % foreign simulation templates', v_instr, v_n;
  END IF;

  SELECT count(*) INTO v_n FROM patient_templates
  WHERE owner_institution_id IS DISTINCT FROM v_inst AND created_by IS DISTINCT FROM v_instr;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'FAIL 10: instructor % sees % foreign patient templates', v_instr, v_n;
  END IF;

  -- 11. Cannot join a foreign institution's template tenant.
  IF v_foreign IS NOT NULL AND public.user_may_join_tenant(v_foreign) THEN
    RAISE EXCEPTION 'FAIL 11: instructor % may join foreign template tenant %', v_instr, v_foreign;
  END IF;

  -- 12. No foreign-institution simulation history.
  SELECT count(*) INTO v_n FROM simulation_history sh
  WHERE public.template_owner_institution(sh.template_id) IS DISTINCT FROM v_inst
    AND sh.created_by IS DISTINCT FROM v_instr;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'FAIL 12: instructor % sees % foreign simulation_history rows', v_instr, v_n;
  END IF;

  -- 13. Can read their own programs (otherwise every program-code policy fails).
  SELECT count(*) INTO v_n FROM programs;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'FAIL 13: instructor % cannot read their assigned programs', v_instr;
  END IF;

  RESET role;
  RAISE NOTICE 'PASS: institution scoping held for instructor %', v_instr;
END $$;

-- Privileged RPCs must keep their access guard (20261026031253, 20261026031433).
-- Redeploying one of these from an old copy silently drops the guard; this catches it.
DO $$
DECLARE
  v_missing text;
  v_anon    text;
  v_student uuid;
  v_sim     uuid;
  v_res     jsonb;
BEGIN
  SELECT string_agg(f, ', ') INTO v_missing
  FROM unnest(ARRAY[
    'reset_simulation_for_next_session', 'reset_simulation_with_template_updates',
    'complete_simulation', 'delete_simulation', 'compare_simulation_template_patients',
    'compare_simulation_vs_template', 'launch_simulation', 'start_simulation', 'delete_simulation_template',
    'save_template_snapshot_v2', 'save_template_state', 'delete_patient_template',
    'save_patient_template_snapshot', 'add_patient_template_to_simulation_template',
    'get_tenant_users', 'create_program_tenant', 'get_user_current_tenant',
    'create_patient_template', 'create_simulation_template', 'find_user_by_email',
    'get_available_admin_users', 'get_user_program_codes', 'get_user_program_tenants',
    'user_has_program_access', 'get_user_institutions', 'confirm_user_email', 'delete_user_permanently'
  ]) f
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = f AND p.prosrc LIKE '%PERFORM public.assert_%'
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 14: privileged RPCs missing their access guard: %', v_missing;
  END IF;

  SELECT string_agg(p.proname, ', ') INTO v_anon
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
    AND p.prosrc LIKE '%-- access guard%' AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF v_anon IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 15: anon can execute guarded RPCs: %', v_anon;
  END IF;

  -- 16. A student must not be able to reset their own simulation.
  SELECT sp.user_id, sp.simulation_id INTO v_student, v_sim
  FROM simulation_participants sp JOIN user_profiles up ON up.id = sp.user_id
  WHERE up.role = 'student' LIMIT 1;

  IF v_student IS NOT NULL THEN
    SET LOCAL role authenticated;
    PERFORM set_config('request.jwt.claims',
                       json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    BEGIN
      PERFORM public.assert_can_manage_simulation(v_sim);
      RAISE EXCEPTION 'FAIL 16: student % may manage simulation %', v_student, v_sim;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
    -- reset_* catches the guard's error and returns {success:false}; the body must not run.
    v_res := to_jsonb(public.reset_simulation_for_next_session(v_sim, NULL));
    IF coalesce((v_res->>'success')::boolean, false) THEN
      RAISE EXCEPTION 'FAIL 16b: student % reset simulation %', v_student, v_sim;
    END IF;
    RESET role;
  END IF;

  RAISE NOTICE 'PASS: privileged RPC guards present and enforced';
END $$;

-- Coordinators are confined to their own institution (20261026032538). No coordinator
-- may exist yet, so promote an instructor inside this rolled-back transaction.
DO $$
DECLARE
  v_coord   uuid;
  v_inst    uuid;
  v_foreign uuid;
  v_n       bigint;
BEGIN
  SELECT up.id, pr.tenant_id INTO v_coord, v_inst
  FROM user_profiles up
  JOIN user_programs upr ON upr.user_id = up.id
  JOIN programs pr ON pr.id = upr.program_id
  WHERE up.role = 'instructor' AND up.is_active
  LIMIT 1;

  SELECT t.id INTO v_foreign FROM tenants t
  WHERE t.tenant_type = 'institution' AND t.id <> v_inst LIMIT 1;

  IF v_coord IS NULL OR v_foreign IS NULL THEN
    RAISE NOTICE 'SKIP: need an instructor and a second institution';
    RETURN;
  END IF;

  UPDATE user_profiles SET role = 'coordinator' WHERE id = v_coord;

  SET LOCAL role authenticated;
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_coord, 'role', 'authenticated')::text, true);

  -- 17. Cannot enrol into another institution's tenant (the escalation path).
  IF public.caller_may_administer_tenant(v_foreign) THEN
    RAISE EXCEPTION 'FAIL 17: coordinator % may administer foreign institution %', v_coord, v_foreign;
  END IF;

  -- 18. Cannot see another institution's programs or tenants.
  SELECT count(*) INTO v_n FROM programs WHERE tenant_id = v_foreign;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'FAIL 18: coordinator % sees % foreign programs', v_coord, v_n;
  END IF;
  SELECT count(*) INTO v_n FROM tenants WHERE id = v_foreign OR parent_tenant_id = v_foreign;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'FAIL 18b: coordinator % sees % foreign tenants', v_coord, v_n;
  END IF;

  -- 19. Can still administer their own institution.
  IF NOT public.caller_may_administer_tenant(v_inst) THEN
    RAISE EXCEPTION 'FAIL 19: coordinator % cannot administer own institution %', v_coord, v_inst;
  END IF;

  RESET role;
  RAISE NOTICE 'PASS: coordinator confined to institution %', v_inst;
END $$;

ROLLBACK;
