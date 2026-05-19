-- ============================================================================
-- FIX MULTIPLE PERMISSIVE POLICIES (Supabase Performance Advisor)
-- ============================================================================
-- PostgreSQL evaluates ALL permissive policies with OR logic, meaning every
-- query triggers every matching policy.  When an ALL policy co-exists with a
-- per-command policy for the same (table, role, cmd), both run on every
-- SELECT (or INSERT/UPDATE/DELETE).
--
-- Root cause for every warning here:
--   A *_management ALL policy was left in place after a per-command SELECT
--   policy was added.  The ALL policy covers SELECT by default, creating a
--   second SELECT path.
--
-- Fix pattern applied consistently:
--   Convert *_management ALL policies → explicit INSERT + UPDATE + DELETE
--   policies with identical USING / WITH CHECK expressions.  This removes the
--   implicit SELECT overlap, leaving exactly ONE SELECT policy per table.
--
-- Tables fixed:
--   1.  lab_result_refs           — ALL + SELECT  → split ALL into I/U/D
--   2.  program_announcements     — ALL + SELECT  → split ALL into I/U/D
--   3.  programs                  — ALL + SELECT  → split ALL into I/U/D
--   4.  scheduled_simulations     — ALL + SELECT  → split ALL into I/U/D
--   5.  simulation_templates      — 2× UPDATE + 2× DELETE  → merge each pair
--   6.  student_roster            — ALL + SELECT  → split ALL into I/U/D
--   7.  tenants                   — 3× SELECT + ALL  → merge SELECTs; split ALL
--   8.  user_programs             — ALL + SELECT  → split ALL into I/U/D
-- ============================================================================


-- ============================================================================
-- 1. LAB_RESULT_REFS
-- ============================================================================
-- Surviving policies:
--   "lab_result_refs_select"  FOR SELECT USING (true)        ← also RLS-always-true
--   "lab_result_refs_modify"  FOR ALL    admin/super_admin
--
-- Fix:
--   a) Replace lab_result_refs_select with a non-trivially-true expression.
--   b) Split lab_result_refs_modify ALL → INSERT + UPDATE + DELETE so the
--      admin SELECT is not duplicated alongside the open SELECT.

DROP POLICY IF EXISTS "lab_result_refs_select" ON public.lab_result_refs;
DROP POLICY IF EXISTS "lab_result_refs_modify" ON public.lab_result_refs;

-- All authenticated users can read reference data (no tenant — global lookup table)
CREATE POLICY lab_result_refs_select
  ON public.lab_result_refs
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Only admins/super_admins can write reference data
CREATE POLICY lab_result_refs_insert
  ON public.lab_result_refs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY lab_result_refs_update
  ON public.lab_result_refs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY lab_result_refs_delete
  ON public.lab_result_refs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'super_admin')
    )
  );


-- ============================================================================
-- 2. PROGRAM_ANNOUNCEMENTS
-- ============================================================================
-- Surviving policies:
--   program_announcements_management  FOR ALL  super_admin/coordinator/instructor/admin
--   program_announcements_view_program FOR SELECT  program membership
--
-- Fix: split the ALL into I/U/D only, leaving SELECT to view_program policy.

DROP POLICY IF EXISTS program_announcements_management ON public.program_announcements;

CREATE POLICY program_announcements_insert
  ON public.program_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  );

CREATE POLICY program_announcements_update
  ON public.program_announcements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  );

CREATE POLICY program_announcements_delete
  ON public.program_announcements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  );


-- ============================================================================
-- 3. PROGRAMS
-- ============================================================================
-- Surviving policies:
--   programs_management      FOR ALL    super_admin/coordinator
--   programs_tenant_isolation FOR SELECT tenant_users join
--
-- Fix: split ALL into I/U/D.

DROP POLICY IF EXISTS programs_management ON public.programs;

CREATE POLICY programs_insert
  ON public.programs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
  );

CREATE POLICY programs_update
  ON public.programs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
  );

CREATE POLICY programs_delete
  ON public.programs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
  );


-- ============================================================================
-- 4. SCHEDULED_SIMULATIONS
-- ============================================================================
-- Surviving policies:
--   scheduled_simulations_management  FOR ALL    super_admin/coordinator/admin/instructor
--   scheduled_simulations_view_program FOR SELECT program membership
--
-- Fix: split ALL into I/U/D.

DROP POLICY IF EXISTS scheduled_simulations_management ON public.scheduled_simulations;

CREATE POLICY scheduled_simulations_insert
  ON public.scheduled_simulations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  );

CREATE POLICY scheduled_simulations_update
  ON public.scheduled_simulations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  );

CREATE POLICY scheduled_simulations_delete
  ON public.scheduled_simulations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  );


-- ============================================================================
-- 5. SIMULATION_TEMPLATES — merge duplicate UPDATE and DELETE pairs
-- ============================================================================
-- Surviving UPDATE policies (both for {authenticated}):
--   templates_update_instructor_programs — comprehensive role + program check
--   "templates_update_policy"            — created_by OR admin/super_admin (legacy)
--
-- Surviving DELETE policies (both for {authenticated}):
--   templates_delete_instructor_programs — comprehensive role + program check
--   "templates_delete_policy"            — created_by OR admin/super_admin (legacy)
--
-- Fix: add the missing "created_by" condition to the comprehensive policies,
-- then drop the legacy simple policies.

