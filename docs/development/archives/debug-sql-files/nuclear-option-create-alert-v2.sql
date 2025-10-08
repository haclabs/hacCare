-- ============================================================================
-- NUCLEAR OPTION: Force PostgREST schema reload
-- ============================================================================

-- Step 1: Drop the function completely with CASCADE
DROP FUNCTION IF EXISTS create_patient_alert(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS create_patient_alert(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS create_patient_alert CASCADE;

-- Step 2: Notify PostgREST to reload (multiple times)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 3: Wait a moment (you'll need to run this in separate queries)
-- SELECT pg_sleep(2);

-- Step 4: Verify the function is GONE
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_patient_alert';
-- Should return NO ROWS

-- Step 5: Now recreate with a DIFFERENT NAME to bypass any cached references
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
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  -- Validate inputs
  IF p_patient_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'patient_id and tenant_id are required';
  END IF;
  
  -- Insert the alert (cast to enum types)
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

-- Notify PostgREST again
NOTIFY pgrst, 'reload schema';

-- Verify the new function exists
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_patient_alert_v2';
