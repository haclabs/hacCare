-- ============================================================================
-- Scope templates and simulations to the institution that owns them
-- ============================================================================
-- THE PROBLEM
--
-- Template and simulation tenants (tenant_type simulation_template /
-- patient_template / simulation_active) had no link to an institution, so every
-- visibility rule fell back to matching program CODES:
--
--   prog.code = ANY (simulation_templates.primary_categories)
--
-- Program codes are only unique per institution (programs_tenant_code_unique is
-- UNIQUE (tenant_id, code)). Once a second institution has a program with the
-- same code as another's, an instructor in that program at one institution sees
-- -- and, through user_may_join_tenant(), can JOIN and read/write the patients
-- of -- the other institution's templates and simulations. On top of that:
--
--   * templates_select ends with OR status = 'ready': any authenticated user sees
--     every ready simulation template on the platform.
--   * history_select_policy lets any instructor read all simulation_history,
--     including debrief_data and student_activities, across institutions.
--   * super_admin AND coordinator bypass everything; coordinators are meant to be
--     institution-scoped.
--
-- THE FIX
--
-- 1. owner_institution_id on simulation_templates and patient_templates, backfilled
--    from the program codes each template is tagged with. A dedicated column rather
--    than tenants.parent_tenant_id, because TenantSwitcher nests every tenant with a
--    parent under it and LaunchSimulationModal queries tenants by parent_tenant_id.
-- 2. RESTRICTIVE policies on the four tables. Restrictive policies are ANDed with
--    the existing permissive ones, so this can only narrow access, never widen it.
--    Pass conditions: super_admin, a member of the owning institution (directly or
--    via one of its program tenants), the row's creator, or -- for simulations --
--    an assigned participant, so students are unaffected.
-- 3. user_may_join_tenant() gains the same institution check on its coordinator and
--    program-code branches. Creator / participant / existing-member branches are
--    untouched.
-- 4. create_patient_template / create_simulation_template take p_owner_tenant_id
--    (the caller's current tenant) and stamp owner_institution_id.
--
-- Rows whose owner is NULL (none after the backfill) keep the old behaviour.
-- Verified by supabase/tests/verify_rls_isolation.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ownership columns
-- ----------------------------------------------------------------------------

ALTER TABLE public.simulation_templates
  ADD COLUMN IF NOT EXISTS owner_institution_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.patient_templates
  ADD COLUMN IF NOT EXISTS owner_institution_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS simulation_templates_owner_institution_idx
  ON public.simulation_templates (owner_institution_id);
CREATE INDEX IF NOT EXISTS patient_templates_owner_institution_idx
  ON public.patient_templates (owner_institution_id);

COMMENT ON COLUMN public.simulation_templates.owner_institution_id IS
  'Institution tenant that owns this template. Restricts visibility to that institution''s members (plus super_admin, creator, and simulation participants).';
COMMENT ON COLUMN public.patient_templates.owner_institution_id IS
  'Institution tenant that owns this patient template. Restricts visibility to that institution''s members (plus super_admin and creator).';

-- ----------------------------------------------------------------------------
-- 2. Backfill: the institution owning a program whose code the template is
--    tagged with (oldest program wins if a code exists at several institutions),
--    else the creator's institution when they belong to exactly one.
-- ----------------------------------------------------------------------------

UPDATE public.simulation_templates st
SET owner_institution_id = (
  SELECT pr.tenant_id
  FROM public.programs pr
  JOIN public.tenants it ON it.id = pr.tenant_id AND it.tenant_type = 'institution'
  WHERE pr.code = ANY (st.primary_categories)
  ORDER BY pr.created_at
  LIMIT 1
)
WHERE st.owner_institution_id IS NULL;

UPDATE public.patient_templates pt
SET owner_institution_id = (
  SELECT pr.tenant_id
  FROM public.programs pr
  JOIN public.tenants it ON it.id = pr.tenant_id AND it.tenant_type = 'institution'
  WHERE pr.code = ANY (pt.primary_categories)
  ORDER BY pr.created_at
  LIMIT 1
)
WHERE pt.owner_institution_id IS NULL;

WITH single_institution AS (
  SELECT tu.user_id,
         (array_agg(DISTINCT CASE WHEN t.tenant_type = 'institution' THEN t.id ELSE t.parent_tenant_id END))[1] AS inst
  FROM public.tenant_users tu
  JOIN public.tenants t ON t.id = tu.tenant_id
  WHERE tu.is_active AND t.tenant_type IN ('institution', 'program')
  GROUP BY tu.user_id
  HAVING count(DISTINCT CASE WHEN t.tenant_type = 'institution' THEN t.id ELSE t.parent_tenant_id END) = 1
)
UPDATE public.simulation_templates st
SET owner_institution_id = si.inst
FROM single_institution si
WHERE st.owner_institution_id IS NULL AND si.user_id = st.created_by;

WITH single_institution AS (
  SELECT tu.user_id,
         (array_agg(DISTINCT CASE WHEN t.tenant_type = 'institution' THEN t.id ELSE t.parent_tenant_id END))[1] AS inst
  FROM public.tenant_users tu
  JOIN public.tenants t ON t.id = tu.tenant_id
  WHERE tu.is_active AND t.tenant_type IN ('institution', 'program')
  GROUP BY tu.user_id
  HAVING count(DISTINCT CASE WHEN t.tenant_type = 'institution' THEN t.id ELSE t.parent_tenant_id END) = 1
)
UPDATE public.patient_templates pt
SET owner_institution_id = si.inst
FROM single_institution si
WHERE pt.owner_institution_id IS NULL AND si.user_id = pt.created_by;

-- ----------------------------------------------------------------------------
-- 3. Helpers. SECURITY DEFINER so policies can call them without recursing
--    through each other's RLS (simulation_active <-> simulation_templates <->
--    simulation_participants).
-- ----------------------------------------------------------------------------