-- UPDATE: merge templates_update_policy into templates_update_instructor_programs
DROP POLICY IF EXISTS "templates_update_policy" ON public.simulation_templates;
DROP POLICY IF EXISTS templates_update_instructor_programs ON public.simulation_templates;

CREATE POLICY templates_update
  ON public.simulation_templates
  FOR UPDATE TO authenticated
  USING (
    -- Template owner can always update their own templates
    created_by = (SELECT auth.uid())
    -- Super admins and coordinators see all
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
    -- Admins in the same tenant
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::user_role
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    -- Instructors with matching program assignment
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::user_role
      )
      AND (
        primary_categories IS NULL
        OR primary_categories = '{}'::text[]
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::user_role
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::user_role
      )
      AND (
        primary_categories IS NULL
        OR primary_categories = '{}'::text[]
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  );

-- DELETE: same merge
DROP POLICY IF EXISTS "templates_delete_policy" ON public.simulation_templates;
DROP POLICY IF EXISTS templates_delete_instructor_programs ON public.simulation_templates;

CREATE POLICY templates_delete
  ON public.simulation_templates
  FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::user_role
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::user_role
      )
      AND (
        primary_categories IS NULL
        OR primary_categories = '{}'::text[]
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  );


-- ============================================================================
-- 6. STUDENT_ROSTER
-- ============================================================================
-- Surviving policies:
--   student_roster_management  FOR ALL    management + instructor roles
--   student_roster_view_program FOR SELECT  program membership
--
-- Fix: split ALL into I/U/D.

DROP POLICY IF EXISTS student_roster_management ON public.student_roster;

CREATE POLICY student_roster_insert
  ON public.student_roster
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY[
          'super_admin'::user_role,
          'coordinator'::user_role,
          'admin'::user_role,
          'instructor'::user_role
        ])
    )
  );

CREATE POLICY student_roster_update
  ON public.student_roster
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY[
          'super_admin'::user_role,
          'coordinator'::user_role,
          'admin'::user_role,
          'instructor'::user_role
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY[
          'super_admin'::user_role,
          'coordinator'::user_role,
          'admin'::user_role,
          'instructor'::user_role
        ])
    )
  );

CREATE POLICY student_roster_delete
  ON public.student_roster
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY[
          'super_admin'::user_role,
          'coordinator'::user_role,
          'admin'::user_role,
          'instructor'::user_role
        ])
    )
  );


-- ============================================================================
-- 7. TENANTS
-- ============================================================================
-- Surviving SELECT policies (3 for {authenticated}):
--   tenants_authenticated_select        — coordinator OR tenant_users member
--   tenants_instructors_see_program_tenants — program-type tenants via user_programs
--   tenants_super_admin_access          — ALL policy (= covers SELECT too)
--
-- Fix:
--   a) Merge tenants_instructors_see_program_tenants into
--      tenants_authenticated_select (one consolidated SELECT).
--   b) Convert tenants_super_admin_access ALL → INSERT + UPDATE + DELETE
--      so it no longer overlaps with SELECT.

-- Step 1: rebuild the consolidated SELECT
DROP POLICY IF EXISTS tenants_authenticated_select ON public.tenants;
DROP POLICY IF EXISTS tenants_instructors_see_program_tenants ON public.tenants;

CREATE POLICY tenants_authenticated_select
  ON public.tenants
  FOR SELECT TO authenticated
  USING (
    -- Super admins see all tenants
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin'::user_role
    )
    -- Coordinators see all tenants
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'coordinator'::user_role
    )
    -- All users see tenants they are members of
    OR id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    -- Instructors see program-type tenants they are assigned to.
    -- Uses `program_id` from the CURRENT ROW — no self-join on tenants
    -- (self-join causes infinite recursion 42P17 — fixed in 20260416000002).
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

-- Step 2: convert tenants_super_admin_access ALL → I/U/D
DROP POLICY IF EXISTS tenants_super_admin_access ON public.tenants;

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
-- 8. USER_PROGRAMS
-- ============================================================================
-- Surviving policies:
--   user_programs_select      FOR SELECT  own rows + coord/super_admin
--   user_programs_management  FOR ALL     super_admin/coordinator (covers SELECT)
--
-- Fix: split ALL into I/U/D.

DROP POLICY IF EXISTS user_programs_management ON public.user_programs;

CREATE POLICY user_programs_insert
  ON public.user_programs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
  );

CREATE POLICY user_programs_update
  ON public.user_programs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
  );

CREATE POLICY user_programs_delete
  ON public.user_programs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
  );


-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- SELECT tablename, cmd, roles, array_agg(policyname ORDER BY policyname) AS policies, COUNT(*)
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'lab_result_refs', 'program_announcements', 'programs',
--     'scheduled_simulations', 'simulation_templates', 'student_roster',
--     'tenants', 'user_programs'
--   )
--   AND permissive = 'PERMISSIVE'
-- GROUP BY tablename, cmd, roles
-- HAVING COUNT(*) > 1
-- ORDER BY tablename, cmd;
-- Expected: 0 rows
