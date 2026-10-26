-- set_tenant_id_on_insert was a trigger function with no trigger attached and no
-- other references (functions, policies, views, app code, edge functions).
-- It was also broken: it assigned get_user_current_tenant()'s row result to a
-- uuid and called it unqualified under search_path = ''.
DROP FUNCTION IF EXISTS public.set_tenant_id_on_insert();
