-- Migration: Add super_admin bypass policy to patient_system_assessments
-- Date: 2026-05-21
--
-- The table was created with only the tenant_isolation policy. When
-- app.current_tenant_id is not set (e.g. super_admin testing without a tenant
-- context), that policy evaluates to NULL and blocks ALL access including
-- super admins. This matches the pattern used by patient_bbit_entries,
-- patient_neuro_assessments, and other patient tables.

CREATE POLICY psa_super_admin
  ON patient_system_assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
