-- ============================================================================
-- FIX RLS POLICY ALWAYS TRUE — REMAINING TABLES (Supabase Security Advisor)
-- ============================================================================
-- Addresses the 4 remaining "RLS Policy Always True" warnings that were NOT
-- resolved by migration 20260415000001.
--
-- Tables fixed:
--   1. backup_audit_log   — INSERT WITH CHECK (true)  → restrict to own user_id
--   2. handover_notes     — UPDATE USING/CHECK (true) → patient→tenant_users join
--   3. profiles           — INSERT WITH CHECK (true)  → restrict to id = auth.uid()
--   4. system_logs        — INSERT WITH CHECK (true)  → restrict to own user_id
--
-- NOT changed:
--   - contact_submissions: anonymous INSERT is intentional (public contact form)
-- ============================================================================


-- ============================================================================
-- 1. BACKUP_AUDIT_LOG
-- ============================================================================
-- Old: backup_audit_insert_authenticated (migration 20260415000001)
--      FOR INSERT TO authenticated WITH CHECK (true)
-- Problem: any authenticated user can log arbitrary audit entries, including
--          fabricating other users' backup actions.
-- Fix: user_id must match the current session — enforce audit integrity.

DROP POLICY IF EXISTS backup_audit_insert_authenticated ON public.backup_audit_log;

CREATE POLICY backup_audit_insert_authenticated
  ON public.backup_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));


-- ============================================================================
-- 2. HANDOVER_NOTES
-- ============================================================================
-- Old: handover_notes_update (migration 20260415000003)
--      FOR UPDATE TO authenticated USING (true) WITH CHECK (true)
-- Problem: any authenticated user can update any handover note in any tenant.
-- Fix: update allowed only if the note belongs to a patient in a tenant the
--      current user is a member of (or they are super_admin).
--
-- handover_notes.patient_id → patients.id → patients.tenant_id
-- so we join through patients → tenant_users for isolation.

DROP POLICY IF EXISTS handover_notes_update ON public.handover_notes;

CREATE POLICY handover_notes_update
  ON public.handover_notes
  FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT p.id
      FROM patients p
      INNER JOIN tenant_users tu ON tu.tenant_id = p.tenant_id
      WHERE tu.user_id = (SELECT auth.uid())
        AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT p.id
      FROM patients p
      INNER JOIN tenant_users tu ON tu.tenant_id = p.tenant_id
      WHERE tu.user_id = (SELECT auth.uid())
        AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'
    )
  );


-- ============================================================================
-- 3. PROFILES
-- ============================================================================
-- Old: "System can insert profiles"
--      FOR INSERT TO public WITH CHECK (true)
-- Problem: any visitor (even unauthenticated) can insert a profile row.
-- Why WITH CHECK (true) was originally used:
--   The Supabase auth signup trigger (handle_new_user) runs with the postgres
--   service role, which bypasses RLS entirely — it does NOT need this policy.
--   The true permissive policy was therefore unnecessary.
-- Fix: restrict to the current authenticated user inserting their own profile.

DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));


-- ============================================================================
-- 4. SYSTEM_LOGS
-- ============================================================================
-- Old: system_logs_insert_authenticated (migration 20260415000001)
--      FOR INSERT TO authenticated WITH CHECK (true)
-- Problem: any authenticated user can insert log rows attributed to any user_id.
-- Fix: user_id must either be NULL (system/pre-auth log entries) or match the
--      current session user. The systemLogger sends user_id = null for errors
--      that occur before a session is fully established, so we allow NULL.

DROP POLICY IF EXISTS system_logs_insert_authenticated ON public.system_logs;

CREATE POLICY system_logs_insert_authenticated
  ON public.system_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL
    OR user_id = (SELECT auth.uid())
  );


-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'backup_audit_log', 'handover_notes', 'profiles', 'system_logs'
--   )
-- ORDER BY tablename, cmd;
--
-- Expected: no policy should have qual = 'true' or with_check = 'true'
-- (except contact_submissions which is intentionally left as-is)
