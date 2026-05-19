-- ============================================================================
-- FIX RLS POLICY ALWAYS TRUE (Supabase Security Advisor)
-- ============================================================================
-- Replaces USING (true) / WITH CHECK (true) policies with proper tenant
-- isolation using the tenant_users join pattern.
--
-- Access model:
--   - Any authenticated user who belongs to a tenant (via tenant_users) can
--     read and write that tenant's clinical data.
--   - This covers nurses/students in simulation tenants, instructors editing
--     template tenants (added to tenant_users by enterTemplateTenant()), and
--     admins/coordinators.
--   - super_admin gets bypass access across all tenants.
--
-- NOT changed:
--   - contact_submissions: anon INSERT is intentional (public contact form)
--   - profiles: INSERT for {public} is required by Supabase auth signup trigger
-- ============================================================================

-- ============================================================================
-- 1. DEVICE ASSESSMENTS
-- ============================================================================
DROP POLICY IF EXISTS device_assessments_allow_authenticated ON public.device_assessments;

CREATE POLICY device_assessments_tenant_isolation
  ON public.device_assessments
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

-- ============================================================================
-- 2. PATIENT BBIT ENTRIES
-- ============================================================================
DROP POLICY IF EXISTS bbit_entries_allow_authenticated ON public.patient_bbit_entries;

CREATE POLICY bbit_entries_tenant_isolation
  ON public.patient_bbit_entries
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

-- ============================================================================
-- 3. PATIENT INTAKE/OUTPUT EVENTS
-- ============================================================================
DROP POLICY IF EXISTS patient_intake_output_events_allow_authenticated ON public.patient_intake_output_events;

CREATE POLICY intake_output_events_tenant_isolation
  ON public.patient_intake_output_events
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

-- ============================================================================
-- 4. PATIENT NEURO ASSESSMENTS
-- ============================================================================
DROP POLICY IF EXISTS neuro_assessments_allow_authenticated ON public.patient_neuro_assessments;

CREATE POLICY neuro_assessments_tenant_isolation
  ON public.patient_neuro_assessments
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

-- ============================================================================
-- 5. PATIENT NEWBORN ASSESSMENTS
-- ============================================================================
DROP POLICY IF EXISTS newborn_assessments_allow_authenticated ON public.patient_newborn_assessments;

CREATE POLICY newborn_assessments_tenant_isolation
  ON public.patient_newborn_assessments
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

-- ============================================================================
-- 6. PATIENT WOUNDS
-- ============================================================================
-- patient_wounds has no direct tenant_id — isolation is via patients table.
-- The existing INSERT policy already uses this join correctly.
-- Fix SELECT (USING true), UPDATE (USING true), and DELETE ({public} role).

DROP POLICY IF EXISTS "Authenticated users can read patient wounds" ON public.patient_wounds;
DROP POLICY IF EXISTS "Authenticated users can update patient wounds" ON public.patient_wounds;
DROP POLICY IF EXISTS "Admins can delete patient wounds" ON public.patient_wounds;

CREATE POLICY patient_wounds_select
  ON public.patient_wounds
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() AND tenant_users.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY patient_wounds_update
  ON public.patient_wounds
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() AND tenant_users.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() AND tenant_users.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Only admins and super_admins can delete wounds, within their tenant
CREATE POLICY patient_wounds_delete
  ON public.patient_wounds
  FOR DELETE TO authenticated
  USING (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() AND tenant_users.is_active = true
      )
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

-- ============================================================================
-- 7. BACKUP AUDIT LOG
-- ============================================================================
-- Was: INSERT for {public} (includes anonymous) WITH CHECK (true)
-- Fix: Restrict to {authenticated} only — backup operations require a session.
-- WITH CHECK (true) remains correct for an append-only audit log.

DROP POLICY IF EXISTS backup_audit_insert_all ON public.backup_audit_log;

CREATE POLICY backup_audit_insert_authenticated
  ON public.backup_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 8. SYSTEM LOGS
-- ============================================================================
-- Was: INSERT for {public} (includes anonymous) WITH CHECK (true)
-- Fix: Restrict to {authenticated} — the systemLogger runs only when a user
-- session exists. With CHECK (true) is correct for an append-only log table.

DROP POLICY IF EXISTS anyone_insert_system_logs ON public.system_logs;

CREATE POLICY system_logs_insert_authenticated
  ON public.system_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- NOT CHANGED
-- ============================================================================
-- contact_submissions "Anyone can submit contact form":
--   Intentional — this is a public-facing contact form that must accept
--   submissions from unauthenticated (anon) visitors.
--
-- profiles "System can insert profiles":
--   Required by Supabase's auth signup trigger which fires before the user
--   session is established. Restricting to {authenticated} would break signup.
