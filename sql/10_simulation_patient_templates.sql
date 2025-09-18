-- ============================================
-- SIMULATION PATIENT TEMPLATES SYSTEM
-- Enhanced simulation system with patient templates and reset functionality
-- ============================================

-- 1. Create simulation patient templates table
CREATE TABLE IF NOT EXISTS public.simulation_patient_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_template_id UUID NOT NULL REFERENCES scenario_templates(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE,
    room_number VARCHAR(10),
    bed_number VARCHAR(10),
    diagnosis TEXT NOT NULL,
    condition VARCHAR(20) DEFAULT 'Stable' CHECK (condition IN ('Critical', 'Stable', 'Improving', 'Discharged')),
    allergies TEXT[],
    blood_type VARCHAR(5),
    emergency_contact_name VARCHAR(255),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    assigned_nurse VARCHAR(255),
    
    -- Template metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(scenario_template_id, template_name)
);

-- 2. Create simulation vitals templates table
CREATE TABLE IF NOT EXISTS public.simulation_vitals_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_template_id UUID NOT NULL REFERENCES simulation_patient_templates(id) ON DELETE CASCADE,
    vital_type VARCHAR(50) NOT NULL, -- 'blood_pressure', 'heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation'
    value_systolic INTEGER, -- For blood pressure
    value_diastolic INTEGER, -- For blood pressure  
    value_numeric DECIMAL(10,2), -- For single numeric values
    value_text TEXT, -- For text-based values
    unit VARCHAR(20) NOT NULL, -- 'mmHg', 'bpm', '°F', '/min', '%', etc.
    is_initial_value BOOLEAN DEFAULT true, -- Whether this is the starting value
    normal_range_min DECIMAL(10,2),
    normal_range_max DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create simulation medications templates table
CREATE TABLE IF NOT EXISTS public.simulation_medications_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_template_id UUID NOT NULL REFERENCES simulation_patient_templates(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    route VARCHAR(50) NOT NULL, -- 'oral', 'IV', 'IM', 'sublingual', etc.
    frequency VARCHAR(100) NOT NULL, -- 'BID', 'TID', 'Q6H', 'PRN', etc.
    start_date DATE,
    end_date DATE,
    indication TEXT, -- Why the medication is prescribed
    special_instructions TEXT,
    is_prn BOOLEAN DEFAULT false, -- PRN (as needed) medication
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create simulation notes templates table  
CREATE TABLE IF NOT EXISTS public.simulation_notes_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_template_id UUID NOT NULL REFERENCES simulation_patient_templates(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL, -- 'admission', 'progress', 'discharge', 'nursing', 'physician'
    note_content TEXT NOT NULL,
    note_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_role VARCHAR(50) DEFAULT 'system', -- 'nurse', 'doctor', 'system'
    is_initial_note BOOLEAN DEFAULT true, -- Whether this appears at simulation start
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simulation_patient_templates_scenario ON simulation_patient_templates(scenario_template_id);
CREATE INDEX IF NOT EXISTS idx_simulation_vitals_templates_patient ON simulation_vitals_templates(patient_template_id);
CREATE INDEX IF NOT EXISTS idx_simulation_medications_templates_patient ON simulation_medications_templates(patient_template_id);
CREATE INDEX IF NOT EXISTS idx_simulation_notes_templates_patient ON simulation_notes_templates(patient_template_id);

-- 6. Create function to instantiate patients from templates
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
            age,
            gender,
            date_of_birth,
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
            template_id
        ) VALUES (
            p_simulation_id,
            gen_random_uuid()::text,
            template_record.patient_name,
            template_record.age,
            template_record.gender,
            template_record.date_of_birth,
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
            template_record.id
        ) RETURNING id INTO patient_id;

        -- Add initial vitals from template
        FOR vitals_record IN 
            SELECT * FROM simulation_vitals_templates 
            WHERE patient_template_id = template_record.id 
            AND is_initial_value = true
        LOOP
            INSERT INTO simulation_patient_vitals (
                simulation_patient_id,
                vital_type,
                value_systolic,
                value_diastolic,
                value_numeric,
                value_text,
                unit,
                recorded_at,
                recorded_by
            ) VALUES (
                patient_id,
                vitals_record.vital_type,
                vitals_record.value_systolic,
                vitals_record.value_diastolic,
                vitals_record.value_numeric,
                vitals_record.value_text,
                vitals_record.unit,
                NOW(),
                'system'
            );
        END LOOP;

        -- Add initial medications from template
        FOR med_record IN 
            SELECT * FROM simulation_medications_templates 
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
                special_instructions,
                is_prn,
                is_active,
                prescribed_by,
                prescribed_at
            ) VALUES (
                patient_id,
                med_record.medication_name,
                med_record.dosage,
                med_record.route,
                med_record.frequency,
                COALESCE(med_record.start_date, CURRENT_DATE),
                med_record.end_date,
                med_record.indication,
                med_record.special_instructions,
                med_record.is_prn,
                med_record.is_active,
                'system',
                NOW()
            );
        END LOOP;

        -- Add initial notes from template
        FOR note_record IN 
            SELECT * FROM simulation_notes_templates 
            WHERE patient_template_id = template_record.id 
            AND is_initial_note = true
        LOOP
            INSERT INTO simulation_patient_notes (
                simulation_patient_id,
                note_type,
                note_content,
                created_by,
                created_by_name,
                created_at
            ) VALUES (
                patient_id,
                note_record.note_type,
                note_record.note_content,
                gen_random_uuid(), -- System user ID
                note_record.created_by_role,
                note_record.note_timestamp
            );
        END LOOP;

        patient_count := patient_count + 1;
    END LOOP;

    RETURN patient_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to reset simulation to template defaults
