-- User & Roles shows the institution(s) each user belongs to.
-- user_institution_ids() is the canonical resolver but is not callable by signed-in
-- users, so this wraps it with the same guard and per-user scoping as get_user_auth_status:
-- coordinators/admins only see users of their own institution, super_admin sees all.

CREATE OR REPLACE FUNCTION public.get_user_institutions(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, institution_id uuid, institution_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_caller_has_role(ARRAY['super_admin', 'coordinator', 'admin']); -- access guard
  RETURN QUERY
  SELECT u.id, t.id, t.name::text
  FROM unnest(p_user_ids) AS u(id)
  CROSS JOIN LATERAL public.user_institution_ids(u.id) AS i(id)
  JOIN tenants t ON t.id = i.id
  WHERE public.caller_can_administer_user(u.id);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_institutions(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_institutions(uuid[]) TO authenticated, service_role;
