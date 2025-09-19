-- Update the instantiate_simulation_patients function to work with new template tables
-- This function creates simulation patients from templates including vitals, medications, and notes

CREATE OR REPLACE FUNCTION instantiate_simulation_patients(
    p_simulation_id UUID,
    p_scenario_template_id UUID
) RETURNS INTEGER AS $$
DECLARE
    template_record RECORD;
    patient_id UUID;
    vitals_record RECORD;
    med_record RECORD;
    note_record RECORD;
    patient_count INTEGER := 0;
BEGIN
    -- Loop through all patient templates for this scenario
    FOR template_record IN 
        SELECT * FROM simulation_patient_templates 
        WHERE scenario_template_id = p_scenario_template_id 
        AND is_active = true
    LOOP
        -- Create the simulation patient
        INSERT INTO simulation_patients (
            active_simulation_id,
            patient_id,
            patient_name,
            date_of_birth,
            gender,
            room_number,
            bed_number,
            diagnosis,
            condition,
            allergies,
            blood_type,
            emergency_contact_name,
            emergency_contact_relationship,
            emergency_contact_phone,
            assigned_nurse,
            scenario_template_id
        ) VALUES (
            p_simulation_id,
            gen_random_uuid()::text,
            template_record.patient_name,
            template_record.date_of_birth,
            template_record.gender,
            template_record.room_number,
            template_record.bed_number,
            template_record.diagnosis,
            template_record.condition,
            template_record.allergies,
            template_record.blood_type,
            template_record.emergency_contact_name,
            template_record.emergency_contact_relationship,
            template_record.emergency_contact_phone,
            template_record.assigned_nurse,
            p_scenario_template_id
        ) RETURNING id INTO patient_id;

        -- Add initial vitals from template
        FOR vitals_record IN 
            SELECT * FROM patient_vitals_templates 
            WHERE patient_template_id = template_record.id 
        LOOP
            INSERT INTO simulation_patient_vitals (
                simulation_patient_id,
                vital_type,
                value_systolic,
                value_diastolic,
                value_numeric,
                unit,
                recorded_at,
                recorded_by,
                notes
            ) VALUES (
                patient_id,
                vitals_record.vital_type,
                vitals_record.value_systolic,
                vitals_record.value_diastolic,
                vitals_record.value_numeric,
                vitals_record.unit,
                NOW(),
                'system',
                vitals_record.notes
            );
        END LOOP;

        -- Add initial medications from template
        FOR med_record IN 
            SELECT * FROM patient_medications_templates 
            WHERE patient_template_id = template_record.id 
            AND is_active = true
        LOOP
            INSERT INTO simulation_patient_medications (
                simulation_patient_id,
                medication_name,
                dosage,
                route,
                frequency,
                start_date,
                end_date,
                indication,
                is_prn,
                is_active,
                prescribed_by,
                prescribed_at,
                notes
            ) VALUES (
                patient_id,
                med_record.medication_name,
                med_record.dosage,
                med_record.route,
                med_record.frequency,
                COALESCE(med_record.start_date, CURRENT_DATE),
                med_record.end_date,
                med_record.indication,
                med_record.is_prn,
                med_record.is_active,
                'system',
                NOW(),
                med_record.notes
            );
        END LOOP;

        -- Add initial notes from template
        FOR note_record IN 
            SELECT * FROM patient_notes_templates 
            WHERE patient_template_id = template_record.id 
        LOOP
            INSERT INTO simulation_patient_notes (
                simulation_patient_id,
                note_type,
                note_content,
                created_by,
                created_by_name,
                created_by_role,
                note_title,
                timestamp_offset_hours,
                is_locked,
                tags
            ) VALUES (
                patient_id,
                note_record.note_type,
                note_record.note_content,
                'system',
                'System',
                note_record.created_by_role,
                note_record.note_title,
                note_record.timestamp_offset_hours,
                note_record.is_locked,
                note_record.tags
            );
        END LOOP;

        patient_count := patient_count + 1;
    END LOOP;

    RETURN patient_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION instantiate_simulation_patients(UUID, UUID) TO authenticated;