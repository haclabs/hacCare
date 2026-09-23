-- ============================================================================
-- SECURITY FIX: stop full-directory and full-SBAR reads by any logged-in user
-- ============================================================================
-- HIGHER REGRESSION RISK THAN THE OTHER TWO MIGRATIONS IN THIS SET.
-- Apply to dev.haccare.app and exercise the debrief + user-management screens
-- before this reaches production. It is deliberately a separate migration so it
-- can be reverted without touching the tenant_users escalation fix.
--
-- 1. user_profiles_auth_select was `USING (auth.uid() IS NOT NULL)` -- any
--    authenticated user could read EVERY profile: email, first/last name, phone,
--    license_number, role, department, for faculty and students across all three
--    institutions. This is the one finding in this set that exposes real
--    personal data rather than simulated clinical data.
--
-- 2. handover_notes (SBAR) had SELECT and INSERT as
--    `USING (auth.role() = 'authenticated')` -- any user could read every
--    handover note platform-wide and write one against any patient. Note the
--    table's own UPDATE policy already scopes properly through
--    patients -> tenant_users, so update was stricter than select and insert.
--    The table has no tenant_id column (26 rows, 0 with a missing patient as of
--    2026-09-21), so scoping goes through patient_id until a tenant_id column is
--    added and backfilled in a later migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Recursion-safe helpers
-- ----------------------------------------------------------------------------
-- A policy ON user_profiles cannot SELECT user_profiles. SECURITY DEFINER breaks
-- the cycle.

CREATE OR REPLACE FUNCTION public.caller_profile_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT up.role::text FROM user_profiles up
  WHERE up.id = (SELECT auth.uid()) AND up.is_active;
$$;

REVOKE ALL ON FUNCTION public.caller_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_profile_role() TO authenticated;

-- User ids that share at least one active tenant with the caller. This is what
-- keeps in-simulation name lookups working: instructors and students in the same
-- simulation share its tenant.
CREATE OR REPLACE FUNCTION public.caller_tenant_comember_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT peer.user_id
  FROM tenant_users me
  JOIN tenant_users peer ON peer.tenant_id = me.tenant_id AND peer.is_active
  WHERE me.user_id = (SELECT auth.uid()) AND me.is_active;
$$;

REVOKE ALL ON FUNCTION public.caller_tenant_comember_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_tenant_comember_ids() TO authenticated;

-- ----------------------------------------------------------------------------
-- user_profiles: own row, co-members, or a privileged role
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS user_profiles_auth_select ON public.user_profiles;

CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.caller_profile_role() IN ('super_admin', 'coordinator', 'admin')
    OR id IN (SELECT public.caller_tenant_comember_ids())
  );

-- ----------------------------------------------------------------------------
-- handover_notes: scope SELECT and INSERT the way UPDATE already is
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view handover notes for accessible patients" ON public.handover_notes;
DROP POLICY IF EXISTS "Users can create handover notes" ON public.handover_notes;

CREATE POLICY handover_notes_select ON public.handover_notes
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      WHERE p.tenant_id IN (SELECT public.caller_tenant_ids())
    )
    OR public.current_user_is_super_admin()
  );

CREATE POLICY handover_notes_insert ON public.handover_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT p.id FROM patients p
      WHERE p.tenant_id IN (SELECT public.caller_tenant_ids())
    )
    OR public.current_user_is_super_admin()
  );
