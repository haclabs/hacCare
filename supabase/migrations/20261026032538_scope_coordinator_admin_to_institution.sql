-- ============================================================================
-- Scope coordinator / admin powers to their own institution
-- ============================================================================
-- Coordinators were documented as "tenant-wide, no super admin powers", but
-- their checks were role-only, so a coordinator at one institution could:
--
--   * enrol THEMSELVES (or anyone) into another institution's tenants:
--     tenant_users_admin_insert/update/delete use caller_may_administer_tenant(),
--     whose coordinator branch accepted any tenant -- which then unlocks
--     everything else via caller_in_institution()
--   * create / edit / delete any institution's programs and program assignments
--   * read every user profile, tenant, tenant membership, template state and
--     auto-generated student login on the platform
--   * deactivate / reactivate / re-role any user, read anyone's sign-in status,
--     and (via the admin-update-user-email edge function) change anyone's
--     LOGIN EMAIL -- an account takeover
--
-- The admin role had the same role-only checks and is scoped the same way.
-- Two problems were not coordinator-specific and are fixed here too:
--   * student_roster insert/update/delete allowed ANY instructor/admin/
--     coordinator to edit ANY program's roster
--   * update_user_profile_admin only checked the NEW role, never the target's
--     CURRENT role, so an instructor could set any other institution's
--     instructor or coordinator to "student"
--
-- RULE: a user "belongs" to the institutions reachable from their active tenant
-- memberships (institution, program, template or simulation tenants), program
-- assignments, roster entries and simulation participations. A coordinator /
-- admin / instructor may administer a user who shares one of the caller's
-- institutions, or a brand-new account that has no institution yet (accounts are
-- created first and placed afterwards -- UserForm and autoStudentService both
-- call update_user_profile_admin before any membership exists).
--
-- Restrictive policies are ANDed with the existing ones and only bite for the
-- roles named in them, so super_admin, instructor, student and nurse access is
-- unchanged except where stated above.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.caller_in_institution_strict(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p_institution_id IS NOT NULL AND public.caller_in_institution(p_institution_id);
$$;

CREATE OR REPLACE FUNCTION public.program_institution(p_program_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pr.tenant_id FROM programs pr WHERE pr.id = p_program_id;
$$;

CREATE OR REPLACE FUNCTION public.simulation_owner_institution(p_simulation_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.template_owner_institution(sa.template_id) FROM simulation_active sa WHERE sa.id = p_simulation_id;
$$;

CREATE OR REPLACE FUNCTION public.user_institution_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT i FROM (
    SELECT public.institution_of_tenant(tu.tenant_id) AS i
    FROM tenant_users tu WHERE tu.user_id = p_user_id AND tu.is_active
    UNION
    SELECT pr.tenant_id FROM user_programs up JOIN programs pr ON pr.id = up.program_id WHERE up.user_id = p_user_id
    UNION
    SELECT pr.tenant_id FROM student_roster sr JOIN programs pr ON pr.id = sr.program_id WHERE sr.user_id = p_user_id
    UNION
    SELECT public.template_owner_institution(sa.template_id)
    FROM simulation_participants sp JOIN simulation_active sa ON sa.id = sp.simulation_id
    WHERE sp.user_id = p_user_id
  ) x
  WHERE i IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.caller_can_administer_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    public.caller_is_service_context()
    OR public.caller_has_role(ARRAY['super_admin'])
    OR (
      public.caller_has_role(ARRAY['coordinator', 'admin', 'instructor'])
      AND (
        EXISTS (SELECT 1 FROM public.user_institution_ids(p_user_id) i WHERE public.caller_in_institution_strict(i))
        OR NOT EXISTS (SELECT 1 FROM public.user_institution_ids(p_user_id))
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.assert_can_administer_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT public.caller_can_administer_user(p_user_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this user' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Adds the CURRENT-role tier check update_user_profile_admin was missing (it only
-- checked the role being assigned). Mirrors deactivate_user's tiers.
CREATE OR REPLACE FUNCTION public.assert_can_update_user_profile(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_target_role text;
BEGIN
  PERFORM public.assert_can_administer_user(p_user_id);
  IF public.caller_is_service_context() OR public.caller_has_role(ARRAY['super_admin']) THEN
    RETURN;
  END IF;

  SELECT up.role::text INTO v_target_role FROM user_profiles up WHERE up.id = p_user_id;

  IF v_target_role = 'super_admin'
     OR (public.caller_has_role(ARRAY['admin']) AND v_target_role = 'coordinator')
     OR (public.caller_has_role(ARRAY['coordinator']) AND v_target_role = 'admin')
     OR (public.caller_has_role(ARRAY['instructor']) AND v_target_role IS NOT NULL
         AND v_target_role NOT IN ('student', 'nurse')) THEN
    RAISE EXCEPTION 'Not authorized to change a % account', v_target_role USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_can_manage_program(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF public.caller_is_service_context()
     OR public.caller_has_role(ARRAY['super_admin'])
     OR (public.caller_has_role(ARRAY['coordinator', 'admin', 'instructor'])
         AND public.caller_in_institution_strict(public.program_institution(p_program_id))) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Not authorized to manage this program' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.caller_in_institution_strict(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.program_institution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.simulation_owner_institution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_institution_ids(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caller_can_administer_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_administer_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_update_user_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_manage_program(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_in_institution_strict(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.program_institution(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.simulation_owner_institution(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_institution_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.caller_can_administer_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_administer_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_update_user_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_manage_program(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Tenant administration: coordinators only within their own institution.
--    Backs tenant_users_admin_insert / _update / _delete.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.caller_may_administer_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = (SELECT auth.uid())
      AND up.is_active
      AND (
        up.role = 'super_admin'
        OR (up.role = 'coordinator'
            AND public.caller_in_institution_strict(public.institution_of_tenant(p_tenant_id)))
        OR (up.role = 'admin' AND EXISTS (
              SELECT 1 FROM tenant_users tu
              WHERE tu.user_id = (SELECT auth.uid()) AND tu.tenant_id = p_tenant_id AND tu.is_active))
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. Restrictive policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS user_profiles_institution_scope ON public.user_profiles;
CREATE POLICY user_profiles_institution_scope ON public.user_profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR public.caller_can_administer_user(id)
  );

DROP POLICY IF EXISTS programs_institution_scope ON public.programs;
CREATE POLICY programs_institution_scope ON public.programs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR public.caller_in_institution_strict(tenant_id)
  )
  WITH CHECK (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR public.caller_in_institution_strict(tenant_id)
  );

DROP POLICY IF EXISTS user_programs_institution_scope ON public.user_programs;
CREATE POLICY user_programs_institution_scope ON public.user_programs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR public.caller_in_institution_strict(public.program_institution(program_id))
  )
  WITH CHECK (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR (public.caller_in_institution_strict(public.program_institution(program_id))
        AND public.caller_can_administer_user(user_id))
  );

DROP POLICY IF EXISTS student_roster_institution_scope ON public.student_roster;
CREATE POLICY student_roster_institution_scope ON public.student_roster
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin', 'instructor'])
    OR public.caller_in_institution_strict(public.program_institution(program_id))
  )
  WITH CHECK (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin', 'instructor'])
    OR public.caller_in_institution_strict(public.program_institution(program_id))
  );

DROP POLICY IF EXISTS template_states_institution_scope ON public.simulation_template_states;
CREATE POLICY template_states_institution_scope ON public.simulation_template_states
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR public.caller_in_institution_strict(public.institution_of_tenant(tenant_id))
  )
  WITH CHECK (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR public.caller_in_institution_strict(public.institution_of_tenant(tenant_id))
  );

DROP POLICY IF EXISTS simulation_auto_students_institution_scope ON public.simulation_auto_students;
CREATE POLICY simulation_auto_students_institution_scope ON public.simulation_auto_students
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR public.caller_in_institution_strict(public.simulation_owner_institution(simulation_id))
  );

DROP POLICY IF EXISTS tenant_users_institution_scope ON public.tenant_users;
CREATE POLICY tenant_users_institution_scope ON public.tenant_users
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR tenant_id IN (SELECT public.caller_tenant_ids())
    OR public.caller_in_institution_strict(public.institution_of_tenant(tenant_id))
  );

DROP POLICY IF EXISTS tenants_institution_scope ON public.tenants;
CREATE POLICY tenants_institution_scope ON public.tenants
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    NOT public.caller_has_role(ARRAY['coordinator', 'admin'])
    OR id IN (SELECT public.caller_tenant_ids())
    OR public.caller_in_institution_strict(public.institution_of_tenant(id))
  );

