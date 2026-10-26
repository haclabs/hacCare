-- ============================================================================
-- Access guards on privileged (SECURITY DEFINER) RPCs
-- ============================================================================
-- THE PROBLEM
--
-- SECURITY DEFINER functions run as their owner and bypass RLS. That is
-- deliberate -- reset_simulation_for_next_session has to clear student entries
-- from every clinical table regardless of who wrote them, delete_simulation has
-- to remove auth.users rows for auto-generated students -- but it means the
-- function itself must decide who may call it. Audited 2026-10-26, these
-- checked nothing and were EXECUTE-able by every authenticated user, including
-- students and auto-generated simulation students:
--
--   reset_simulation_for_next_session, reset_simulation_with_template_updates,
--   complete_simulation, delete_simulation, compare_simulation_*  (any simulation)
--   launch_simulation, delete_simulation_template, save_template_snapshot_v2,
--   save_template_state                                            (any template)
--   delete_patient_template, save_patient_template_snapshot,
--   add_patient_template_to_simulation_template                    (any patient template)
--   get_tenant_users                 (names + emails of any tenant's users)
--   get_available_admin_users        (every user's email on the platform)
--   find_user_by_email               (account enumeration)
--   create_program_tenant            (create a program tenant under any institution)
--   get_user_current_tenant / get_user_program_codes /
--   get_user_program_tenants / user_has_program_access   (any user's memberships)
--   create_patient_template / create_simulation_template (any role, incl. students)
--
-- THE FIX
--
-- Each function's first statement is now a PERFORM public.assert_*() call. The
-- body after it is untouched, so the RLS bypass that reset / delete / snapshot
-- rely on works exactly as before -- the guard only decides whether the body
-- runs. Allowed callers:
--
--   * super_admin
--   * the record's creator
--   * an instructor / admin / coordinator of the institution that owns the
--     simulation or template (institution scope, not program scope: matches
--     what the Active Simulations and Templates screens already show)
--   * service context: no JWT and not the anon/authenticated role (SQL editor,
--     service_role key, migrations)
--
-- Unauthorised calls raise 42501. Functions whose body wraps everything in
-- EXCEPTION WHEN OTHERS (create_program_tenant, create_*_template) return
-- {success:false, message:'Not authorized ...'} instead -- still refused.
--
-- The guard is injected after the function's top-level BEGIN rather than by
-- re-pasting 17 KB bodies, so this migration cannot drift from the live code.
-- It is idempotent. Local copies in database/functions/ carry the same line.
--
-- WHEN YOU REDEPLOY ONE OF THESE FUNCTIONS, KEEP THE GUARD LINE.
-- supabase/tests/verify_rls_isolation.sql fails if any guard goes missing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Predicates
-- ----------------------------------------------------------------------------

-- No JWT and not running as anon/authenticated: SQL editor, service_role, migrations.
-- current_setting('role') is the session's SET ROLE, unaffected by SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.caller_is_service_context()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (SELECT auth.uid()) IS NULL
     AND coalesce(nullif(current_setting('role', true), ''), 'none') NOT IN ('anon', 'authenticated');
$$;

CREATE OR REPLACE FUNCTION public.caller_has_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = (SELECT auth.uid()) AND up.is_active AND up.role::text = ANY (p_roles)
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Assertions (raise 42501 when not allowed)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_can_manage_simulation(p_simulation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_created_by uuid;
  v_template_id uuid;
BEGIN
  IF public.caller_is_service_context() THEN RETURN; END IF;

  SELECT sa.created_by, sa.template_id INTO v_created_by, v_template_id
  FROM simulation_active sa WHERE sa.id = p_simulation_id;
  IF NOT FOUND THEN RETURN; END IF;  -- the function body reports "not found"

  IF auth.uid() IS NOT NULL AND (
       v_created_by = auth.uid()
    OR public.caller_has_role(ARRAY['super_admin'])
    OR (public.caller_has_role(ARRAY['coordinator', 'admin', 'instructor'])
        AND public.caller_in_institution(public.template_owner_institution(v_template_id)))
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Not authorized to manage this simulation' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_can_manage_simulation_template(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_created_by uuid;
  v_owner uuid;
BEGIN
  IF public.caller_is_service_context() THEN RETURN; END IF;

  SELECT st.created_by, st.owner_institution_id INTO v_created_by, v_owner
  FROM simulation_templates st WHERE st.id = p_template_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF auth.uid() IS NOT NULL AND (
       v_created_by = auth.uid()
    OR public.caller_has_role(ARRAY['super_admin'])
    OR (public.caller_has_role(ARRAY['coordinator', 'admin', 'instructor'])
        AND public.caller_in_institution(v_owner))
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Not authorized to manage this template' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_can_manage_patient_template(p_patient_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_created_by uuid;
  v_owner uuid;
BEGIN
  IF public.caller_is_service_context() THEN RETURN; END IF;

  SELECT pt.created_by, pt.owner_institution_id INTO v_created_by, v_owner
  FROM patient_templates pt WHERE pt.id = p_patient_template_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF auth.uid() IS NOT NULL AND (
       v_created_by = auth.uid()
    OR public.caller_has_role(ARRAY['super_admin'])
    OR (public.caller_has_role(ARRAY['coordinator', 'admin', 'instructor'])
        AND public.caller_in_institution(v_owner))
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Not authorized to manage this patient template' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_can_view_tenant_users(p_tenant_id uuid)
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
         AND public.caller_in_institution(public.institution_of_tenant(p_tenant_id))) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Not authorized to list this tenant''s users' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_can_manage_institution_programs(p_institution_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF public.caller_is_service_context()
     OR public.caller_has_role(ARRAY['super_admin'])
     OR (public.caller_has_role(ARRAY['coordinator'])
         AND public.caller_in_institution(public.institution_of_tenant(p_institution_id))) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Not authorized to manage this institution''s programs' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_self_or_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF public.caller_is_service_context()
     OR (auth.uid() IS NOT NULL AND p_user_id = auth.uid())
     OR public.caller_has_role(ARRAY['super_admin', 'coordinator', 'admin']) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Not authorized to look up another user' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_caller_has_role(p_roles text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF public.caller_is_service_context() OR public.caller_has_role(p_roles) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_caller_is_staff()
RETURNS void
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.assert_caller_has_role(ARRAY['super_admin', 'coordinator', 'admin', 'instructor']);
$$;

REVOKE ALL ON FUNCTION public.caller_is_service_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caller_has_role(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_manage_simulation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_manage_simulation_template(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_manage_patient_template(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_view_tenant_users(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_can_manage_institution_programs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_self_or_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_caller_has_role(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_caller_is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_is_service_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.caller_has_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_manage_simulation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_manage_simulation_template(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_manage_patient_template(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_view_tenant_users(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_can_manage_institution_programs(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_self_or_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_caller_has_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assert_caller_is_staff() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Inject the guard as the first statement of each plpgsql RPC
-- ----------------------------------------------------------------------------

DO $guard$
DECLARE
  g record;
  v_def text;
  v_new text;
BEGIN
  FOR g IN SELECT * FROM (VALUES
    ('reset_simulation_for_next_session',           'PERFORM public.assert_can_manage_simulation(p_simulation_id);'),
    ('reset_simulation_with_template_updates',      'PERFORM public.assert_can_manage_simulation(p_simulation_id);'),
    ('complete_simulation',                         'PERFORM public.assert_can_manage_simulation(p_simulation_id);'),
    ('delete_simulation',                           'PERFORM public.assert_can_manage_simulation(p_simulation_id);'),
    ('compare_simulation_template_patients',        'PERFORM public.assert_can_manage_simulation(p_simulation_id);'),
    ('compare_simulation_vs_template',              'PERFORM public.assert_can_manage_simulation(p_simulation_id);'),
    ('launch_simulation',                           'PERFORM public.assert_can_manage_simulation_template(p_template_id);'),
    ('delete_simulation_template',                  'PERFORM public.assert_can_manage_simulation_template(p_template_id);'),
    ('save_template_snapshot_v2',                   'PERFORM public.assert_can_manage_simulation_template(p_template_id);'),
    ('save_template_state',                         'PERFORM public.assert_can_manage_simulation_template(p_template_id);'),
    ('delete_patient_template',                     'PERFORM public.assert_can_manage_patient_template(p_patient_template_id);'),
    ('save_patient_template_snapshot',              'PERFORM public.assert_can_manage_patient_template(p_patient_template_id);'),
    ('add_patient_template_to_simulation_template', 'PERFORM public.assert_can_manage_patient_template(p_patient_template_id); PERFORM public.assert_can_manage_simulation_template(p_simulation_template_id);'),
    ('get_tenant_users',                            'PERFORM public.assert_can_view_tenant_users(target_tenant_id);'),
    ('create_program_tenant',                       'PERFORM public.assert_can_manage_institution_programs(p_parent_tenant_id);'),
    ('get_user_current_tenant',                     'PERFORM public.assert_self_or_admin(target_user_id);'),
    ('create_patient_template',                     'PERFORM public.assert_caller_is_staff();'),
    ('create_simulation_template',                  'PERFORM public.assert_caller_is_staff();')
  ) AS t(fn, guard)
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT v_def
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = g.fn;

    IF strpos(v_def, g.guard) > 0 THEN
      CONTINUE;  -- already guarded
    END IF;

    v_new := regexp_replace(v_def, '(AS \$function\$.*?\mBEGIN\M)', E'\\1\n  ' || g.guard || ' -- access guard', 'i');
    IF v_new = v_def THEN
      RAISE EXCEPTION 'Could not find the top-level BEGIN in %', g.fn;
    END IF;

    EXECUTE v_new;
  END LOOP;
END
$guard$;

-- ----------------------------------------------------------------------------
-- 4. SQL-language lookups: rewritten as plpgsql so they can assert first.
--    Signatures, return types and volatility are unchanged.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.find_user_by_email(email_param text)
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_caller_has_role(ARRAY['super_admin', 'coordinator', 'admin']); -- access guard
  RETURN QUERY
  SELECT au.id, au.email::text, au.created_at
  FROM auth.users au
  WHERE au.email = email_param AND au.deleted_at IS NULL
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_admin_users()
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_caller_has_role(ARRAY['super_admin', 'coordinator']); -- access guard
  RETURN QUERY
  SELECT au.id, au.email::text, au.created_at
  FROM auth.users au
  WHERE au.deleted_at IS NULL AND au.email_confirmed_at IS NOT NULL
  ORDER BY au.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_program_codes(p_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id); -- access guard
  RETURN (
    SELECT array_agg(p.code)
    FROM user_programs up
    JOIN programs p ON p.id = up.program_id
    WHERE up.user_id = p_user_id AND p.is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_program_tenants(p_user_id uuid)
RETURNS TABLE(tenant_id uuid, tenant_name text, program_id uuid, program_code text, program_name text, subdomain text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id); -- access guard
  RETURN QUERY
  SELECT t.id, t.name, p.id, p.code, p.name, t.subdomain
  FROM user_programs up
  JOIN programs p ON p.id = up.program_id
  JOIN tenants t ON t.program_id = p.id
  WHERE up.user_id = p_user_id
    AND p.is_active = true
    AND t.status = 'active'
    AND t.tenant_type = 'program'
  ORDER BY p.code;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_program_access(p_user_id uuid, p_program_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id); -- access guard
  RETURN EXISTS (
    SELECT 1
    FROM user_programs up
    JOIN programs p ON p.id = up.program_id
    WHERE up.user_id = p_user_id AND p.code = p_program_code AND p.is_active = true
  );
END;
$$;
