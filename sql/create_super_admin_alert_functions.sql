-- Super Admin Alert Management Functions
-- These functions allow super admins to create alerts across tenants (bypassing RLS)

-- 1. Create super admin alert creation function
CREATE OR REPLACE FUNCTION create_alert_for_tenant(
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
  result JSON;
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
  
  -- Check for duplicate alerts (same patient, type, message within last hour)
  IF EXISTS (
    SELECT 1 FROM patient_alerts
    WHERE patient_id = p_patient_id
    AND alert_type::text = p_alert_type
    AND message = p_message
    AND acknowledged = false
    AND created_at > NOW() - INTERVAL '1 hour'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Duplicate alert already exists'
    );
  END IF;
  
  -- Create the alert (RLS bypassed due to SECURITY DEFINER)
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
  VALUES (
    p_tenant_id,
    p_patient_id,
    p_alert_type::alert_type_enum,
    p_message,
    p_patient_name,
    p_priority::alert_priority_enum,
    false,
    COALESCE(p_expires_at, NOW() + INTERVAL '24 hours'),
    NOW()
  )
  RETURNING id INTO new_alert_id;
  
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

-- 2. Create super admin alert acknowledgment function  
CREATE OR REPLACE FUNCTION acknowledge_alert_for_tenant(
  p_alert_id UUID,
  p_tenant_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  calling_user_id UUID;
  user_role TEXT;
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
  
  -- Update the alert (RLS bypassed due to SECURITY DEFINER)
  UPDATE patient_alerts
  SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = calling_user_id
  WHERE id = p_alert_id
  AND tenant_id = p_tenant_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Alert not found or already acknowledged'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Alert acknowledged successfully'
  );
  
EXCEPTION WHEN others THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION create_alert_for_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_alert_for_tenant TO authenticated;

-- 4. Add helpful comments
COMMENT ON FUNCTION create_alert_for_tenant IS 'Allows super admins and admins to create patient alerts across tenants, bypassing RLS policies';
COMMENT ON FUNCTION acknowledge_alert_for_tenant IS 'Allows super admins and admins to acknowledge patient alerts across tenants, bypassing RLS policies';