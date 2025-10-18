-- =====================================================
-- Diagnose Login History Issue
-- =====================================================
-- Run this to check why login history is not showing
-- Run in: Supabase SQL Editor
-- =====================================================

-- 1. Check if user_sessions table has data
SELECT 
  'Total Sessions' as check_type,
  COUNT(*) as count,
  MIN(login_time) as oldest_login,
  MAX(login_time) as newest_login
FROM public.user_sessions;

-- 2. Check current user's role and tenant
SELECT 
  'Current User Info' as check_type,
  auth.uid() as user_id,
  auth.jwt() -> 'user_metadata' ->> 'role' as role,
  public.get_user_tenant_id() as tenant_id;

-- 3. Check if recent_login_history view exists
SELECT 
  'View Check' as check_type,
  COUNT(*) as view_exists
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname = 'recent_login_history';

-- 4. Try to query the view directly
SELECT 
  'View Query Test' as check_type,
  COUNT(*) as records_visible
FROM public.recent_login_history;

-- 5. Check sessions by status
SELECT 
  'Sessions by Status' as check_type,
  status,
  COUNT(*) as count
FROM public.user_sessions
GROUP BY status
ORDER BY count DESC;

-- 6. Check recent sessions (last 7 days)
SELECT 
  'Recent Sessions' as check_type,
  user_id,
  ip_address,
  login_time,
  logout_time,
  status
FROM public.user_sessions
WHERE login_time > NOW() - INTERVAL '7 days'
ORDER BY login_time DESC
LIMIT 10;

-- 7. Check if RLS is blocking the view
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_sessions'
ORDER BY policyname;

-- 8. Test the view filter conditions manually
SELECT 
  'Manual Filter Test' as check_type,
  CASE 
    WHEN (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin' THEN 'super_admin'
    WHEN public.get_user_tenant_id() IS NOT NULL THEN 'has_tenant'
    ELSE 'no_access'
  END as access_level,
  COUNT(*) as session_count
FROM public.user_sessions us
WHERE 
  (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR 
    (
      public.get_user_tenant_id() IS NOT NULL 
      AND us.tenant_id = public.get_user_tenant_id()
    )
  )
GROUP BY 1;
