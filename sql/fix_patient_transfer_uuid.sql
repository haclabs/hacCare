-- Fix patient transfer function to use correct UUID fields for vitals and medications

DROP FUNCTION IF EXISTS duplicate_patient_to_tenant(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS move_patient_to_tenant(TEXT, UUID);
DROP FUNCTION IF EXISTS get_available_tenants_for_transfer(TEXT);

-- Function to safely duplicate patient with all related data
CREATE OR REPLACE FUNCTION duplicate_patient_to_tenant(
    p_source_patient_id TEXT,  -- Use TEXT for patient_id lookup
    p_target_tenant_id UUID,
    p_new_patient_id TEXT DEFAULT NULL,
    p_include_vitals BOOLEAN DEFAULT true,
    p_include_medications BOOLEAN DEFAULT true,
    p_include_notes BOOLEAN DEFAULT true,
    p_include_assessments BOOLEAN DEFAULT true
) RETURNS TABLE (
    new_patient_id UUID,
    new_patient_identifier VARCHAR(255),
    records_created JSONB
) AS $$
DECLARE
    v_new_patient_id UUID;
    v_new_patient_identifier VARCHAR(255);
    v_source_patient RECORD;
    v_source_patient_uuid UUID;
    v_vitals_count INTEGER := 0;
    v_medications_count INTEGER := 0;
    v_notes_count INTEGER := 0;
    v_assessments_count INTEGER := 0;
BEGIN
    -- Get source patient data using patient_id (string) instead of id (UUID)
    SELECT * INTO v_source_patient
    FROM patients 
    WHERE patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source patient not found with patient_id: %', p_source_patient_id;
    END IF;
    
    -- Store the source patient's UUID for vitals/medications lookup
    v_source_patient_uuid := v_source_patient.id;
    
    -- Generate new patient identifier if not provided
    IF p_new_patient_id IS NULL THEN
        -- Get tenant subdomain for prefix
        SELECT COALESCE(UPPER(LEFT(subdomain, 3)), 'PT')::VARCHAR(255) INTO v_new_patient_identifier
        FROM tenants 
        WHERE id = p_target_tenant_id;
        
        -- Find next available number
        DECLARE
            next_num INTEGER;
        BEGIN
            SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id FROM '[0-9]+$') AS INTEGER)), 0) + 1
            INTO next_num
            FROM patients 
            WHERE tenant_id = p_target_tenant_id
            AND patient_id ~ (v_new_patient_identifier || '[0-9]+$');
            
            v_new_patient_identifier := (v_new_patient_identifier || LPAD(next_num::TEXT, 3, '0'))::VARCHAR(255);
        END;
    ELSE
        v_new_patient_identifier := p_new_patient_id::VARCHAR(255);
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
    
    -- Copy vitals if requested (using UUID patient_id fields)
    IF p_include_vitals THEN
        INSERT INTO patient_vitals (
            patient_id,          -- UUID field
            temperature,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            respiratory_rate,
            oxygen_saturation,
            recorded_at,
            tenant_id
        )
        SELECT 
            v_new_patient_id,    -- New patient's UUID
            temperature,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            heart_rate,
            respiratory_rate,
            oxygen_saturation,
            recorded_at,
            p_target_tenant_id
        FROM patient_vitals
        WHERE patient_id = v_source_patient_uuid;  -- Source patient's UUID
        
        GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    END IF;
    
    -- Copy medications if requested (using UUID patient_id fields)
    IF p_include_medications THEN
        INSERT INTO patient_medications (
            patient_id,          -- UUID field
            name,
            dosage,
            route,
            frequency,
            start_date,
            end_date,
            prescribed_by,
            status,
            category,
            admin_time,
            tenant_id,
            created_at,
            last_administered,
            next_due
        )
        SELECT 
            v_new_patient_id,    -- New patient's UUID
            name,
            dosage,
            route,
            frequency,
            start_date,
            end_date,
            prescribed_by,
            status,
            category,
            admin_time,
            p_target_tenant_id,
            NOW(),
            last_administered,
            COALESCE(next_due, NOW())  -- Use existing next_due or default to NOW()
        FROM patient_medications
        WHERE patient_id = v_source_patient_uuid;  -- Source patient's UUID
        
        GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    END IF;
    
    -- Return results
    RETURN QUERY SELECT 
        v_new_patient_id,
        v_new_patient_identifier,
        jsonb_build_object(
            'vitals_copied', v_vitals_count,
            'medications_copied', v_medications_count,
            'notes_copied', v_notes_count,
            'assessments_copied', v_assessments_count
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to move patient between tenants (preserves patient_id string but updates tenant)
CREATE OR REPLACE FUNCTION move_patient_to_tenant(
    p_source_patient_id TEXT,
    p_target_tenant_id UUID
) RETURNS TABLE (
    patient_id UUID,
    patient_identifier VARCHAR(255),
    records_updated JSONB
) AS $$
DECLARE
    v_patient_uuid UUID;
    v_patient_identifier VARCHAR(255);
    v_vitals_count INTEGER := 0;
    v_medications_count INTEGER := 0;
BEGIN
    -- Get patient UUID and identifier
    SELECT id, patients.patient_id INTO v_patient_uuid, v_patient_identifier
    FROM patients 
    WHERE patients.patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found with patient_id: %', p_source_patient_id;
    END IF;
    
    -- Update patient tenant
    UPDATE patients 
    SET tenant_id = p_target_tenant_id,
        updated_at = NOW()
    WHERE id = v_patient_uuid;
    
    -- Update vitals tenant
    UPDATE patient_vitals 
    SET tenant_id = p_target_tenant_id
    WHERE patient_id = v_patient_uuid;
    
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    
    -- Update medications tenant
    UPDATE patient_medications 
    SET tenant_id = p_target_tenant_id
    WHERE patient_id = v_patient_uuid;
    
    GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    
    -- Return results
    RETURN QUERY SELECT 
        v_patient_uuid,
        v_patient_identifier,
        jsonb_build_object(
            'vitals_updated', v_vitals_count,
            'medications_updated', v_medications_count
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available tenants for transfer
CREATE OR REPLACE FUNCTION get_available_tenants_for_transfer(
    p_source_patient_id TEXT
) RETURNS TABLE (
    tenant_id UUID,
    tenant_name VARCHAR(255),
    subdomain VARCHAR(100)
) AS $$
DECLARE
    v_source_tenant_id UUID;
BEGIN
    -- Get source patient's tenant
    SELECT patients.tenant_id INTO v_source_tenant_id
    FROM patients 
    WHERE patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found with patient_id: %', p_source_patient_id;
    END IF;
    
    -- Return all tenants except the source tenant
    RETURN QUERY 
    SELECT 
        t.id,
        t.name,
        t.subdomain
    FROM tenants t
    WHERE t.id != v_source_tenant_id
    AND t.status = 'active'
    ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION duplicate_patient_to_tenant(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION move_patient_to_tenant(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_tenants_for_transfer(TEXT) TO authenticated;