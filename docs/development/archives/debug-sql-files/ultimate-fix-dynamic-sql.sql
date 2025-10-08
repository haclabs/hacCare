-- ============================================================================
-- ULTIMATE NUCLEAR OPTION: Use dynamic SQL to bypass ALL caching
-- ============================================================================

DROP FUNCTION IF EXISTS create_patient_alert_v3 CASCADE;

CREATE OR REPLACE FUNCTION create_patient_alert_v3(
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
  v_sql TEXT;
BEGIN
  -- Validate inputs
  IF p_patient_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'patient_id and tenant_id are required';
  END IF;
  
  -- Generate a new UUID
  v_alert_id := gen_random_uuid();
  
  -- Use DYNAMIC SQL to completely bypass PostgREST schema cache
  v_sql := format(
    'INSERT INTO patient_alerts (
      id,
      patient_id,
      tenant_id,
      patient_name,
      alert_type,
      priority,
      message,
      acknowledged,
      expires_at,
      created_at
    ) VALUES (
      %L::uuid,
      %L::uuid,
      %L::uuid,
      %L,
      %L::alert_type_enum,
      %L::alert_priority_enum,
      %L,
      false,
      %L::timestamptz,
      NOW()
    )',
    v_alert_id,
    p_patient_id,
    p_tenant_id,
    p_patient_name,
    p_alert_type,
    p_priority,
    p_message,
    p_expires_at
  );
  
  -- Execute the dynamic SQL
  EXECUTE v_sql;
  
  RETURN v_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_patient_alert_v3 TO authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION create_patient_alert_v3 IS 
  'Create patient alert using dynamic SQL to bypass ALL PostgREST caching issues.';

-- Test the function
SELECT create_patient_alert_v3(
  '4eea8bb8-335a-47ea-95a6-d5ce6cf2ca61'::uuid,
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
  'vital_signs',
  'Test alert from dynamic SQL',
  'Test Patient',
  'medium',
  NULL
);
