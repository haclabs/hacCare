-- ============================================================================
-- COMPLETE FIX: Trigger + RPC Function to bypass PostgREST cache
-- ============================================================================

-- STEP 1: Fix the trigger function to skip when tenant_id is already provided
-- ============================================================================

DROP FUNCTION IF EXISTS auto_set_tenant_id() CASCADE;

CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If tenant_id is already set (e.g., from RPC function), don't override it
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Otherwise, try to get it from tenant_users (avoid user_profiles for now due to cache)
  SELECT tenant_id INTO NEW.tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
  
  RETURN NEW;
END;
$$;

-- Recreate all triggers
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_alerts;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_vitals;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_medications;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_notes;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON medication_administrations;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON diabetic_records;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON bowel_records;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patients;

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_alerts
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_vitals
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_medications
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_notes
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON medication_administrations
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON diabetic_records
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON bowel_records
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- STEP 2: Create the v3 RPC function with dynamic SQL
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
  
  -- Use DYNAMIC SQL to bypass PostgREST schema cache
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
  -- The trigger will fire but will see tenant_id is already set and skip
  EXECUTE v_sql;
  
  RETURN v_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_patient_alert_v3 TO authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION create_patient_alert_v3 IS 
  'Create patient alert using dynamic SQL to bypass PostgREST cache. Works with updated trigger.';

-- STEP 3: Test the complete solution
-- ============================================================================

SELECT create_patient_alert_v3(
  '4eea8bb8-335a-47ea-95a6-d5ce6cf2ca61'::uuid,
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
  'vital_signs',
  'Test alert - complete fix',
  'Test Patient',
  'medium',
  NULL
) AS created_alert_id;