-- ----------------------------------------------------------------------------
-- 4. Guards on user-admin and template-state RPCs (same injection as
--    20261026031253_guard_privileged_rpcs; idempotent).
-- ----------------------------------------------------------------------------

DO $guard$
DECLARE
  g record;
  v_def text;
  v_new text;
BEGIN
  FOR g IN SELECT * FROM (VALUES
    ('deactivate_user',                  'PERFORM public.assert_can_administer_user(target_user_id);'),
    ('reactivate_user',                  'PERFORM public.assert_can_administer_user(target_user_id);'),
    ('confirm_simulation_student_email', 'PERFORM public.assert_can_administer_user(p_user_id);'),
    ('update_user_profile_admin',        'PERFORM public.assert_can_update_user_profile(p_user_id);'),
    ('add_student_to_roster_admin',      'PERFORM public.assert_can_manage_program(p_program_id); PERFORM public.assert_can_administer_user(p_user_id);'),
    ('load_template_state',              'PERFORM public.assert_can_manage_simulation_template(p_template_id);'),
    ('update_template_state_snapshot',   'PERFORM public.assert_can_manage_simulation_template(p_template_id);'),
    ('get_user_accessible_simulations',  'PERFORM public.assert_self_or_admin(p_user_id);')
  ) AS t(fn, guard)
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT v_def
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = g.fn;

    IF strpos(v_def, g.guard) > 0 THEN
      CONTINUE;
    END IF;

    v_new := regexp_replace(v_def, '(AS \$function\$.*?\mBEGIN\M)', E'\\1\n  ' || g.guard || ' -- access guard', 'i');
    IF v_new = v_def THEN
      RAISE EXCEPTION 'Could not find the top-level BEGIN in %', g.fn;
    END IF;

    EXECUTE v_new;
  END LOOP;
END
$guard$;

-- Sign-in status: return only users the caller may administer instead of erroring,
-- because UserManagement passes its whole visible list in one call.
CREATE OR REPLACE FUNCTION public.get_user_auth_status(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, last_sign_in_at timestamp with time zone, email_confirmed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_caller_has_role(ARRAY['super_admin', 'coordinator', 'admin']); -- access guard
  RETURN QUERY
  SELECT au.id, au.last_sign_in_at, au.email_confirmed_at
  FROM auth.users au
  WHERE au.id = ANY (p_user_ids)
    AND public.caller_can_administer_user(au.id);
END;
$$;

-- Same revocation as 20261026031433 for everything guarded above.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef
      AND p.prosrc LIKE '%-- access guard%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;