-- True when the caller may see things owned by p_institution_id. NULL owner = unscoped.
CREATE OR REPLACE FUNCTION public.caller_in_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    p_institution_id IS NULL
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin' AND up.is_active
    )
    OR EXISTS (
      SELECT 1
      FROM tenant_users tu
      JOIN tenants t ON t.id = tu.tenant_id
      WHERE tu.user_id = (SELECT auth.uid())
        AND tu.is_active
        AND (
          (t.tenant_type = 'institution' AND t.id = p_institution_id)
          OR (t.tenant_type = 'program' AND t.parent_tenant_id = p_institution_id)
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.template_owner_institution(p_template_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT st.owner_institution_id FROM simulation_templates st WHERE st.id = p_template_id;
$$;

-- The institution a tenant belongs to: itself, a program's parent, or the owner of
-- the template / simulation the tenant backs.
CREATE OR REPLACE FUNCTION public.institution_of_tenant(p_tenant_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT CASE WHEN t.tenant_type = 'institution' THEN t.id
                 WHEN t.tenant_type = 'program' THEN t.parent_tenant_id END
     FROM tenants t WHERE t.id = p_tenant_id),
    (SELECT st.owner_institution_id FROM simulation_templates st WHERE st.tenant_id = p_tenant_id LIMIT 1),
    (SELECT pt.owner_institution_id FROM patient_templates pt WHERE pt.tenant_id = p_tenant_id LIMIT 1),
    (SELECT st.owner_institution_id
     FROM simulation_active sa JOIN simulation_templates st ON st.id = sa.template_id
     WHERE sa.tenant_id = p_tenant_id LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.caller_is_simulation_participant(p_simulation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM simulation_participants sp
    WHERE sp.simulation_id = p_simulation_id AND sp.user_id = (SELECT auth.uid())
  );
$$;

-- Launcher of, or participant in, any running simulation built from the template.
CREATE OR REPLACE FUNCTION public.caller_runs_template(p_template_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM simulation_active sa
    WHERE sa.template_id = p_template_id
      AND (
        sa.created_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM simulation_participants sp
          WHERE sp.simulation_id = sa.id AND sp.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.caller_in_institution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.template_owner_institution(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.institution_of_tenant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caller_is_simulation_participant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.caller_runs_template(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_in_institution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.template_owner_institution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.institution_of_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caller_is_simulation_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caller_runs_template(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Restrictive policies (ANDed with the existing permissive policies).
--    WITH CHECK (true): inserts happen in SECURITY DEFINER functions, and an
--    UPDATE still has to pass USING to touch the row at all.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS patient_templates_institution_scope ON public.patient_templates;
CREATE POLICY patient_templates_institution_scope ON public.patient_templates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.caller_in_institution(owner_institution_id)
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS simulation_templates_institution_scope ON public.simulation_templates;
CREATE POLICY simulation_templates_institution_scope ON public.simulation_templates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.caller_in_institution(owner_institution_id)
    OR public.caller_runs_template(id)
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS simulation_active_institution_scope ON public.simulation_active;
CREATE POLICY simulation_active_institution_scope ON public.simulation_active
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.caller_is_simulation_participant(id)
    OR public.caller_in_institution(public.template_owner_institution(template_id))
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS simulation_history_institution_scope ON public.simulation_history;
CREATE POLICY simulation_history_institution_scope ON public.simulation_history
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR participants @> jsonb_build_array(jsonb_build_object('user_id', ((SELECT auth.uid()))::text))
    OR public.caller_in_institution(public.template_owner_institution(template_id))
  )
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. user_may_join_tenant(): same body as 20260921000000, with the institution
--    check added to the coordinator branch (b) and the program-code branches of
--    (c), (d) and (e).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_may_join_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    -- (a) Already an active member: idempotent re-grant, no escalation.
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = (SELECT auth.uid())
        AND tu.tenant_id = p_tenant_id
        AND tu.is_active
    )
    -- (b) super_admin anywhere; coordinator within their own institution.
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.is_active
        AND (
          up.role = 'super_admin'
          OR (up.role = 'coordinator'
              AND public.caller_in_institution(public.institution_of_tenant(p_tenant_id)))
        )
    )
    -- (c) An active simulation: its launcher, an assigned participant, or an
    --     instructor at the owning institution whose programs match.
    OR EXISTS (
      SELECT 1 FROM simulation_active sa
      WHERE sa.tenant_id = p_tenant_id
        AND (
          sa.created_by = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM simulation_participants sp
            WHERE sp.simulation_id = sa.id
              AND sp.user_id = (SELECT auth.uid())
          )
          OR (
            EXISTS (
              SELECT 1 FROM user_profiles up
              WHERE up.id = (SELECT auth.uid())
                AND up.role IN ('instructor', 'admin')
                AND up.is_active
            )
            AND public.caller_in_institution(public.template_owner_institution(sa.template_id))
            AND (
              sa.primary_categories IS NULL
              OR sa.primary_categories = '{}'::text[]
              OR EXISTS (
                SELECT 1 FROM user_programs upr
                JOIN programs pr ON pr.id = upr.program_id
                WHERE upr.user_id = (SELECT auth.uid())
                  AND pr.code = ANY (sa.primary_categories)
              )
            )
          )
        )
    )
    -- (d) A simulation template: its creator, or an instructor/admin at the
    --     owning institution whose programs match. Excludes status='ready'.
    OR EXISTS (
      SELECT 1 FROM simulation_templates st
      WHERE st.tenant_id = p_tenant_id
        AND (
          st.created_by = (SELECT auth.uid())
          OR (
            EXISTS (
              SELECT 1 FROM user_profiles up
              WHERE up.id = (SELECT auth.uid())
                AND up.role IN ('instructor', 'admin')
                AND up.is_active
            )
            AND public.caller_in_institution(st.owner_institution_id)
            AND (
              st.primary_categories IS NULL
              OR st.primary_categories = '{}'::text[]
              OR EXISTS (
                SELECT 1 FROM user_programs upr
                JOIN programs pr ON pr.id = upr.program_id
                WHERE upr.user_id = (SELECT auth.uid())
                  AND pr.code = ANY (st.primary_categories)
              )
            )
          )
        )
    )
    -- (e) A patient-library template: same rule as (d).
    OR EXISTS (
      SELECT 1 FROM patient_templates pt
      WHERE pt.tenant_id = p_tenant_id
        AND (
          pt.created_by = (SELECT auth.uid())
          OR (
            EXISTS (
              SELECT 1 FROM user_profiles up
              WHERE up.id = (SELECT auth.uid())
                AND up.role IN ('instructor', 'admin')
                AND up.is_active
            )
            AND public.caller_in_institution(pt.owner_institution_id)
            AND (
              pt.primary_categories IS NULL
              OR pt.primary_categories = '{}'::text[]
              OR EXISTS (
                SELECT 1 FROM user_programs upr
                JOIN programs pr ON pr.id = upr.program_id
                WHERE upr.user_id = (SELECT auth.uid())
                  AND pr.code = ANY (pt.primary_categories)
              )
            )
          )
        )
    );
$$;

-- ----------------------------------------------------------------------------
-- 6. Creation RPCs stamp the owning institution.
--    p_owner_tenant_id is the caller's current tenant (institution, program, or a
--    template being edited). When omitted, fall back to the institution owning one
--    of the tagged programs, then to the caller's only institution.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_owner_institution(
  p_owner_tenant_id uuid,
  p_primary_categories text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_inst uuid;
BEGIN
  v_inst := public.institution_of_tenant(p_owner_tenant_id);

  IF v_inst IS NULL AND p_primary_categories IS NOT NULL THEN
    SELECT pr.tenant_id INTO v_inst
    FROM programs pr
    JOIN tenants it ON it.id = pr.tenant_id AND it.tenant_type = 'institution'
    WHERE pr.code = ANY (p_primary_categories)
      AND public.caller_in_institution(pr.tenant_id)
    ORDER BY pr.created_at
    LIMIT 1;
  END IF;

  IF v_inst IS NULL THEN
    SELECT min(x.inst::text)::uuid INTO v_inst
    FROM (
      SELECT DISTINCT CASE WHEN t.tenant_type = 'institution' THEN t.id ELSE t.parent_tenant_id END AS inst
      FROM tenant_users tu JOIN tenants t ON t.id = tu.tenant_id
      WHERE tu.user_id = (SELECT auth.uid()) AND tu.is_active
        AND t.tenant_type IN ('institution', 'program')
    ) x
    HAVING count(*) = 1;
  END IF;

  IF v_inst IS NOT NULL AND NOT public.caller_in_institution(v_inst) THEN
    RAISE EXCEPTION 'Not a member of the institution that would own this template'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_inst;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_owner_institution(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_owner_institution(uuid, text[]) TO authenticated;

DROP FUNCTION IF EXISTS public.create_patient_template(text, text, text[]);
CREATE FUNCTION public.create_patient_template(
  p_name text,
  p_description text DEFAULT NULL,
  p_primary_categories text[] DEFAULT NULL,
  p_owner_tenant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_template_id UUID;
  v_subdomain TEXT;
  v_current_user_id UUID;
  v_owner_institution_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  v_owner_institution_id := public.resolve_owner_institution(p_owner_tenant_id, p_primary_categories);

  v_subdomain := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
  v_subdomain := 'pt-' || substring(v_subdomain, 1, 20) || '-' || substring(gen_random_uuid()::text, 1, 8);

  INSERT INTO tenants (name, subdomain, tenant_type, is_simulation, status)
  VALUES (p_name || ' (Patient Template)', v_subdomain, 'patient_template', true, 'active')
  RETURNING id INTO v_tenant_id;

  INSERT INTO patient_templates (tenant_id, name, description, primary_categories, status, created_by, owner_institution_id)
  VALUES (v_tenant_id, p_name, p_description, p_primary_categories, 'draft', v_current_user_id, v_owner_institution_id)
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

DROP FUNCTION IF EXISTS public.create_simulation_template(text, text, integer, text[]);
CREATE FUNCTION public.create_simulation_template(
  p_name text,
  p_description text,
  p_default_duration_minutes integer,
  p_primary_categories text[] DEFAULT NULL,
  p_owner_tenant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_template_id UUID;
  v_subdomain TEXT;
  v_current_user_id UUID;
  v_owner_institution_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  v_owner_institution_id := public.resolve_owner_institution(p_owner_tenant_id, p_primary_categories);

  v_subdomain := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
  v_subdomain := substring(v_subdomain, 1, 20) || '-' || substring(gen_random_uuid()::text, 1, 8);

  INSERT INTO tenants (name, subdomain, tenant_type, is_simulation, status)
  VALUES (p_name || ' (Template)', v_subdomain, 'simulation_template', true, 'active')
  RETURNING id INTO v_tenant_id;

  INSERT INTO simulation_templates (
    tenant_id, name, description, default_duration_minutes, primary_categories,
    status, created_by, owner_institution_id
  )
  VALUES (
    v_tenant_id, p_name, p_description, p_default_duration_minutes, p_primary_categories,
    'draft', v_current_user_id, v_owner_institution_id
  )
  RETURNING id INTO v_template_id;

  INSERT INTO tenant_users (tenant_id, user_id, role, is_active)
  VALUES (v_tenant_id, v_current_user_id, 'admin', true);

  RETURN json_build_object(
    'success', true,
    'template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Template created successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.create_patient_template(text, text, text[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_simulation_template(text, text, integer, text[], uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_patient_template(text, text, text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_simulation_template(text, text, integer, text[], uuid) TO authenticated;
