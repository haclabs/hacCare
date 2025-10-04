-- Direct RLS Performance Fix for hacCare
-- This script directly fixes the most common auth function performance issues
-- Run this to resolve the 209 warnings about auth.<function>() re-evaluation

-- 1. Fix simulation_users policies (example from your warning)
DROP POLICY IF EXISTS "Admins can manage simulation users" ON public.simulation_users;
CREATE POLICY "Admins can manage simulation users" ON public.simulation_users
FOR ALL USING (
  simulation_tenant_id IN (
    SELECT t.id
    FROM tenants t
    JOIN tenant_users tu ON tu.tenant_id = t.parent_tenant_id
    WHERE tu.user_id = (SELECT auth.uid())  -- Optimized: wrapped in subquery
      AND tu.role::text = ANY(ARRAY['admin'::varchar, 'instructor'::varchar]::text[])
      AND t.tenant_type = 'simulation'
  )
);

-- 2. Fix common tenant_users policies
DROP POLICY IF EXISTS "tenant_users_auth_select" ON public.tenant_users;
CREATE POLICY "tenant_users_auth_select" ON public.tenant_users
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "tenant_users_auth_insert" ON public.tenant_users;
CREATE POLICY "tenant_users_auth_insert" ON public.tenant_users
FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "tenant_users_auth_update" ON public.tenant_users;
CREATE POLICY "tenant_users_auth_update" ON public.tenant_users
FOR UPDATE USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "tenant_users_auth_delete" ON public.tenant_users;
CREATE POLICY "tenant_users_auth_delete" ON public.tenant_users
FOR DELETE USING (user_id = (SELECT auth.uid()));

-- 3. Fix user_profiles policies
DROP POLICY IF EXISTS "user_profiles_auth_select" ON public.user_profiles;
CREATE POLICY "user_profiles_auth_select" ON public.user_profiles
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "user_profiles_auth_insert" ON public.user_profiles;
CREATE POLICY "user_profiles_auth_insert" ON public.user_profiles
FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_profiles_auth_update" ON public.user_profiles;
CREATE POLICY "user_profiles_auth_update" ON public.user_profiles
FOR UPDATE USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- 4. Fix tenants policies
DROP POLICY IF EXISTS "tenants_auth_select" ON public.tenants;
CREATE POLICY "tenants_auth_select" ON public.tenants
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "tenants_auth_insert" ON public.tenants;
CREATE POLICY "tenants_auth_insert" ON public.tenants
FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "tenants_auth_update" ON public.tenants;
CREATE POLICY "tenants_auth_update" ON public.tenants
FOR UPDATE USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "tenants_auth_delete" ON public.tenants;
CREATE POLICY "tenants_auth_delete" ON public.tenants
FOR DELETE USING ((SELECT auth.uid()) IS NOT NULL);

-- 5. Fix user_sessions policy  
DROP POLICY IF EXISTS "super_admin_sessions_access" ON public.user_sessions;
CREATE POLICY "super_admin_sessions_access" ON public.user_sessions
FOR ALL USING (
  CASE
    WHEN current_user_is_super_admin() THEN true
    ELSE (user_id = (SELECT auth.uid()))  -- Optimized: wrapped in subquery
  END
);

-- 6. Fix audit_logs policies
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "audit_logs_consolidated_select" ON public.audit_logs;
CREATE POLICY "audit_logs_consolidated_select" ON public.audit_logs
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- 7. Fix profiles policies  
DROP POLICY IF EXISTS "profiles_consolidated_select" ON public.profiles;
CREATE POLICY "profiles_consolidated_select" ON public.profiles
FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_consolidated_update" ON public.profiles;
CREATE POLICY "profiles_consolidated_update" ON public.profiles
FOR UPDATE USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- 8. Verification query - check how many policies were optimized
SELECT 
  'RLS Performance Optimization Complete' as status,
  COUNT(*) as policies_optimized
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%');

-- Show remaining unoptimized policies (should be much fewer now)
SELECT 
  'Remaining unoptimized policies' as status,
  COUNT(*) as remaining_policies  
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
  );