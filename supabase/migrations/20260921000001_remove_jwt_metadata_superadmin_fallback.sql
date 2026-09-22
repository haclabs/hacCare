-- ============================================================================
-- SECURITY FIX: remove the user-forgeable super_admin fallback
-- ============================================================================
-- current_user_is_super_admin() checked user_profiles first, then fell back to:
--
--   SELECT COALESCE((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role'
--                   = 'super_admin', false)
--
-- `user_metadata` mirrors auth.users.raw_user_meta_data, which the *user* can
-- write from the browser via supabase.auth.updateUser({ data: { ... } }). Any
-- authenticated user whose profile is not super_admin fell through to that
-- branch, so setting their own metadata granted them super_admin for every
-- policy calling this function. The EXCEPTION handler repeated the same fallback.
--
-- Reachable surface (audited 2026-09-21):
--   * user_profiles_delete       [DELETE] -> delete ANY user's profile
--   * user_sessions.super_admin_sessions_access [ALL] -> all session records
--   * set_super_admin_tenant_context()  (EXECUTE granted to authenticated)
-- get_super_admin_tenant_context(), user_has_patient_access() and
-- get_user_role() also call it but are NOT granted to `authenticated` and appear
-- in zero policies, so they were not exploitable from the client.
--
-- SAFE TO REMOVE: verified against production before writing this migration --
--   users whose metadata claims super_admin ............ 0
--   claims without a matching profile role ............. 0
--   real (profile-based) super_admins .................. 2
-- Nothing depends on the fallback. The original justification was "in case
-- user_profiles doesn't exist", which has not been true for the lifetime of
-- this schema.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'super_admin'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;

COMMENT ON FUNCTION public.current_user_is_super_admin() IS
  'True only when the caller has role=super_admin in user_profiles. The former '
  'auth.jwt() user_metadata fallback was user-forgeable and has been removed '
  '(see migration 20260921000001).';
