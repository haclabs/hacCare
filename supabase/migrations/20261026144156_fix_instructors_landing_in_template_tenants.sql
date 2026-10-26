-- Instructors were landing in (and getting stuck in) simulation template tenants.
--
-- 1. 20261026031253_guard_privileged_rpcs rewrote get_user_program_tenants from
--    LANGUAGE sql to plpgsql. SQL functions coerce varchar -> text implicitly;
--    plpgsql RETURN QUERY does not, so tenants.name (varchar(255)) and
--    tenants.subdomain (varchar(100)) made every call fail with
--    "structure of query does not match function result type". TenantContext
--    treats that error as "no program tenants" and falls back to
--    get_user_current_tenant.
--
-- 2. get_user_current_tenant picked an arbitrary active tenant_users row
--    (LIMIT 1, no ORDER BY). ensure_tenant_access adds an active row for every
--    template an instructor edits, so the fallback could return a template
--    tenant: the app opened inside it with no editing banner and no way out.
--    Prefer non-simulation tenants, then the oldest membership.

CREATE OR REPLACE FUNCTION public.get_user_program_tenants(p_user_id uuid)
RETURNS TABLE(tenant_id uuid, tenant_name text, program_id uuid, program_code text, program_name text, subdomain text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_self_or_admin(p_user_id); -- access guard
  RETURN QUERY
  SELECT t.id, t.name::text, p.id, p.code::text, p.name::text, t.subdomain::text
  FROM user_programs up
  JOIN programs p ON p.id = up.program_id
  JOIN tenants t ON t.program_id = p.id
  WHERE up.user_id = p_user_id
    AND p.is_active = true
    AND t.status = 'active'
    AND t.tenant_type = 'program'
  ORDER BY p.code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_current_tenant(target_user_id uuid)
RETURNS TABLE(tenant_id uuid, role text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public.assert_self_or_admin(target_user_id); -- access guard
  RETURN QUERY
  SELECT tu.tenant_id, tu.role::text, tu.is_active
  FROM tenant_users tu
  JOIN tenants t ON t.id = tu.tenant_id
  WHERE tu.user_id = target_user_id
    AND tu.is_active = true
  ORDER BY
    CASE WHEN t.tenant_type IN ('simulation_template', 'simulation_active') OR t.is_simulation THEN 1 ELSE 0 END,
    tu.created_at
  LIMIT 1;
END;
$$;
