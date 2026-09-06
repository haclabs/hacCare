-- Function to expose auth.users.last_sign_in_at / email_confirmed_at for User Management
-- Reference copy — the live version is deployed via migration
-- 20260905000000_add_get_user_auth_status.sql. Keep this file in sync with
-- that migration whenever the function changes.
--
-- SECURITY: caller must already hold admin/coordinator/super_admin. Only
-- returns rows for the ids explicitly requested.

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

REVOKE EXECUTE ON FUNCTION public.get_user_auth_status(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_auth_status(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_user_auth_status IS
'Returns last_sign_in_at/email_confirmed_at from auth.users for the given user ids. Caller must be admin/coordinator/super_admin. Used by User Management to flag accounts that have never signed in (pending setup).';
