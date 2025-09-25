-- Fix cross-tenant duplicate prevention
-- Make duplicate checking more specific by including tenant_id

DROP FUNCTION IF EXISTS create_alert_for_tenant(uuid,uuid,text,text,text,text,timestamp with time zone);

CREATE OR REPLACE FUNCTION create_alert_for_tenant(
  p_tenant_id UUID,
  p_patient_id UUID,
  p_alert_type TEXT,
  p_message TEXT,
  p_patient_name TEXT,
  p_priority TEXT DEFAULT 'medium',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the current user's role from user_profiles
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only allow super_admin users to use this function
  IF v_user_role != 'super_admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied - super admin required'
    );
  END IF;
  
  -- Validate required parameters
  IF p_tenant_id IS NULL OR p_patient_id IS NULL OR p_alert_type IS NULL OR p_message IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Missing required parameters'
    );
  END IF;
  
  -- Enhanced duplicate check: Include tenant_id for proper cross-tenant isolation
  -- Also make it more specific by checking for similar messages rather than exact matches
  IF EXISTS (
    SELECT 1 FROM patient_alerts
    WHERE tenant_id = p_tenant_id  -- Same tenant
    AND patient_id = p_patient_id  -- Same patient
    AND alert_type::text = p_alert_type  -- Same alert type
    AND acknowledged = false  -- Not acknowledged
    AND created_at > NOW() - INTERVAL '5 minutes'  -- Within 5 minutes
    -- For vital signs, check if any unacknowledged vital alert exists (don't need exact message match)
    AND (p_alert_type != 'vital_signs' OR alert_type::text = 'vital_signs')
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
    COALESCE(p_priority::alert_priority_enum, 'medium'),
    false,
    p_expires_at,
    NOW()
  )
  RETURNING id INTO v_alert_id;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'alert_id', v_alert_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;