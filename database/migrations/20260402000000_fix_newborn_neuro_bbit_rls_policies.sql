-- =====================================================
-- FIX: NEWBORN / NEURO / BBIT RLS POLICIES
-- =====================================================
-- Migration: 20260402000000
-- Issue: current_setting('app.current_tenant_id') is NEVER set by the application.
--   Policies using it evaluate to: tenant_id = NULL → always FALSE.
--   Only super_admin users could read/write these tables.
--   Instructors and students got 0 rows, causing "0 students, 0 total entries"
--   on simulation complete.
-- Solution: Allow all authenticated users (USING true).
--   Tenant isolation is enforced at application level via explicit .eq('tenant_id', ...)
--   in every query — same pattern as device_assessments (migration 20251117150000).
-- =====================================================

-- ── patient_newborn_assessments ──────────────────────────────────

DROP POLICY IF EXISTS newborn_assessments_tenant_isolation ON public.patient_newborn_assessments;
DROP POLICY IF EXISTS newborn_assessments_super_admin ON public.patient_newborn_assessments;

CREATE POLICY newborn_assessments_allow_authenticated
  ON public.patient_newborn_assessments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY newborn_assessments_allow_authenticated ON public.patient_newborn_assessments IS
'Allows all authenticated users. Tenant isolation enforced at application level via explicit tenant_id in queries.';

-- ── patient_neuro_assessments ────────────────────────────────────

DROP POLICY IF EXISTS neuro_assessments_tenant_isolation ON public.patient_neuro_assessments;
DROP POLICY IF EXISTS neuro_assessments_super_admin ON public.patient_neuro_assessments;

CREATE POLICY neuro_assessments_allow_authenticated
  ON public.patient_neuro_assessments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY neuro_assessments_allow_authenticated ON public.patient_neuro_assessments IS
'Allows all authenticated users. Tenant isolation enforced at application level via explicit tenant_id in queries.';

-- ── patient_bbit_entries ─────────────────────────────────────────

DROP POLICY IF EXISTS bbit_entries_tenant_isolation ON public.patient_bbit_entries;
DROP POLICY IF EXISTS bbit_entries_super_admin ON public.patient_bbit_entries;

CREATE POLICY bbit_entries_allow_authenticated
  ON public.patient_bbit_entries
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY bbit_entries_allow_authenticated ON public.patient_bbit_entries IS
'Allows all authenticated users. Tenant isolation enforced at application level via explicit tenant_id in queries.';
