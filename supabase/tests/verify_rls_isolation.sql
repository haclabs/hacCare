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

ROLLBACK;