CREATE OR REPLACE FUNCTION reset_simulation_to_template(
    p_simulation_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    simulation_record RECORD;
BEGIN
    -- Get simulation details
    SELECT scenario_template_id INTO simulation_record
    FROM active_simulations 
    WHERE id = p_simulation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Simulation not found';
    END IF;

    -- Delete all current simulation data
    DELETE FROM simulation_patient_vitals 
    WHERE simulation_patient_id IN (
        SELECT id FROM simulation_patients WHERE active_simulation_id = p_simulation_id
    );

    DELETE FROM simulation_patient_medications 
    WHERE simulation_patient_id IN (
        SELECT id FROM simulation_patients WHERE active_simulation_id = p_simulation_id
    );

    DELETE FROM simulation_patient_notes 
    WHERE simulation_patient_id IN (
        SELECT id FROM simulation_patients WHERE active_simulation_id = p_simulation_id
    );

    DELETE FROM simulation_patients WHERE active_simulation_id = p_simulation_id;

    -- Recreate patients from templates
    PERFORM instantiate_simulation_patients(p_simulation_id, simulation_record.scenario_template_id);

    -- Reset simulation status
    UPDATE active_simulations 
    SET 
        simulation_status = 'lobby',
        lobby_message = 'Simulation has been reset. Please wait for the instructor to start.'
    WHERE id = p_simulation_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 8. Add template_id column to simulation_patients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'simulation_patients' 
        AND column_name = 'template_id'
    ) THEN
        ALTER TABLE public.simulation_patients 
        ADD COLUMN template_id UUID REFERENCES simulation_patient_templates(id);
        
        RAISE NOTICE 'Added template_id column to simulation_patients';
    END IF;
END $$;

-- 9. Create view for easy template management
CREATE OR REPLACE VIEW simulation_template_overview AS
SELECT 
    st.id as scenario_id,
    st.name as scenario_name,
    st.description as scenario_description,
    st.difficulty_level,
    st.estimated_duration_minutes,
    COUNT(DISTINCT spt.id) as patient_count,
    COUNT(DISTINCT svt.id) as vitals_count,
    COUNT(DISTINCT smt.id) as medications_count,
    COUNT(DISTINCT snt.id) as notes_count,
    st.created_at,
    st.is_active
FROM scenario_templates st
LEFT JOIN simulation_patient_templates spt ON spt.scenario_template_id = st.id
LEFT JOIN simulation_vitals_templates svt ON svt.patient_template_id = spt.id
LEFT JOIN simulation_medications_templates smt ON smt.patient_template_id = spt.id
LEFT JOIN simulation_notes_templates snt ON snt.patient_template_id = spt.id
WHERE st.is_active = true
GROUP BY st.id, st.name, st.description, st.difficulty_level, st.estimated_duration_minutes, st.created_at, st.is_active;

-- 10. Success message
SELECT 'SIMULATION PATIENT TEMPLATES CREATED!' as status,
       'You can now create patient templates with vitals, medications, and notes' as message;