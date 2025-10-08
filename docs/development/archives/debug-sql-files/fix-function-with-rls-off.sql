-- ============================================================================
-- FIX: Make SECURITY DEFINER function truly bypass RLS
-- ============================================================================

-- OPTION 1: Recreate the function with explicit SET to bypass RLS checks
DROP FUNCTION IF EXISTS create_patient_alert_v2 CASCADE;

CREATE OR REPLACE FUNCTION create_patient_alert_v2(
  p_patient_id UUID,
  p_tenant_id UUID,
  p_alert_type TEXT,
  p_message TEXT DEFAULT '',
  p_patient_name TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off  -- ← THIS IS THE KEY! Disable RLS within this function
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  -- Validate inputs
  IF p_patient_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'patient_id and tenant_id are required';
  END IF;
  
  -- Insert the alert (cast to enum types)
  -- RLS is now DISABLED within this function scope
  INSERT INTO patient_alerts (
    patient_id,
    tenant_id,
    patient_name,
    alert_type,
    priority,
    message,
    acknowledged,
    expires_at
  ) VALUES (
    p_patient_id,
    p_tenant_id,
    p_patient_name,
    p_alert_type::alert_type_enum,
    p_priority::alert_priority_enum,
    p_message,
    false,
    p_expires_at
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_patient_alert_v2 TO authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION create_patient_alert_v2 IS 
  'Create patient alert bypassing RLS. Uses SET row_security = off to avoid cached schema issues.';

-- Verify the function was created
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_patient_alert_v2';
