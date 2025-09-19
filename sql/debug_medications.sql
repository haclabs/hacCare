-- Debug version to see what's happening with medication copying

CREATE OR REPLACE FUNCTION debug_patient_medications(p_patient_id TEXT)
RETURNS TABLE (
    debug_info TEXT,
    patient_uuid UUID,
    medication_id UUID,
    medication_name TEXT
) AS $$
DECLARE
    v_patient_record RECORD;
BEGIN
    -- Get patient info
    SELECT * INTO v_patient_record FROM patients WHERE patient_id = p_patient_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'Patient not found'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 
        'Patient found'::TEXT,
        v_patient_record.id,
        NULL::UUID,
        ('Patient: ' || v_patient_record.first_name || ' ' || v_patient_record.last_name)::TEXT;
    
    -- Check medications
    RETURN QUERY 
    SELECT 
        'Medication found'::TEXT,
        v_patient_record.id,
        pm.id,
        pm.name
    FROM patient_medications pm
    WHERE pm.patient_id = v_patient_record.id;
    
    -- Check medication count
    RETURN QUERY
    SELECT 
        ('Total medications: ' || COUNT(*)::TEXT)::TEXT,
        v_patient_record.id,
        NULL::UUID,
        NULL::TEXT
    FROM patient_medications pm
    WHERE pm.patient_id = v_patient_record.id;
END;
$$ LANGUAGE plpgsql;