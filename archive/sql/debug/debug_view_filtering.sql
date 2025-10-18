-- Debug the filtering conditions in recent_login_history view

-- 1. Check current user's role
SELECT 'Current user role:' as info, 
       auth.jwt() -> 'user_metadata' ->> 'role' as role,
       CASE 
         WHEN (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin' THEN 'TRUE - Should see all sessions'
         ELSE 'FALSE - Will only see tenant sessions'
       END as super_admin_status;

-- 2. Check current user's tenant ID
SELECT 'Current user tenant:' as info, 
       public.get_user_tenant_id() as tenant_id,
       CASE 
         WHEN public.get_user_tenant_id() IS NULL THEN 'NULL - This could be the problem!'
         ELSE 'Has tenant ID'
       END as tenant_status;

-- 3. Check how many sessions match the current user's tenant
SELECT 'Sessions with user tenant:' as info,
       COUNT(*) as count,
       public.get_user_tenant_id() as user_tenant_id
FROM user_sessions us
WHERE us.tenant_id = (SELECT public.get_user_tenant_id());

-- 4. Check distribution of tenant_ids in sessions
SELECT 'Session tenant distribution:' as info,
       us.tenant_id,
       COUNT(*) as session_count,
       t.name as tenant_name
FROM user_sessions us
LEFT JOIN tenants t ON us.tenant_id = t.id
GROUP BY us.tenant_id, t.name
ORDER BY session_count DESC;

-- 5. Check if the OR condition is working - test each part separately
SELECT 'Super admin condition result:' as test,
       (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin' as result;

SELECT 'Tenant match condition result:' as test,
       COUNT(*) as matching_sessions
FROM user_sessions us
WHERE us.tenant_id = (SELECT public.get_user_tenant_id());

-- 6. Test the full WHERE condition with explicit values
SELECT 'Full condition test:' as test,
       COUNT(*) as count
FROM user_sessions us
WHERE 
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR 
    us.tenant_id = (SELECT public.get_user_tenant_id())
  );

-- 7. Check for NULL values that might break the comparison
SELECT 'NULL checks:' as info,
       COUNT(*) as total_sessions,
       COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as null_tenant_sessions,
       COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as non_null_tenant_sessions
FROM user_sessions;