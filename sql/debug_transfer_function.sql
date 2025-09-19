-- Debug version of the transfer function to see what's happening with medications

CREATE OR REPLACE FUNCTION debug_duplicate_patient_to_tenant(
    p_source_patient_id TEXT,
    p_target_tenant_id UUID
) RETURNS TABLE (
    debug_step TEXT,
    debug_info TEXT,
    record_count INTEGER
) AS $$
DECLARE
    v_new_patient_id UUID;
    v_source_patient RECORD;
    v_source_patient_uuid UUID;
    v_medications_count INTEGER := 0;
BEGIN
    -- Step 1: Find source patient
    SELECT * INTO v_source_patient FROM patients WHERE patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'ERROR'::TEXT, ('Patient not found: ' || p_source_patient_id)::TEXT, 0;
        RETURN;
    END IF;
    
    v_source_patient_uuid := v_source_patient.id;
    
    RETURN QUERY SELECT 
        'STEP 1'::TEXT, 
        ('Found patient: ' || v_source_patient.first_name || ' ' || v_source_patient.last_name || ' UUID: ' || v_source_patient_uuid::TEXT)::TEXT, 
        1;
    
    -- Step 2: Check how many medications exist for this patient
    SELECT COUNT(*) INTO v_medications_count
    FROM patient_medications
    WHERE patient_id = v_source_patient_uuid;
    
    RETURN QUERY SELECT 
        'STEP 2'::TEXT, 
        ('Medications found for source patient: ' || v_medications_count::TEXT)::TEXT, 
        v_medications_count;
    
    -- Step 3: Show the actual medication details
    FOR debug_info IN 
        SELECT ('Medication: ' || name || ' - ' || dosage || ' - ' || frequency)::TEXT
        FROM patient_medications
        WHERE patient_id = v_source_patient_uuid
    LOOP
        RETURN QUERY SELECT 'STEP 3'::TEXT, debug_info, 1;
    END LOOP;
    
    -- Step 4: Create new patient (simplified)
    INSERT INTO patients (
        tenant_id, patient_id, first_name, last_name, 
        date_of_birth, gender, created_at, updated_at
    ) VALUES (
        p_target_tenant_id, 'DEBUG001', v_source_patient.first_name, v_source_patient.last_name,
        v_source_patient.date_of_birth, v_source_patient.gender, NOW(), NOW()
    ) RETURNING id INTO v_new_patient_id;
    
    RETURN QUERY SELECT 
        'STEP 4'::TEXT, 
        ('Created new patient UUID: ' || v_new_patient_id::TEXT)::TEXT, 
        1;
    
    -- Step 5: Try to copy medications
    INSERT INTO patient_medications (
        patient_id, name, dosage, route, frequency, start_date, 
        prescribed_by, status, tenant_id, created_at, next_due
    )
    SELECT 
        v_new_patient_id,
        name,
        dosage,
        COALESCE(route, 'Oral'),
        frequency,
        COALESCE(start_date, CURRENT_DATE),
        COALESCE(prescribed_by, 'Unknown'),
        COALESCE(status, 'Active'),
        p_target_tenant_id,
        NOW(),
        COALESCE(next_due, NOW() + INTERVAL '1 day')
    FROM patient_medications
    WHERE patient_id = v_source_patient_uuid;
    
    GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    
    RETURN QUERY SELECT 
        'STEP 5'::TEXT, 
        ('Medications copied: ' || v_medications_count::TEXT)::TEXT, 
        v_medications_count;
    
    -- Step 6: Verify medications were copied
    SELECT COUNT(*) INTO v_medications_count
    FROM patient_medications
    WHERE patient_id = v_new_patient_id;
    
    RETURN QUERY SELECT 
        'STEP 6'::TEXT, 
        ('Medications now linked to new patient: ' || v_medications_count::TEXT)::TEXT, 
        v_medications_count;
    
    -- Clean up - delete the debug patient
    DELETE FROM patient_medications WHERE patient_id = v_new_patient_id;
    DELETE FROM patients WHERE id = v_new_patient_id;
    
    RETURN QUERY SELECT 'CLEANUP'::TEXT, 'Debug patient deleted'::TEXT, 0;
END;
$$ LANGUAGE plpgsql;