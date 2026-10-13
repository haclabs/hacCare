-- ============================================================================
-- CRITICAL FIX: RLS policies referencing app.current_tenant_id are always-false
-- ============================================================================
-- Reported symptom (live, 2026-09-18): students in an active simulation get
--   42501 "new row violates row-level security policy for table
--   patient_system_assessments" when saving a flowsheet assessment.
--
-- Root cause: patient_system_assessments (and 6 more tables, see below) were
-- created with a tenant-isolation policy of the form:
--   USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
-- This app NEVER runs `SET app.current_tenant_id = ...` anywhere — every other
-- table in this codebase enforces tenant isolation via an explicit
-- `tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
-- AND is_active = true)` check instead (see patient_bbit_entries,
-- patient_neuro_assessments, patient_medications for the working pattern).
-- Confirmed live: `SELECT current_setting('app.current_tenant_id', true)`
-- returns NULL on this connection, so `tenant_id = NULL::uuid` is NULL (not
-- true) for every row, for every user, always. A later migration
-- (20260521000002_fix_psa_rls_super_admin.sql) bolted on a super_admin-only
-- bypass policy, which is why this looked "fixed" in admin testing but any
-- non-super_admin (nurse/instructor/student) INSERT/UPDATE/DELETE still fails
-- RLS 100% of the time.
--
-- Affected tables (found via `pg_policies` scan for '%app.current_tenant_id%'):
--   patient_system_assessments (Flowsheets — the reported bug)
--   tr_active_living_profiles, tr_assessment_scores, tr_interdisciplinary_interps,
--   tr_progress_notes, tr_screening_entries, tr_treatment_plan_rows (TR module —
--   same bug, not yet reported but equally broken for any non-super_admin)
--   medications_catalog (admin/coordinator catalog-write only — SELECT was
--   separately open via catalog_read_all so reads were unaffected)
--
-- Fix: replace each broken policy with the working tenant_users-membership
-- pattern (folding the redundant super_admin bypass policy into the same
-- policy, matching patient_bbit_entries/patient_neuro_assessments exactly).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- patient_system_assessments (Flowsheets)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS psa_tenant_isolation ON patient_system_assessments;
DROP POLICY IF EXISTS psa_super_admin ON patient_system_assessments;

CREATE POLICY psa_tenant_isolation
  ON patient_system_assessments
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- TR / Leisure module tables — identical bug, same fix
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tr_alp_tenant_isolation ON tr_active_living_profiles;
DROP POLICY IF EXISTS tr_alp_super_admin ON tr_active_living_profiles;
CREATE POLICY tr_alp_tenant_isolation
  ON tr_active_living_profiles
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS tr_scores_tenant_isolation ON tr_assessment_scores;
DROP POLICY IF EXISTS tr_scores_super_admin ON tr_assessment_scores;
CREATE POLICY tr_scores_tenant_isolation
  ON tr_assessment_scores
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS tr_interps_tenant_isolation ON tr_interdisciplinary_interps;
DROP POLICY IF EXISTS tr_interps_super_admin ON tr_interdisciplinary_interps;
CREATE POLICY tr_interps_tenant_isolation
  ON tr_interdisciplinary_interps
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS tr_notes_tenant_isolation ON tr_progress_notes;
DROP POLICY IF EXISTS tr_notes_super_admin ON tr_progress_notes;
CREATE POLICY tr_notes_tenant_isolation
  ON tr_progress_notes
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS tr_screening_tenant_isolation ON tr_screening_entries;
DROP POLICY IF EXISTS tr_screening_super_admin ON tr_screening_entries;
CREATE POLICY tr_screening_tenant_isolation
  ON tr_screening_entries
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS tr_plan_tenant_isolation ON tr_treatment_plan_rows;
DROP POLICY IF EXISTS tr_plan_super_admin ON tr_treatment_plan_rows;
CREATE POLICY tr_plan_tenant_isolation
  ON tr_treatment_plan_rows
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- medications_catalog — admin/coordinator write policy only (catalog_read_all
-- SELECT-true policy and catalog_super_admin_write are untouched/unaffected)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS catalog_admin_write ON medications_catalog;
CREATE POLICY catalog_admin_write
  ON medications_catalog
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role])
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true)
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = ANY (ARRAY['admin'::user_role, 'coordinator'::user_role])
    )
  );
