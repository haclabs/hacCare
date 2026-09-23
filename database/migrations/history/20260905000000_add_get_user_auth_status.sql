-- ============================================================================
-- Add get_user_auth_status: expose auth.users.last_sign_in_at / email_confirmed_at
-- ============================================================================
-- auth.users is not exposed via PostgREST, so User Management has no way to
-- show whether an invited user has ever actually signed in / set their
-- password. This SECURITY DEFINER function returns just those two columns
-- for a caller-supplied list of user ids, so admins can spot accounts that
-- are still "pending setup" (e.g. after a bulk welcome/reset-password email).
--
-- SECURITY: caller must already hold admin/coordinator/super_admin (same
-- tier as the invite-user edge function's ALLOWED_INVITER_ROLES). Only
-- returns rows for the ids explicitly requested — callers are expected to
-- pass ids they already legitimately fetched from user_profiles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_auth_status(p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM user_profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'coordinator', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to view user sign-in status';
  END IF;

  RETURN QUERY
  SELECT au.id, au.last_sign_in_at, au.email_confirmed_at
  FROM auth.users au
  WHERE au.id = ANY(p_user_ids);
END;
$$;

-- Explicit grant/revoke: CREATE OR REPLACE resets ACLs whenever the function
-- signature changes, silently re-exposing SECURITY DEFINER functions to
-- anon/PUBLIC if this isn't done (recurring gotcha, see
-- 20260901000002_reapply_anon_rpc_exposure_fix.sql).
REVOKE EXECUTE ON FUNCTION public.get_user_auth_status(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_auth_status(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_user_auth_status IS
'Returns last_sign_in_at/email_confirmed_at from auth.users for the given user ids. Caller must be admin/coordinator/super_admin. Used by User Management to flag accounts that have never signed in (pending setup).';
