-- Admin Dashboard Database Schema
-- Creates tables for session tracking and audit logging

-- Create user_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address inet NOT NULL,
  user_agent text,
  tenant_id uuid, -- No foreign key constraint - will be handled by application
  login_time timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  logout_time timestamptz,
  session_token text,
  status varchar(20) DEFAULT 'active' CHECK (status IN ('active', 'idle', 'logged_out')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Simplified: Only tracking login sessions, no detailed activity logging

-- Add foreign key constraints if tenants table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') THEN
    -- Add foreign key constraint for user_sessions
    ALTER TABLE user_sessions 
    ADD CONSTRAINT fk_user_sessions_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    

    
    RAISE NOTICE '✅ Added foreign key constraints to tenants table';
  ELSE
    RAISE NOTICE '⚠️ Tenants table not found - tenant_id will be used without foreign key constraint';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not add tenant foreign key constraints: %', SQLERRM;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);


-- RLS Policies for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Super admins can see all sessions
CREATE POLICY "super_admin_sessions_access" ON user_sessions
  FOR ALL USING (
    CASE 
      WHEN public.current_user_is_super_admin() THEN true
      ELSE user_id = auth.uid()
    END
  );



-- Simplified function to get user's tenant context
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  -- Get current tenant context from tenant_users table
  BEGIN
    -- Try tenant_users table first (multi-tenant setup)
    SELECT tenant_id INTO current_tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid() 
      AND is_active = true
    LIMIT 1;
    
    -- If no tenant found in tenant_users, try user_profiles as fallback
    IF current_tenant_id IS NULL THEN
      SELECT tenant_id INTO current_tenant_id
      FROM user_profiles
      WHERE id = auth.uid();
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      current_tenant_id := NULL;
  END;

  RETURN current_tenant_id;
END;
$$;

-- Function to create/update user session
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
  existing_session_id uuid;
BEGIN
  -- Check for existing active session
  SELECT id INTO existing_session_id
  FROM user_sessions
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND logout_time IS NULL;

  IF existing_session_id IS NOT NULL THEN
    -- Update existing session
    UPDATE user_sessions
    SET last_activity = now(),
        ip_address = p_ip_address,
        user_agent = COALESCE(p_user_agent, user_agent),
        tenant_id = COALESCE(p_tenant_id, tenant_id)
    WHERE id = existing_session_id;
    
    RETURN existing_session_id;
  ELSE
    -- Create new session
    INSERT INTO user_sessions (
      user_id,
      ip_address,
      user_agent,
      tenant_id,
      status
    ) VALUES (
      auth.uid(),
      p_ip_address,
      p_user_agent,
      p_tenant_id,
      'active'
    ) RETURNING id INTO session_id;

    -- Session created - no additional logging needed
    
    RETURN session_id;
  END IF;
END;
$$;

-- Function to end user session
CREATE OR REPLACE FUNCTION public.end_user_session()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update active sessions to logged out
  UPDATE user_sessions
  SET status = 'logged_out',
      logout_time = now()
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND logout_time IS NULL;

  -- Session ended - logout time recorded
  
  RETURN true;
END;
$$;

-- Function to cleanup old sessions (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_sessions
  WHERE created_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;



-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_session(inet, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_user_session() TO authenticated;

-- Super admin functions
GRANT EXECUTE ON FUNCTION public.cleanup_old_sessions() TO authenticated;



COMMENT ON TABLE user_sessions IS 'Tracks user login sessions with IP addresses and timestamps';
COMMENT ON FUNCTION public.get_user_tenant_id IS 'Gets current user tenant context from tenant_users table';
COMMENT ON FUNCTION public.create_user_session IS 'Creates or updates user session with IP tracking on login';
COMMENT ON FUNCTION public.end_user_session IS 'Ends user session and records logout time';

-- Test the setup
DO $$
BEGIN
  RAISE NOTICE '✅ Simplified Admin Dashboard schema created successfully!';
  RAISE NOTICE 'Table created: user_sessions (login tracking only)';
  RAISE NOTICE 'Functions created: get_user_tenant_id, create_user_session, end_user_session';
  RAISE NOTICE 'RLS policies applied - shows login sessions with IP addresses and timestamps';
END $$;