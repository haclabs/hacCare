-- Simplified super admin alert creation function with proper enum handling
-- Run the diagnose_patient_alerts_schema.sql first to determine exact enum type names

CREATE OR REPLACE FUNCTION create_alert_for_tenant_v2(
  p_tenant_id UUID,
  p_patient_id UUID,
  p_alert_type TEXT,
  p_message TEXT,
  p_patient_name TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  calling_user_id UUID;
  user_role TEXT;
  new_alert_id UUID;
BEGIN
  -- Get the current user
  calling_user_id := auth.uid();
  
  -- Check if user is super admin or admin
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE id = calling_user_id;
  
  -- Only super admins and admins can use this function
  IF user_role NOT IN ('super_admin', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied: Super Admin or Admin role required'
    );
  END IF;
  
  -- Validate required parameters
  IF p_tenant_id IS NULL OR p_patient_id IS NULL OR p_alert_type IS NULL OR p_message IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Missing required parameters'
    );
  END IF;
  
  -- Use dynamic SQL to handle enum casting properly
  EXECUTE '
    INSERT INTO patient_alerts (
      tenant_id,
      patient_id,
      alert_type,
      message,
      patient_name,
      priority,
      acknowledged,
      expires_at,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, false, COALESCE($7, NOW() + INTERVAL ''24 hours''), NOW())
    RETURNING id'
  INTO new_alert_id
  USING p_tenant_id, p_patient_id, p_alert_type, p_message, p_patient_name, p_priority, p_expires_at;
  
  -- Return success with alert ID
  RETURN json_build_object(
    'success', true,
    'alert_id', new_alert_id,
    'message', 'Alert created successfully'
  );
  
EXCEPTION WHEN others THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_alert_for_tenant_v2 TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION create_alert_for_tenant_v2 IS 'Simplified super admin alert creation with dynamic SQL for enum handling';