-- ============================================================================
-- CONSOLIDATE DUPLICATE RLS POLICIES (Supabase Performance Advisor)
-- ============================================================================
-- Multiple permissive policies on the same (table, role, cmd) are evaluated
-- with OR logic, meaning PostgreSQL must run ALL of them for every query.
-- This migration collapses duplicates into single authoritative policies.
--
-- Tables fixed: handover_notes, patient_medications, patient_vitals,
--   patients, simulation_template_versions, simulation_templates,
--   tenants, user_programs
--
-- NOTE: public.devices (hacmap_devices_access + upd_devices_tenant) was also
-- flagged but was not included in the policy dump. Run this query then apply
-- the same consolidation pattern manually:
--   SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE tablename = 'devices';
-- ============================================================================


-- ============================================================================
-- 1. HANDOVER_NOTES — consolidate 2 UPDATE policies into 1
-- ============================================================================
-- Old:
--   "Users can acknowledge handover notes"  → USING(auth.role()='authenticated')
--   "Users can update their own recent handover notes" → USING(own AND 24h)
-- Effect: policy 1 already permits any authenticated user to update any row,
--   making policy 2 redundant. Merged = any authenticated user can update.

DROP POLICY IF EXISTS "Users can acknowledge handover notes" ON public.handover_notes;
DROP POLICY IF EXISTS "Users can update their own recent handover notes" ON public.handover_notes;

CREATE POLICY handover_notes_update
  ON public.handover_notes
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- 2. PATIENT_MEDICATIONS — drop 5 redundant/weaker policies
-- ============================================================================
-- _consolidated_* policies are WORSE (missing is_active check, no super_admin).
-- super_admin_medication_access uses deprecated user_has_patient_access().
-- Keep: patient_medications_select/insert/update/delete (already correct).

DROP POLICY IF EXISTS super_admin_medication_access ON public.patient_medications;
DROP POLICY IF EXISTS patient_medications_consolidated_select ON public.patient_medications;
DROP POLICY IF EXISTS patient_medications_consolidated_insert ON public.patient_medications;
DROP POLICY IF EXISTS patient_medications_consolidated_update ON public.patient_medications;
DROP POLICY IF EXISTS patient_medications_consolidated_delete ON public.patient_medications;

-- Remaining clean policies (no changes needed):
--   patient_medications_select  — super_admin OR tenant_users is_active
--   patient_medications_insert  — super_admin OR tenant_users is_active
--   patient_medications_update  — super_admin OR tenant_users is_active
--   patient_medications_delete  — super_admin OR tenant_users is_active


-- ============================================================================
-- 3. PATIENT_VITALS — drop 4 redundant/weaker policies
-- ============================================================================
-- Same pattern: _consolidated_* lack is_active and super_admin bypass.
-- Keep: patient_vitals_select/insert/update/delete (already correct).

DROP POLICY IF EXISTS patient_vitals_consolidated_select ON public.patient_vitals;
DROP POLICY IF EXISTS patient_vitals_consolidated_insert ON public.patient_vitals;
DROP POLICY IF EXISTS patient_vitals_consolidated_update ON public.patient_vitals;
DROP POLICY IF EXISTS patient_vitals_consolidated_delete ON public.patient_vitals;

-- Remaining clean policies (no changes needed):
--   patient_vitals_select  — super_admin OR patients→tenant_users is_active
--   patient_vitals_insert  — super_admin OR patients→tenant_users is_active
--   patient_vitals_update  — super_admin OR patients→tenant_users is_active
--   patient_vitals_delete  — super_admin OR patients→tenant_users is_active


-- ============================================================================
-- 4. PATIENTS — collapse 6 policies (3 ALL + 3 per-op) into 1 ALL policy
-- ============================================================================
-- Problems with existing ALL policies:
--   "Simulation users cannot see regular patients" — NEGATIVE filter, but
--     PERMISSIVE OR semantics make it ineffective anyway (other policies pass)
--   patients_super_admin_all — uses LIMIT 1 (buggy for multi-tenant users)
--   super_admin_patient_access — uses deprecated user_has_patient_access()
-- The per-op policies (delete/insert/update) each run ON TOP of the ALL
-- policies = up to 4 policies evaluated per operation.

DROP POLICY IF EXISTS "Simulation users cannot see regular patients" ON public.patients;
DROP POLICY IF EXISTS patients_super_admin_all ON public.patients;
DROP POLICY IF EXISTS super_admin_patient_access ON public.patients;
DROP POLICY IF EXISTS patients_delete_policy ON public.patients;
DROP POLICY IF EXISTS patients_insert_policy ON public.patients;
DROP POLICY IF EXISTS patients_update_policy ON public.patients;

CREATE POLICY patients_tenant_isolation
  ON public.patients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'::user_role
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = (SELECT auth.uid())
        AND tenant_id = patients.tenant_id
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'::user_role
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = (SELECT auth.uid())
        AND tenant_id = patients.tenant_id
        AND is_active = true
    )
  );


