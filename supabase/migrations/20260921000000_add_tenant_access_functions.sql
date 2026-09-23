-- ============================================================================
-- SECURITY FIX, PART 1 of 2 (ADDITIVE): tenant-access entitlement functions
-- ============================================================================
-- THE VULNERABILITY (verified live in production 2026-09-21)
--
--   tenant_users_auth_select  SELECT  TO public  USING      (auth.uid() IS NOT NULL)
--   tenant_users_auth_insert  INSERT  TO public  WITH CHECK (auth.uid() IS NOT NULL)
--
-- `tenant_users.is_active` DEFAULTs to true, and Supabase's default grants give
-- both `anon` and `authenticated` full arwdDxtm on every table in `public`, so
-- RLS is the only barrier. That made the following possible for ANY authenticated
-- user, including a student `nurse` account and the auto-created simulation
-- students:
--
--   1. SELECT the entire tenant_users table -> learn every tenant_id on the
--      platform (the SELECT policy has no scoping at all).
--   2. INSERT (user_id => self, tenant_id => any tenant). The WITH CHECK never
--      compared user_id to auth.uid(), so arbitrary users could also be enrolled.
--      is_active defaults true, so the row is live immediately.
--   3. Every clinical table's policy is of the form
--        EXISTS (SELECT 1 FROM tenant_users
--                WHERE user_id = auth.uid()
--                  AND tenant_id = <table>.tenant_id AND is_active)
--      ...which now matches. Result: full read/write on another institution's
--      patients, medications, vitals, labs and notes.
--
-- The anon key ships in the client bundle, so this needed nothing more than a
-- shell and a JWT.
--
-- WHY THE POLICY EXISTED (do not simply delete it)
--
-- It is load-bearing. TenantContext.tsx self-grants membership at five sites
-- (lines 160, 208, 252, 471, 575) with the comment "critical for RLS", and
-- useActiveSimulations.ts does the same at 243 and 324 -- its comment explains
-- why: instructors are NOT added to tenant_users by launch_simulation (only
-- participants are), so without a grant every clinical query returns [] for
-- them. Dropping the INSERT policy alone would break template editing and lock
-- instructors out of their own simulations.
--
-- THE FIX (this file is PART 1: functions only, no policy changes)
--
-- Replace "anyone logged in may enrol anyone, anywhere" with a SECURITY DEFINER
-- RPC that grants membership only where the caller is genuinely entitled, using
-- the SAME entitlement rules the existing SELECT policies already encode for
-- simulation_active / simulation_templates / patient_templates.
--
-- NOTE on one deliberate divergence: `templates_select` ends with
-- `OR (status = 'ready')`, which lets any authenticated user SEE a ready
-- template. That is acceptable for visibility but must NOT confer the right to
-- join the template's tenant, so user_may_join_tenant() omits that clause.
-- Reusing templates_select verbatim would have reintroduced the same hole.
--
-- Institution and program tenants are intentionally NOT self-joinable. Those
-- memberships are provisioned by admins or by create_program_tenant().
--
-- Isolation is verified by supabase/tests/verify_rls_isolation.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Entitlement predicate
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER because it must read simulation_participants / user_programs
-- / user_profiles rows the caller may not themselves be able to see. STABLE so
-- it can be inlined and cached within a statement.

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
    -- (b) Platform-wide roles.
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
        AND up.is_active
    )
    -- (c) An active simulation: its launcher, an assigned participant, or an
    --     instructor whose programs match the simulation's categories.
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
    -- (d) A simulation template: its creator, or an instructor/admin whose
    --     programs match. Deliberately excludes the status='ready' clause.
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

REVOKE ALL ON FUNCTION public.user_may_join_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_may_join_tenant(uuid) TO authenticated;

COMMENT ON FUNCTION public.user_may_join_tenant(uuid) IS
  'True when the current user is entitled to membership of p_tenant_id. Mirrors the '
  'SELECT-policy entitlement rules for simulation_active / simulation_templates / '
  'patient_templates, minus templates_select''s status=''ready'' clause (visibility '
  'must not confer join rights). Institution and program tenants are never self-joinable.';

