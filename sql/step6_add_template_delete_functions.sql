-- Add delete function for scenario templates with proper cascade handling
-- This function safely deletes a scenario template and all related data

CREATE OR REPLACE FUNCTION delete_scenario_template(
    p_scenario_template_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    patient_template_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    -- Check if the scenario template exists and user has permission
    IF NOT EXISTS (
        SELECT 1 FROM scenario_templates 
        WHERE id = p_scenario_template_id 
        AND (
            created_by = auth.uid()
            OR tenant_id IN (
                SELECT tenant_id FROM tenant_users 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'instructor')
            )
        )
    ) THEN
        RAISE EXCEPTION 'Scenario template not found or access denied';
    END IF;

    -- First, delete all related template data for each patient template
    FOR patient_template_record IN 
        SELECT id FROM simulation_patient_templates 
        WHERE scenario_template_id = p_scenario_template_id
    LOOP
        -- Delete vitals templates
        DELETE FROM patient_vitals_templates 
        WHERE patient_template_id = patient_template_record.id;
        
        -- Delete medications templates
        DELETE FROM patient_medications_templates 
        WHERE patient_template_id = patient_template_record.id;
        
        -- Delete notes templates
        DELETE FROM patient_notes_templates 
        WHERE patient_template_id = patient_template_record.id;
        
        deleted_count := deleted_count + 1;
    END LOOP;

    -- Delete all patient templates for this scenario
    DELETE FROM simulation_patient_templates 
    WHERE scenario_template_id = p_scenario_template_id;

    -- Finally, delete the scenario template itself
    DELETE FROM scenario_templates 
    WHERE id = p_scenario_template_id;

    -- Log the deletion
    RAISE NOTICE 'Deleted scenario template % with % patient templates', p_scenario_template_id, deleted_count;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_scenario_template(UUID) TO authenticated;

-- Also add a function to delete individual patient templates
CREATE OR REPLACE FUNCTION delete_patient_template(
    p_patient_template_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the patient template exists and user has permission
    IF NOT EXISTS (
        SELECT 1 FROM simulation_patient_templates pt
        JOIN scenario_templates st ON pt.scenario_template_id = st.id
        WHERE pt.id = p_patient_template_id 
        AND (
            st.created_by = auth.uid()
            OR st.tenant_id IN (
                SELECT tenant_id FROM tenant_users 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'instructor')
            )
        )
    ) THEN
        RAISE EXCEPTION 'Patient template not found or access denied';
    END IF;

    -- Delete related template data (cascading deletes should handle this, but being explicit)
    DELETE FROM patient_vitals_templates 
    WHERE patient_template_id = p_patient_template_id;
    
    DELETE FROM patient_medications_templates 
    WHERE patient_template_id = p_patient_template_id;
    
    DELETE FROM patient_notes_templates 
    WHERE patient_template_id = p_patient_template_id;

    -- Delete the patient template
    DELETE FROM simulation_patient_templates 
    WHERE id = p_patient_template_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_patient_template(UUID) TO authenticated;