-- ============================================================================
-- SYSTEM LOGS TABLE FOR SUPER ADMIN MONITORING
-- ============================================================================
-- Comprehensive logging system for tracking errors, user actions, and system events
-- Only accessible by super_admin users

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamp
  timestamp timestamptz DEFAULT now() NOT NULL,
  
  -- User Information
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- Log Classification
  log_level varchar(20) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'security')),
  log_type varchar(50) NOT NULL, -- 'error', 'action', 'navigation', 'api_call', 'auth', etc.
  
  -- Context
  component varchar(255), -- React component name where event occurred
  action varchar(255), -- Specific action taken
  
  -- Error Details (if applicable)
  error_message text,
  error_stack text,
  
  -- Request/Response Data
  request_data jsonb, -- API request details, form data, etc.
  response_data jsonb, -- API response, operation result
  
  -- Browser/Session Info
  user_agent text,
  browser_info jsonb, -- {browser: 'Chrome', version: '120', os: 'Windows'}
  ip_address inet,
  session_id text,
  
  -- Navigation Context
  current_url text, -- What page they were on
  previous_url text, -- Where they came from
  
  -- Additional Context
  metadata jsonb, -- Any additional context data
  
  -- Indexes for fast querying
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_id ON system_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(log_level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(log_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component, timestamp DESC);

-- RLS Policies: Only super_admins can access
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "super_admin_view_system_logs" ON system_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Anyone can insert logs (for error reporting)
CREATE POLICY "anyone_insert_system_logs" ON system_logs
  FOR INSERT
  WITH CHECK (true);

-- Only super admins can delete old logs (for maintenance)
CREATE POLICY "super_admin_delete_system_logs" ON system_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Grant permissions
GRANT SELECT ON system_logs TO authenticated;
GRANT INSERT ON system_logs TO authenticated;
GRANT DELETE ON system_logs TO authenticated;

-- Comment
COMMENT ON TABLE system_logs IS 'Comprehensive system logging for super admin monitoring and troubleshooting. Tracks errors, user actions, and system events with full context.';
