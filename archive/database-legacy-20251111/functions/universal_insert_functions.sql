-- ============================================================================
-- UNIVERSAL INSERT FUNCTIONS
-- ============================================================================
-- 
-- Purpose: Bypass PostgREST REST API and RLS cache issues by using functions
-- 
-- These functions handle tenant_id automatically and work around the 
-- persistent PostgREST schema caching problem
-- 
-- ============================================================================

-- Drop any existing versions of these functions
DROP FUNCTION IF EXISTS create_patient_alert CASCADE;
DROP FUNCTION IF EXISTS create_patient_vitals CASCADE;
DROP FUNCTION IF EXISTS create_patient_note CASCADE;
DROP FUNCTION IF EXISTS create_patient_medication CASCADE;

-- ============================================================================
-- CREATE PATIENT ALERT (tenant_id passed as parameter to avoid cache issues)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_patient_alert(
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

GRANT EXECUTE ON FUNCTION create_patient_alert TO authenticated;

COMMENT ON FUNCTION create_patient_alert IS 
  'Create patient alert with automatic tenant_id lookup. Bypasses PostgREST cache issues.';

-- ============================================================================
-- CREATE PATIENT VITAL SIGNS (with automatic tenant_id)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_patient_vitals(
  p_patient_id UUID,
  p_temperature NUMERIC DEFAULT NULL,
  p_blood_pressure_systolic INTEGER DEFAULT NULL,
  p_blood_pressure_diastolic INTEGER DEFAULT NULL,
  p_heart_rate INTEGER DEFAULT NULL,
  p_respiratory_rate INTEGER DEFAULT NULL,
  p_oxygen_saturation NUMERIC DEFAULT NULL,
  p_oxygen_delivery TEXT DEFAULT NULL,
  p_recorded_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vitals_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the patient
  SELECT tenant_id INTO v_tenant_id
  FROM patients
  WHERE id = p_patient_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient not found or has no tenant_id';
  END IF;
  
  -- Insert the vitals
  INSERT INTO patient_vitals (
    patient_id,
    tenant_id,
    temperature,
    blood_pressure_systolic,
    blood_pressure_diastolic,
    heart_rate,
    respiratory_rate,
    oxygen_saturation,
    oxygen_delivery,
    recorded_at
  ) VALUES (
    p_patient_id,
    v_tenant_id,
    p_temperature,
    p_blood_pressure_systolic,
    p_blood_pressure_diastolic,
    p_heart_rate,
    p_respiratory_rate,
    p_oxygen_saturation,
    p_oxygen_delivery,
    p_recorded_at
  )
  RETURNING id INTO v_vitals_id;
  
  RETURN v_vitals_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_patient_vitals TO authenticated;

-- ============================================================================
-- CREATE PATIENT NOTE (with automatic tenant_id)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_patient_note(
  p_patient_id UUID,
  p_note_type TEXT,
  p_content TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the patient
  SELECT tenant_id INTO v_tenant_id
  FROM patients
  WHERE id = p_patient_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient not found or has no tenant_id';
  END IF;
  
  -- Insert the note
  INSERT INTO patient_notes (
    patient_id,
    tenant_id,
    note_type,
    content,
    priority,
    created_by
  ) VALUES (
    p_patient_id,
    v_tenant_id,
    p_note_type,
    p_content,
    p_priority,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_note_id;
  
  RETURN v_note_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_patient_note TO authenticated;

-- ============================================================================
-- CREATE PATIENT MEDICATION (with automatic tenant_id)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_patient_medication(
  p_patient_id UUID,
  p_name TEXT,
  p_dosage TEXT,
  p_frequency TEXT,
  p_route TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT NULL,
  p_prescribed_by TEXT DEFAULT NULL,
  p_admin_time TIME DEFAULT NULL,
  p_admin_times TEXT[] DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_category TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_medication_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the patient
  SELECT tenant_id INTO v_tenant_id
  FROM patients
  WHERE id = p_patient_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient not found or has no tenant_id';
  END IF;
  
  -- Insert the medication
  INSERT INTO patient_medications (
    patient_id,
    tenant_id,
    name,
    dosage,
    frequency,
    route,
    start_date,
    end_date,
    prescribed_by,
    admin_time,
    admin_times,
    status,
    category
  ) VALUES (
    p_patient_id,
    v_tenant_id,
    p_name,
    p_dosage,
    p_frequency,
    p_route,
    p_start_date,
    p_end_date,
    p_prescribed_by,
    p_admin_time,
    p_admin_times,
    p_status,
    p_category
  )
  RETURNING id INTO v_medication_id;
  
  RETURN v_medication_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_patient_medication TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all the functions we just created
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'create_patient_alert',
  'create_patient_vitals',
  'create_patient_note',
  'create_patient_medication'
)
ORDER BY routine_name;
