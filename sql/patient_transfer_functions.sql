-- SQL functions to support patient transfer operations

-- Function to safely duplicate patient with all related data
CREATE OR REPLACE FUNCTION duplicate_patient_to_tenant(
    p_source_patient_id UUID,
    p_target_tenant_id UUID,
    p_new_patient_id TEXT DEFAULT NULL,
    p_include_vitals BOOLEAN DEFAULT true,
    p_include_medications BOOLEAN DEFAULT true,
    p_include_notes BOOLEAN DEFAULT true,
    p_include_assessments BOOLEAN DEFAULT true
) RETURNS TABLE (
    new_patient_id UUID,
    new_patient_identifier TEXT,
    records_created JSONB
) AS $$
DECLARE
    v_new_patient_id UUID;
    v_new_patient_identifier TEXT;
    v_source_patient RECORD;
    v_vitals_count INTEGER := 0;
    v_medications_count INTEGER := 0;
    v_notes_count INTEGER := 0;
    v_assessments_count INTEGER := 0;
BEGIN
    -- Get source patient data
    SELECT * INTO v_source_patient
    FROM patients 
    WHERE id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source patient not found';
    END IF;
    
    -- Generate new patient identifier if not provided
    IF p_new_patient_id IS NULL THEN
        -- Get tenant subdomain for prefix
        SELECT COALESCE(UPPER(LEFT(subdomain, 3)), 'PT') INTO v_new_patient_identifier
        FROM tenants 
        WHERE id = p_target_tenant_id;
        
        -- Find next available number
        SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO v_new_patient_identifier
        FROM patients 
        WHERE tenant_id = p_target_tenant_id
        AND patient_id ~ (v_new_patient_identifier || '[0-9]+$');
        
        v_new_patient_identifier := v_new_patient_identifier || LPAD(v_new_patient_identifier::TEXT, 3, '0');
    ELSE
        v_new_patient_identifier := p_new_patient_id;
    END IF;
    
    -- Create new patient record
    INSERT INTO patients (
        tenant_id,
        patient_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        room_number,
        bed_number,
        admission_date,
        condition,
        diagnosis,
        allergies,
        blood_type,
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_phone,
        assigned_nurse,
        created_at,
        updated_at
    ) VALUES (
        p_target_tenant_id,
        v_new_patient_identifier,
        v_source_patient.first_name,
        v_source_patient.last_name,
        v_source_patient.date_of_birth,
        v_source_patient.gender,
        v_source_patient.room_number,
        v_source_patient.bed_number,
        v_source_patient.admission_date,
        v_source_patient.condition,
        v_source_patient.diagnosis,
        v_source_patient.allergies,
        v_source_patient.blood_type,
        v_source_patient.emergency_contact_name,
        v_source_patient.emergency_contact_relationship,
        v_source_patient.emergency_contact_phone,
        v_source_patient.assigned_nurse,
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_patient_id;
    
    -- Copy vitals if requested
    IF p_include_vitals THEN
        INSERT INTO patient_vitals (
            patient_id,
            temperature,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            respiratory_rate,
            oxygen_saturation,
            recorded_at,
            created_at
        )
        SELECT 
            v_new_patient_id,
            temperature,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            respiratory_rate,
            oxygen_saturation,
            recorded_at,
            NOW()
        FROM patient_vitals
        WHERE patient_id = p_source_patient_id;
        
        GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    END IF;
    
    -- Copy medications if requested
    IF p_include_medications THEN
        INSERT INTO patient_medications (
            patient_id,
            medication_name,
            dosage,
            route,
            frequency,
            start_date,
            end_date,
            prescribed_by,
            notes,
            is_active,
            created_at
        )
        SELECT 
            v_new_patient_id,
            medication_name,
            dosage,
            route,
            frequency,
            start_date,
            end_date,
            prescribed_by,
            notes,
            is_active,
            NOW()
        FROM patient_medications
        WHERE patient_id = p_source_patient_id;
        
        GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    END IF;
    
    -- Copy notes if requested
    IF p_include_notes THEN
        INSERT INTO patient_notes (
            patient_id,
            note_type,
            note_content,
            created_by,
            is_locked,
            created_at
        )
        SELECT 
            v_new_patient_id,
            note_type,
            note_content,
            created_by,
            is_locked,
            NOW()
        FROM patient_notes
        WHERE patient_id = p_source_patient_id;
        
        GET DIAGNOSTICS v_notes_count = ROW_COUNT;
    END IF;
    
    -- Copy assessments if requested (if table exists)
    IF p_include_assessments THEN
        BEGIN
            INSERT INTO patient_assessments (
                patient_id,
                assessment_type,
                assessment_data,
                performed_by,
                performed_at,
                created_at
            )
            SELECT 
                v_new_patient_id,
                assessment_type,
                assessment_data,
                performed_by,
                performed_at,
                NOW()
            FROM patient_assessments
            WHERE patient_id = p_source_patient_id;
            
            GET DIAGNOSTICS v_assessments_count = ROW_COUNT;
        EXCEPTION WHEN undefined_table THEN
            -- Table doesn't exist, skip
            v_assessments_count := 0;
        END;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT 
        v_new_patient_id,
        v_new_patient_identifier,
        jsonb_build_object(
            'vitals', v_vitals_count,
            'medications', v_medications_count,
            'notes', v_notes_count,
            'assessments', v_assessments_count
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move patient between tenants
CREATE OR REPLACE FUNCTION move_patient_to_tenant(
    p_patient_id UUID,
    p_target_tenant_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update patient tenant
    UPDATE patients 
    SET tenant_id = p_target_tenant_id,
        updated_at = NOW()
    WHERE id = p_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found';
    END IF;
    
    -- Update related records that have tenant_id (if they exist)
    BEGIN
        UPDATE patient_medications 
        SET tenant_id = p_target_tenant_id 
        WHERE patient_id = p_patient_id;
    EXCEPTION WHEN undefined_column THEN
        -- Column doesn't exist, skip
        NULL;
    END;
    
    BEGIN
        UPDATE patient_notes 
        SET tenant_id = p_target_tenant_id 
        WHERE patient_id = p_patient_id;
    EXCEPTION WHEN undefined_column THEN
        -- Column doesn't exist, skip
        NULL;
    END;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available tenants for transfer (excluding source)
CREATE OR REPLACE FUNCTION get_available_tenants_for_transfer(p_source_patient_id UUID)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    subdomain TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.subdomain
    FROM tenants t
    WHERE t.id != (
        SELECT p.tenant_id 
        FROM patients p 
        WHERE p.id = p_source_patient_id
    )
    AND t.tenant_type = 'institution'
    ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION duplicate_patient_to_tenant(UUID, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION move_patient_to_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_tenants_for_transfer(UUID) TO authenticated;