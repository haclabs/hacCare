-- ============================================================================
-- HOTFIX: Tenants RLS Policy Infinite Recursion (42P17)
-- ============================================================================
-- Migration 20260416000001 introduced infinite recursion in
-- tenants_authenticated_select.  The instructor branch contained:
--
--   AND id IN (
--     SELECT t.id FROM tenants t          ← triggers tenants RLS again!
--     JOIN programs p ON p.id = t.program_id
--     ...
--   )
--
-- PostgreSQL evaluates the RLS policy once per row of "tenants", so querying
-- "tenants" inside the policy for "tenants" causes infinite recursion.
--
-- Fix: the policy already has the current row in scope, so use the column
-- `program_id` from the row directly — no self-join needed.
--
-- Also re-applies the Step 2 (super_admin I/U/D) in case the prior
-- migration rolled back entirely and left the ALL policy intact.
-- ============================================================================

-- Drop whatever state exists (handles both "rolled back" and "broken policy" cases)
DROP POLICY IF EXISTS tenants_authenticated_select             ON public.tenants;
DROP POLICY IF EXISTS tenants_instructors_see_program_tenants  ON public.tenants;
DROP POLICY IF EXISTS tenants_super_admin_access               ON public.tenants;
DROP POLICY IF EXISTS tenants_super_admin_insert               ON public.tenants;
DROP POLICY IF EXISTS tenants_super_admin_update               ON public.tenants;
DROP POLICY IF EXISTS tenants_super_admin_delete               ON public.tenants;

-- ─────────────────────────────────────────────────────────────────────────────
-- Single consolidated SELECT policy (no self-join → no recursion)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY tenants_authenticated_select
  ON public.tenants
  FOR SELECT TO authenticated
  USING (
    -- Super admins see all tenants
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'::user_role
    )
    -- Coordinators see all tenants
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'coordinator'::user_role
    )
    -- All users see tenants they are members of
    OR id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid())
        AND is_active = true
    )
    -- Instructors see program-type tenants assigned to their programs.
    -- Uses `program_id` from the CURRENT ROW — no self-join on tenants.
    OR (
      tenant_type = 'program'
      AND program_id IN (
        SELECT p.id
        FROM programs p
        JOIN user_programs up_prog ON up_prog.program_id = p.id
        WHERE up_prog.user_id = (SELECT auth.uid())
          AND p.is_active = true
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Super-admin write policies (I/U/D only — no SELECT overlap)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY tenants_super_admin_insert
  ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'::user_role
    )
  );

CREATE POLICY tenants_super_admin_update
  ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'::user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'::user_role
    )
  );

CREATE POLICY tenants_super_admin_delete
  ON public.tenants
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'::user_role
    )
  );


-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- SELECT policyname, cmd, permissive, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'tenants'
-- ORDER BY cmd, policyname;
-- Expected:
--   tenants_authenticated_select  SELECT  PERMISSIVE  (1 row only)
--   tenants_super_admin_delete    DELETE  PERMISSIVE
--   tenants_super_admin_insert    INSERT  PERMISSIVE
--   tenants_super_admin_update    UPDATE  PERMISSIVE
-- ============================================================================
