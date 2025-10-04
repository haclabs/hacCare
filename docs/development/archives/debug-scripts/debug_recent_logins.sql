-- Debug why recent_login_history is showing 0 results

-- 1. Check if user_sessions table has any data
SELECT 'Total user_sessions count:' as check_type, COUNT(*) as count 
FROM user_sessions;

-- 2. Check recent sessions (last 24 hours)
SELECT 'Recent sessions (24h):' as check_type, COUNT(*) as count
FROM user_sessions 
WHERE login_time > NOW() - INTERVAL '24 hours';

-- 3. Check current user's sessions
SELECT 'Current user sessions:' as check_type, COUNT(*) as count
FROM user_sessions 
WHERE user_id = auth.uid();

-- 4. Check what tenant the current user belongs to
SELECT 'Current user tenant:' as info, public.get_user_tenant_id() as tenant_id;

-- 5. Check current user's role
SELECT 'Current user role:' as info, 
       auth.jwt() -> 'user_metadata' ->> 'role' as role;

-- 6. Sample of actual session data (if any)
SELECT 'Sample sessions:' as info, 
       us.user_id, 
       us.tenant_id, 
       us.login_time, 
       us.status,
       up.email
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.login_time DESC 
LIMIT 5;

-- 7. Test the view directly with debug info
SELECT 'View test - count:' as test_type, COUNT(*) as count
FROM public.recent_login_history;

-- 8. Test the view filtering conditions
SELECT 'Super admin check:' as test_type,
       (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin' as is_super_admin;

SELECT 'Tenant match check:' as test_type,
       COUNT(*) as matching_sessions
FROM user_sessions us
WHERE us.tenant_id = (SELECT public.get_user_tenant_id());

-- 9. Test view without WHERE clause (to see if filtering is the issue)
SELECT 'All sessions (no filter):' as test_type, COUNT(*) as count
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
LEFT JOIN tenants t ON us.tenant_id = t.id;