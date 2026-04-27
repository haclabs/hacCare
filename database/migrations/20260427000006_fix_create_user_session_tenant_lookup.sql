-- ============================================================================
-- Fix create_user_session — remove dependency on dropped get_user_tenant_id()
-- ============================================================================
-- Migration 20260427000005 dropped get_user_tenant_id() but the live version of
-- create_user_session calls it internally when p_tenant_id is NULL (during login
-- before the tenant context is set).
--
-- Fix: inline the tenant lookup directly from tenant_users table.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_user_session(
  p_ip_address inet,
  p_user_agent text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Resolve tenant ID: use provided value, or fall back to first assigned tenant
  IF p_tenant_id IS NOT NULL THEN
    resolved_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO resolved_tenant_id
    FROM public.tenant_users
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
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
