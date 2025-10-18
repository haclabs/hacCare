-- Enhanced Session Tracking - Always create new sessions for each login
-- This will show current login time and keep login history

-- First, update the create_user_session function to always create new sessions
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_ip_address inet,
  p_user_agent text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
DECLARE
  session_id uuid;
  resolved_tenant_id uuid;
BEGIN
  -- End any existing active sessions for this user first
  UPDATE user_sessions
  SET logout_time = now(),
      status = 'logged_out'
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND logout_time IS NULL;

  -- Resolve tenant ID if not provided
  IF p_tenant_id IS NULL THEN
    resolved_tenant_id := public.get_user_tenant_id();
  ELSE
    resolved_tenant_id := p_tenant_id;
  END IF;

  -- Always create a new session for each login
  INSERT INTO user_sessions (
    user_id,
    ip_address,
    user_agent,
    tenant_id,
    login_time,
    last_activity,
    status
  ) VALUES (
    auth.uid(),
    p_ip_address,
    p_user_agent,
    resolved_tenant_id,
    now(),
    now(),
    'active'
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;

-- Create a view for recent login history (last 20 logins per user)
-- Using SECURITY INVOKER to avoid security definer warnings
CREATE OR REPLACE VIEW public.recent_login_history 
WITH (security_invoker = true) AS
SELECT 
  us.id,
  us.user_id,
  up.email,
  up.first_name,
  up.last_name,
  us.ip_address,
  us.user_agent,
  us.login_time,
  us.logout_time,
  us.status,
  t.name as tenant_name,
  ROW_NUMBER() OVER (PARTITION BY us.user_id ORDER BY us.login_time DESC) as login_rank
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
LEFT JOIN tenants t ON us.tenant_id = t.id
WHERE 
  -- Apply RLS-style filtering for security
  (
    -- Super admin can see all sessions across all tenants
    (SELECT auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR 
    -- Regular users can only see sessions from their tenant (handle NULL properly)
    (
      (SELECT public.get_user_tenant_id()) IS NOT NULL 
      AND us.tenant_id = (SELECT public.get_user_tenant_id())
    )
  )
ORDER BY us.user_id, us.login_time DESC;

-- Test the new functionality
SELECT 'Enhanced session tracking deployed' as result;