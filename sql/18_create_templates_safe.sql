-- Create basic scenario templates and patient templates for testing
-- This will provide working data for the simulation system

-- First, let's check what tenants exist and create scenario templates accordingly
DO $$
DECLARE
    main_tenant_id UUID;
    main_user_id UUID;
    scenario_template_id UUID;
    patient_template_id UUID;
BEGIN
    -- Find the first available tenant (not simulation type)
    SELECT id INTO main_tenant_id 
    FROM tenants 
    WHERE tenant_type IS NULL OR tenant_type != 'simulation' 
    LIMIT 1;
    
    -- Find the first available user
    SELECT id INTO main_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF main_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No suitable tenant found. Please create a tenant first.';
    END IF;
    
    IF main_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Please create a user first.';
    END IF;
    
    RAISE NOTICE 'Using tenant_id: % and user_id: %', main_tenant_id, main_user_id;
    
    -- Check if Emergency Cardiac Event scenario already exists
    SELECT id INTO scenario_template_id 
    FROM scenario_templates 
    WHERE tenant_id = main_tenant_id AND name = 'Emergency Cardiac Event';
    
    -- Create Emergency Cardiac Event scenario template if it doesn't exist
    IF scenario_template_id IS NULL THEN
        INSERT INTO scenario_templates (
            id,
            tenant_id,
            name,
            description,
            learning_objectives,
            difficulty_level,
            estimated_duration_minutes,
            created_by,
            tags
        ) VALUES (
            gen_random_uuid(),
            main_tenant_id,
            'Emergency Cardiac Event',
            'A patient presents with chest pain and requires immediate assessment and intervention.',
            ARRAY[
                'Assess patient with chest pain',
                'Perform appropriate cardiac monitoring',
                'Administer emergency medications',
                'Document vital signs and response to treatment'
            ],
            'intermediate',
            45,
            main_user_id,
            ARRAY['cardiology', 'emergency', 'acute_care']
        )
        RETURNING id INTO scenario_template_id;
    END IF;
    
    RAISE NOTICE 'Created/found scenario template: %', scenario_template_id;
    
    -- Check if patient template already exists
    SELECT id INTO patient_template_id 
    FROM simulation_patient_templates 
    WHERE scenario_template_id = scenario_template_id AND patient_name = 'John Smith';
    
    -- Create patient template for Emergency Cardiac Event if it doesn't exist
    IF patient_template_id IS NULL THEN
        INSERT INTO simulation_patient_templates (
            id,
            scenario_template_id,
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
            is_active
        ) VALUES (
            gen_random_uuid(),
            scenario_template_id,
            'John Smith',
            65,
            'Male',
            '1959-03-15'::date,
            'ER-101',
            'A',
            'Chest Pain - Rule Out MI',
            'Stable',
            ARRAY['Penicillin'],
            'O+',
            'Mary Smith',
            'Spouse',
            '555-0123',
            'Nurse Johnson',
            true
        )
        RETURNING id INTO patient_template_id;
    END IF;
    
    RAISE NOTICE 'Created/found patient template: %', patient_template_id;
    
    -- Create vitals templates
    INSERT INTO simulation_vitals_templates (
        id, patient_template_id, vital_type, value_systolic, value_diastolic, 
        value_numeric, unit, is_initial_value, notes
    ) 
    SELECT 
        gen_random_uuid(), patient_template_id, vital_type, value_systolic, 
        value_diastolic, value_numeric, unit, true, notes
    FROM (VALUES
        ('blood_pressure', 150, 95, null, 'mmHg', 'Elevated BP on admission'),
        ('heart_rate', null, null, 88, 'bpm', 'Regular rhythm'),
        ('respiratory_rate', null, null, 22, 'breaths/min', 'Slightly elevated'),
        ('temperature', null, null, 98.6, 'F', 'Normal temperature'),
        ('oxygen_saturation', null, null, 94, '%', 'On room air'),
        ('pain_scale', null, null, 7, '1-10', 'Chest pain severity')
    ) AS vitals(vital_type, value_systolic, value_diastolic, value_numeric, unit, notes)
    WHERE NOT EXISTS (
        SELECT 1 FROM simulation_vitals_templates 
        WHERE patient_template_id = patient_template_id 
        AND vital_type = vitals.vital_type
    );
    
    -- Create medications templates
    INSERT INTO simulation_medications_templates (
        id, patient_template_id, medication_name, dosage, route, frequency, 
        indication, is_prn, is_active, notes
    ) 
    SELECT 
        gen_random_uuid(), patient_template_id, medication_name, dosage, 
        route, frequency, indication, is_prn, true, notes
    FROM (VALUES
        ('Aspirin', '325 mg', 'PO', 'Once', 'Chest pain/MI prophylaxis', false, 'Chewed and swallowed'),
        ('Nitroglycerin', '0.4 mg', 'SL', 'PRN', 'Chest pain', true, 'May repeat q5min x3'),
        ('Metoprolol', '25 mg', 'PO', 'BID', 'Hypertension/Cardioprotective', false, 'Hold if HR < 60'),
        ('Atorvastatin', '40 mg', 'PO', 'Daily', 'Hyperlipidemia', false, 'Take at bedtime')
    ) AS meds(medication_name, dosage, route, frequency, indication, is_prn, notes)
    WHERE NOT EXISTS (
        SELECT 1 FROM simulation_medications_templates 
        WHERE patient_template_id = patient_template_id 
        AND medication_name = meds.medication_name
    );
    
    -- Create notes templates
    INSERT INTO simulation_notes_templates (
        id, patient_template_id, note_type, note_content, created_by_role, is_initial_note
    ) 
    SELECT 
        gen_random_uuid(), patient_template_id, note_type, note_content, created_by_role, true
    FROM (VALUES
        ('admission', '65 y/o male presents with acute onset chest pain. Pain described as crushing, 7/10 severity, radiating to left arm. No relief with rest. Arrived via EMS.', 'nurse'),
        ('assessment', 'Patient appears anxious, diaphoretic. Denies shortness of breath. No previous cardiac history. Takes no medications regularly. Family history positive for CAD.', 'nurse'),
        ('plan', 'Monitor cardiac rhythm, obtain 12-lead EKG, chest X-ray, cardiac enzymes. Administer aspirin, establish IV access. NPO pending further evaluation.', 'physician')
    ) AS notes(note_type, note_content, created_by_role)
    WHERE NOT EXISTS (
        SELECT 1 FROM simulation_notes_templates 
        WHERE patient_template_id = patient_template_id 
        AND note_type = notes.note_type
    );
    
    -- Now create a second scenario template
    SELECT id INTO scenario_template_id 
    FROM scenario_templates 
    WHERE tenant_id = main_tenant_id AND name = 'Post-Surgical Recovery';
    
    -- Create Post-Surgical Recovery scenario if it doesn't exist
    IF scenario_template_id IS NULL THEN
        INSERT INTO scenario_templates (
            id,
            tenant_id,
            name,
            description,
            learning_objectives,
            difficulty_level,
            estimated_duration_minutes,
            created_by,
            tags
        ) VALUES (
            gen_random_uuid(),
            main_tenant_id,
            'Post-Surgical Recovery',
            'Monitor a patient recovering from routine surgery.',
            ARRAY[
                'Monitor post-operative vital signs',
                'Assess pain levels and provide appropriate intervention',
                'Document recovery progress',
                'Recognize complications'
            ],
            'beginner',
            30,
            main_user_id,
            ARRAY['surgery', 'recovery', 'pain_management']
        )
        RETURNING id INTO scenario_template_id;
    END IF;
    
    -- Create patient template for Post-Surgical Recovery if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM simulation_patient_templates 
        WHERE scenario_template_id = scenario_template_id AND patient_name = 'Sarah Johnson'
    ) THEN
        INSERT INTO simulation_patient_templates (
            id,
            scenario_template_id,
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
            is_active
        ) VALUES (
            gen_random_uuid(),
            scenario_template_id,
            'Sarah Johnson',
            42,
            'Female',
            '1982-08-22'::date,
            '205',
            'B',
            'Post-op Laparoscopic Cholecystectomy',
            'Stable',
            ARRAY['NKDA'],
            'A-',
            'Robert Johnson',
            'Spouse',
            '555-0456',
            'Nurse Williams',
            true
        );
    END IF;
    
    RAISE NOTICE 'Basic scenario and patient templates created successfully';
    
END $$;