-- ============================================================================
-- EMERGENCY ROLLBACK for 20260921000000..20260921000003
-- ============================================================================
--
--   !! THIS SCRIPT REINTRODUCES A KNOWN PRIVILEGE ESCALATION !!
--
-- It restores tenant_users_auth_select / tenant_users_auth_insert, which let
-- ANY authenticated user read every tenant_id on the platform and then enrol
-- themselves into any tenant -- conferring read/write on other institutions'
-- patients, medications, vitals, labs and notes. That is the whole point of a
-- rollback, but it means this is a stop-the-bleeding measure, not a resting
-- state. Re-apply the hardening as soon as the client issue is understood.
--
-- WHEN TO USE THIS INSTEAD OF A BACKUP RESTORE
--
-- The project has daily physical backups and pitr_enabled = false, so a
-- restore rolls the ENTIRE database to ~02:35 local and destroys every chart
-- entry, MAR administration and simulation run since. This change touches only
-- functions and policies -- no data is rewritten -- so a targeted revert is
-- both faster and lossless. Prefer it. Keep the backup for genuine corruption.
--
-- WHAT IT DOES NOT UNDO
--
-- The functions added by ...000000 and ...000003 (user_may_join_tenant,
-- ensure_tenant_access, caller_tenant_ids, caller_may_administer_tenant,
-- caller_profile_role, caller_tenant_comember_ids) are deliberately LEFT IN
-- PLACE. Once the policies below are restored nothing references them, they
-- are inert, and dropping them risks a dependency error at exactly the moment
-- you need this to succeed. Drop them later, deliberately, if you want.
--
-- The client is a separate concern: a deployed build that calls
-- ensure_tenant_access() keeps working after this runs, because the function
-- still exists and the permissive INSERT policy it was replacing is back.
--
--   psql "$PROD_DB_URL" -f supabase/rollback/20260921_rollback_tenant_access_hardening.sql
--
-- Verified against a local stack 2026-09-22: after running this,
-- verify_rls_isolation.sql fails at assertion 3 (as it must), confirming the
-- pre-fix state is genuinely restored rather than approximately restored.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Remove the hardened policies (from ...000002 and ...000003)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS tenant_users_select       ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_admin_insert ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_admin_update ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_admin_delete ON public.tenant_users;
DROP POLICY IF EXISTS user_profiles_select      ON public.user_profiles;
DROP POLICY IF EXISTS handover_notes_select     ON public.handover_notes;
DROP POLICY IF EXISTS handover_notes_insert     ON public.handover_notes;

-- ----------------------------------------------------------------------------
-- 2. Restore the original policies, verbatim from the pre-fix schema dump
-- ----------------------------------------------------------------------------
-- tenant_users: SELECT and INSERT are the permissive pair. UPDATE and DELETE
-- were already scoped to the caller's own row -- restored as they were.
CREATE POLICY "tenant_users_auth_select" ON public.tenant_users
  FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));

CREATE POLICY "tenant_users_auth_insert" ON public.tenant_users
  FOR INSERT WITH CHECK (((SELECT auth.uid()) IS NOT NULL));

CREATE POLICY "tenant_users_auth_update" ON public.tenant_users
  FOR UPDATE USING (("user_id" = (SELECT auth.uid())))
          WITH CHECK (("user_id" = (SELECT auth.uid())));

CREATE POLICY "tenant_users_auth_delete" ON public.tenant_users
  FOR DELETE USING (("user_id" = (SELECT auth.uid())));

-- tenants: these sat alongside the correct tenants_super_admin_* policies.
-- Permissive policies OR together, so restoring these makes the super_admin
-- restriction decorative again -- which is the pre-fix behaviour.
CREATE POLICY "tenants_auth_insert" ON public.tenants
  FOR INSERT WITH CHECK (((SELECT auth.uid()) IS NOT NULL));

CREATE POLICY "tenants_auth_update" ON public.tenants
  FOR UPDATE USING (((SELECT auth.uid()) IS NOT NULL))
          WITH CHECK (((SELECT auth.uid()) IS NOT NULL));

CREATE POLICY "tenants_auth_delete" ON public.tenants
  FOR DELETE USING (((SELECT auth.uid()) IS NOT NULL));

-- user_profiles: unscoped directory read.
CREATE POLICY "user_profiles_auth_select" ON public.user_profiles
  FOR SELECT USING (((SELECT auth.uid()) IS NOT NULL));

-- handover_notes: the original pair keyed off auth.role(), not patient access.
-- The SELECT policy's name claims scoping it never actually performed.
CREATE POLICY "Users can view handover notes for accessible patients"
  ON public.handover_notes
  FOR SELECT USING (((SELECT auth.role()) = 'authenticated'::text));

CREATE POLICY "Users can create handover notes"
  ON public.handover_notes
  FOR INSERT WITH CHECK (((SELECT auth.role()) = 'authenticated'::text));

-- ----------------------------------------------------------------------------
-- 3. Restore the original current_user_is_super_admin() (undoes ...000001)
-- ----------------------------------------------------------------------------
-- Restores the user_metadata fallback. That fallback is forgeable -- it is why
-- ...000001 existed -- so this too is temporary.
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
  ) INTO is_admin;

  IF NOT is_admin THEN
    SELECT COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    ) INTO is_admin;
  END IF;

  RETURN is_admin;
EXCEPTION
  WHEN OTHERS THEN
    RETURN COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Assert the revert actually landed before committing
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_missing text;
  v_leftover text;
BEGIN
  SELECT string_agg(p, ', ') INTO v_missing
  FROM unnest(ARRAY['tenant_users_auth_select','tenant_users_auth_insert',
                    'tenant_users_auth_update','tenant_users_auth_delete',
                    'tenants_auth_insert','tenants_auth_update','tenants_auth_delete',
                    'user_profiles_auth_select']) AS p
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname = p);

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: policies not restored: %', v_missing;
  END IF;

  SELECT string_agg(policyname, ', ') INTO v_leftover
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN ('tenant_users_select','tenant_users_admin_insert',
                       'tenant_users_admin_update','tenant_users_admin_delete',
                       'user_profiles_select','handover_notes_select',
                       'handover_notes_insert');

  IF v_leftover IS NOT NULL THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: hardened policies remain: %', v_leftover;
  END IF;

  IF pg_get_functiondef('public.current_user_is_super_admin()'::regprocedure)
       NOT ILIKE '%user_metadata%' THEN
    RAISE EXCEPTION 'ROLLBACK INCOMPLETE: current_user_is_super_admin() not reverted';
  END IF;

  RAISE NOTICE 'ROLLBACK COMPLETE -- pre-fix state restored. The escalation is OPEN again.';
END $$;

COMMIT;