-- ============================================================================
-- 5. SIMULATION_TEMPLATE_VERSIONS — consolidate 2 ALL policies into 1
-- ============================================================================
-- Problem: template_versions_tenant_isolation uses broken
--   current_setting('app.current_tenant_id') which is never set by the app.
--   Replace with tenant_users join (same pattern used throughout).

DROP POLICY IF EXISTS template_versions_super_admin ON public.simulation_template_versions;
DROP POLICY IF EXISTS template_versions_tenant_isolation ON public.simulation_template_versions;

CREATE POLICY template_versions_tenant_isolation
  ON public.simulation_template_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'::user_role
    )
    OR EXISTS (
      SELECT 1 FROM simulation_templates st
      JOIN tenant_users tu ON tu.tenant_id = st.tenant_id
      WHERE st.id = simulation_template_versions.template_id
        AND tu.user_id = (SELECT auth.uid())
        AND tu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'::user_role
    )
    OR EXISTS (
      SELECT 1 FROM simulation_templates st
      JOIN tenant_users tu ON tu.tenant_id = st.tenant_id
      WHERE st.id = simulation_template_versions.template_id
        AND tu.user_id = (SELECT auth.uid())
        AND tu.is_active = true
    )
  );


-- ============================================================================
-- 6. SIMULATION_TEMPLATES SELECT — consolidate 3 SELECT policies into 1
-- ============================================================================
-- templates_select_super_admin ({public})  — super_admin OR admin
-- templates_select_instructor_programs ({authenticated}) — roles + programs
-- templates_select_student ({authenticated}) — status='ready' AND authenticated
-- All three apply to authenticated users = 3 policies per SELECT query.

DROP POLICY IF EXISTS templates_select_super_admin ON public.simulation_templates;
DROP POLICY IF EXISTS templates_select_instructor_programs ON public.simulation_templates;
DROP POLICY IF EXISTS templates_select_student ON public.simulation_templates;

CREATE POLICY templates_select
  ON public.simulation_templates
  FOR SELECT TO authenticated
  USING (
    -- Super admins and coordinators see all templates
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
    -- Admins see templates in their tenant
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::user_role
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    -- Instructors see templates matching their assigned programs
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
    -- Students and nurses see only ready templates
    OR status = 'ready'::simulation_template_status
  );


-- ============================================================================
-- 7. TENANTS SELECT — drop 2 redundant policies, merge 2 into 1
-- ============================================================================
-- "Allow public read access to tenant branding" has USING (true) and applies
-- to {public} — it already permits ANY visitor to read any tenant row.
-- This makes tenants_auth_select (uid IS NOT NULL) completely redundant.
--
-- tenants_coordinator_access + tenants_user_access_via_junction are both
-- {authenticated} SELECT policies — merge into one.

DROP POLICY IF EXISTS tenants_auth_select ON public.tenants;
DROP POLICY IF EXISTS tenants_coordinator_access ON public.tenants;
DROP POLICY IF EXISTS tenants_user_access_via_junction ON public.tenants;

-- Coordinators + regular users in one policy
CREATE POLICY tenants_authenticated_select
  ON public.tenants
  FOR SELECT TO authenticated
  USING (
    -- Coordinators can see all tenants
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid()) AND up.role = 'coordinator'::user_role
    )
    -- All users can see tenants they belong to
    OR id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  );

-- "Allow public read access to tenant branding" ({public}, USING true) remains
-- as-is — required for the unauthenticated login page tenant lookup.


-- ============================================================================
-- 8. USER_PROGRAMS SELECT — consolidate 2 SELECT policies into 1
-- ============================================================================
-- user_programs_view_own: user_id = auth.uid()
-- user_programs_view_tenant: coordinator/super_admin AND programs in their tenant
--   (uses user_tenant_access — replaced with canonical tenant_users)

DROP POLICY IF EXISTS user_programs_view_own ON public.user_programs;
DROP POLICY IF EXISTS user_programs_view_tenant ON public.user_programs;

CREATE POLICY user_programs_select
  ON public.user_programs
  FOR SELECT TO authenticated
  USING (
    -- Users can see their own program assignments
    user_id = (SELECT auth.uid())
    -- Coordinators and super_admins can see all assignments in their tenants
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid())
          AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
      )
      AND program_id IN (
        SELECT p.id FROM programs p
        WHERE p.tenant_id IN (
          SELECT tenant_id FROM tenant_users
          WHERE user_id = (SELECT auth.uid()) AND is_active = true
        )
      )
    )
  );


-- ============================================================================
-- VERIFY — run after applying to confirm no tables remain with duplicates
-- ============================================================================
-- SELECT tablename, cmd, array_agg(policyname ORDER BY policyname) AS policies, COUNT(*)
-- FROM pg_policies
-- WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
-- GROUP BY tablename, cmd, roles
-- HAVING COUNT(*) > 1
-- ORDER BY tablename, cmd;
-- Expected: 0 rows (except possibly devices — fix separately)
