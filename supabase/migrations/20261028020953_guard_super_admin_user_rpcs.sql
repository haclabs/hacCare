-- Close a NULL loophole in two super-admin-only RPCs.
--
-- confirm_user_email and delete_user_permanently checked
--     SELECT role INTO current_user_role FROM user_profiles WHERE id = auth.uid();
--     IF current_user_role != 'super_admin' THEN RAISE ...
-- For a signed-in caller with no user_profiles row, current_user_role is NULL, NULL != 'super_admin'
-- is NULL, and the IF doesn't fire: any such account could confirm emails or permanently delete
-- any user. Both now start with the standard access guard (requires an active super_admin profile,
-- or a service context), like every other privileged RPC since 20261026031253.
-- The bodies are otherwise as deployed.

CREATE OR REPLACE FUNCTION public.confirm_user_email(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_caller_has_role(ARRAY['super_admin']); -- access guard

  UPDATE auth.users
  SET
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = target_user_id
    AND email_confirmed_at IS NULL;

  IF FOUND THEN
    RAISE NOTICE 'User % email confirmed successfully', target_user_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'User % not found or already confirmed', target_user_id;
    RETURN FALSE;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_permanently(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_caller_has_role(ARRAY['super_admin']); -- access guard

  DELETE FROM tenant_users WHERE user_id = target_user_id;
  DELETE FROM user_profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN 'User permanently deleted';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.confirm_user_email(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_permanently(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_permanently(uuid) TO authenticated;