-- ----------------------------------------------------------------------------
-- 2. The RPC clients call in place of the old self-upsert
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_tenant_access(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := (SELECT auth.uid());
  v_role user_role;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ensure_tenant_access: not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'ensure_tenant_access: p_tenant_id is required'
      USING ERRCODE = '22004';
  END IF;

  IF NOT public.user_may_join_tenant(p_tenant_id) THEN
    -- Deliberately does not reveal whether the tenant exists.
    RAISE EXCEPTION 'ensure_tenant_access: not entitled to tenant %', p_tenant_id
      USING ERRCODE = '42501';
  END IF;

  SELECT up.role INTO v_role FROM user_profiles up WHERE up.id = v_uid;

  INSERT INTO tenant_users (user_id, tenant_id, role, is_active)
  VALUES (
    v_uid,
    p_tenant_id,
    -- tenant_users.role is NOT consulted by any RLS policy (every role check
    -- reads user_profiles.role); it is descriptive only. Mirror the profile
    -- role, defaulting to the column default's spirit for unknown profiles.
    COALESCE(v_role::text, 'viewer'),
    true
  )
  ON CONFLICT (tenant_id, user_id)
  DO UPDATE SET is_active = true, updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_tenant_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_tenant_access(uuid) TO authenticated;

COMMENT ON FUNCTION public.ensure_tenant_access(uuid) IS
  'Idempotently grants the calling user membership of p_tenant_id, but only when '
  'user_may_join_tenant() allows it. Replaces the client-side tenant_users upsert '
  'that TenantContext and useActiveSimulations previously performed.';

-- ----------------------------------------------------------------------------
-- 2b. Recursion-safe helpers used by the tenant_users policies
-- ----------------------------------------------------------------------------
-- A policy ON tenant_users may not itself SELECT tenant_users -- that recurses
-- (documented failure mode in this codebase). Both helpers are SECURITY DEFINER
-- so they read the table with RLS bypassed, breaking the cycle.

CREATE OR REPLACE FUNCTION public.caller_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tu.tenant_id FROM tenant_users tu
  WHERE tu.user_id = (SELECT auth.uid()) AND tu.is_active;
$$;

REVOKE ALL ON FUNCTION public.caller_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_tenant_ids() TO authenticated;

COMMENT ON FUNCTION public.caller_tenant_ids() IS
  'Active tenant ids for the calling user. SECURITY DEFINER so policies ON '
  'tenant_users can use it without recursing into their own table.';

-- True when the caller may manage OTHER users'' membership of p_tenant_id.
-- Preserves the existing admin flows: UserForm.tsx:181 (super_admin assigning a
-- new user), tenantService.ts:408 addUserToTenant / :474 removeUserFromTenant /
-- :203 tenant teardown, programService.ts:380/396 program-tenant assignment.
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
        up.role IN ('super_admin', 'coordinator')
        OR (
          up.role = 'admin'
          AND EXISTS (
            SELECT 1 FROM tenant_users tu
            WHERE tu.user_id = (SELECT auth.uid())
              AND tu.tenant_id = p_tenant_id
              AND tu.is_active
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.caller_may_administer_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_may_administer_tenant(uuid) TO authenticated;

COMMENT ON FUNCTION public.caller_may_administer_tenant(uuid) IS
  'True when the caller may create/modify/remove other users'' tenant_users rows '
  'for p_tenant_id: super_admin, coordinator, or an admin who is themselves an '
  'active member of that tenant.';

-- ============================================================================
-- END OF PART 1. Nothing above changes existing behaviour: it only ADDS
-- functions. The permissive policies are still in place after this migration,
-- so the old client keeps working. Deploy the client (which switches to
-- ensure_tenant_access) on top of this, verify, then apply part 2
-- (20260921000002_drop_permissive_tenant_policies.sql) to close the hole.
-- ============================================================================
