-- COMPLETE SOLUTION: Super Admin Alert Functions + NSG25 Medication Fix
-- Execute this entire script in Supabase SQL Editor

-- ==========================================
-- PART 1: Super Admin Alert Functions
-- ==========================================

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

-- ==========================================
-- PART 2: Fix NSG25 Medication Tenant Mismatches
-- ==========================================

-- First, let's see the current mismatch count
SELECT 
    'Before Fix - Mismatch Count' as status,
    COUNT(*) as mismatched_medications
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25
AND pm.tenant_id != p.tenant_id
AND pm.status = 'Active';

-- Update all NSG25 patient medications to have NSG25 tenant_id
UPDATE patient_medications 
SET tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25 tenant ID
FROM patients p
WHERE patient_medications.patient_id = p.id
AND p.tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25 tenant ID
AND patient_medications.tenant_id != p.tenant_id;

-- Verify the fix
SELECT 
    'After Fix - Remaining Mismatches' as status,
    COUNT(*) as mismatched_medications
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE p.tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'  -- NSG25
AND pm.tenant_id != p.tenant_id
AND pm.status = 'Active';

-- Show final medication count by tenant
SELECT 
    'Final Count Check' as status,
    pm.tenant_id,
    t.name as tenant_name,
    COUNT(*) as medication_count
FROM patient_medications pm
LEFT JOIN tenants t ON pm.tenant_id = t.id
WHERE pm.status = 'Active'
AND pm.tenant_id IN (
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8',  -- lethpoly
    '4b181815-24ae-44cb-9128-e74fefb35e13'   -- NSG25
)
GROUP BY pm.tenant_id, t.name
ORDER BY t.name;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
SELECT 'DEPLOYMENT COMPLETE: Super Admin Alert Functions Created & NSG25 Medication Tenants Fixed!' as deployment_status;