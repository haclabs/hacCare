-- Seed script for multi-tenant test data
-- This script creates sample organizations and assigns existing users to them

-- =============================================
-- 1. Create Sample Organizations
-- =============================================

-- Insert demo organizations
INSERT INTO organizations (name, slug, description, is_active, settings) VALUES
    ('General Hospital', 'general-hospital', 'Main teaching hospital with all specialties', true, '{"timezone": "UTC", "features": ["vitals", "medications", "alerts"]}'),
    ('Pediatric Care Center', 'pediatric-center', 'Specialized pediatric hospital', true, '{"timezone": "UTC", "features": ["vitals", "medications"], "specialty": "pediatrics"}'),
    ('Emergency Medical Services', 'emergency-services', 'Emergency and trauma care facility', true, '{"timezone": "UTC", "features": ["vitals", "alerts"], "priority": "emergency"}')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 2. Assign Existing Users to Organizations
-- =============================================

-- Get the organization IDs for assignment
DO $$
DECLARE
    general_hospital_id UUID;
    pediatric_center_id UUID;
    emergency_services_id UUID;
BEGIN
    -- Get organization IDs
    SELECT id INTO general_hospital_id FROM organizations WHERE slug = 'general-hospital';
    SELECT id INTO pediatric_center_id FROM organizations WHERE slug = 'pediatric-center';
    SELECT id INTO emergency_services_id FROM organizations WHERE slug = 'emergency-services';
    
    -- Update existing user profiles to assign them to organizations
    -- Assign first few users to General Hospital
    UPDATE user_profiles 
    SET organization_id = general_hospital_id 
    WHERE organization_id IS NULL 
    AND id IN (
        SELECT id FROM user_profiles 
        WHERE organization_id IS NULL 
        ORDER BY created_at 
        LIMIT 3
    );
    
    -- Assign next users to Pediatric Center
    UPDATE user_profiles 
    SET organization_id = pediatric_center_id 
    WHERE organization_id IS NULL 
    AND id IN (
        SELECT id FROM user_profiles 
        WHERE organization_id IS NULL 
        ORDER BY created_at 
        LIMIT 2
    );
    
    -- Assign remaining users to Emergency Services
    UPDATE user_profiles 
    SET organization_id = emergency_services_id 
    WHERE organization_id IS NULL;
    
    -- Create a super admin user if none exists
    INSERT INTO user_profiles (
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        organization_id, 
        is_active
    ) VALUES (
        gen_random_uuid(),
        'superadmin@haccare.demo',
        'Super',
        'Admin',
        'super_admin',
        general_hospital_id,
        true
    ) ON CONFLICT (email) DO UPDATE SET
        role = 'super_admin',
        organization_id = general_hospital_id;
        
END $$;

-- =============================================
-- 3. Update Existing Patients with Organizations
-- =============================================

-- Assign existing patients to organizations based on their assigned nurses
UPDATE patients 
SET organization_id = (
    SELECT organization_id 
    FROM user_profiles 
    WHERE CONCAT(first_name, ' ', last_name) = patients.assigned_nurse
    LIMIT 1
)
WHERE organization_id IS NULL
AND assigned_nurse IS NOT NULL;

-- Assign remaining patients to General Hospital as default
UPDATE patients 
SET organization_id = (
    SELECT id FROM organizations WHERE slug = 'general-hospital'
)
WHERE organization_id IS NULL;

-- =============================================
-- 4. Update Patient Vitals with Organizations
-- =============================================

-- Update patient vitals to match their patient's organization
UPDATE patient_vitals 
SET organization_id = (
    SELECT p.organization_id 
    FROM patients p 
    WHERE p.id = patient_vitals.patient_id
)
WHERE organization_id IS NULL;

-- =============================================
-- 5. Update Patient Notes with Organizations
-- =============================================

-- Update patient notes to match their patient's organization
UPDATE patient_notes 
SET organization_id = (
    SELECT p.organization_id 
    FROM patients p 
    WHERE p.id = patient_notes.patient_id
)
WHERE organization_id IS NULL;

-- =============================================
-- 6. Create Sample Data for Different Organizations
-- =============================================

DO $$
DECLARE
    general_hospital_id UUID;
    pediatric_center_id UUID;
    emergency_services_id UUID;
    sample_user_id UUID;
BEGIN
    -- Get organization IDs
    SELECT id INTO general_hospital_id FROM organizations WHERE slug = 'general-hospital';
    SELECT id INTO pediatric_center_id FROM organizations WHERE slug = 'pediatric-center';
    SELECT id INTO emergency_services_id FROM organizations WHERE slug = 'emergency-services';
    
    -- Get a sample user for each organization
    SELECT id INTO sample_user_id FROM user_profiles WHERE organization_id = pediatric_center_id LIMIT 1;
    
    -- Create sample patient for Pediatric Center
    INSERT INTO patients (
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
        organization_id
    ) VALUES (
        'PED001',
        'Emma',
        'Johnson',
        '2018-05-15',
        'Female',
        'P101',
        'A',
        CURRENT_DATE - INTERVAL '2 days',
        'Stable',
        'Viral pneumonia',
        ARRAY['Penicillin'],
        'O+',
        'Sarah Johnson',
        'Mother',
        '+1-555-0123',
        'Dr. Pediatric Nurse',
        pediatric_center_id
    ) ON CONFLICT (patient_id) DO NOTHING;
    
    -- Create sample patient for Emergency Services
    INSERT INTO patients (
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
        organization_id
    ) VALUES (
        'EM001',
        'Robert',
        'Williams',
        '1985-10-22',
        'Male',
        'ER05',
        'B',
        CURRENT_DATE,
        'Critical',
        'Motor vehicle accident trauma',
        ARRAY[]::TEXT[],
        'A+',
        'Linda Williams',
        'Spouse',
        '+1-555-0456',
        'Emergency Nurse',
        emergency_services_id
    ) ON CONFLICT (patient_id) DO NOTHING;
    
END $$;

-- =============================================
-- 7. Verify Data Integrity
-- =============================================

-- Show organization distribution
DO $$
DECLARE
    org_record RECORD;
    patient_count INTEGER;
    user_count INTEGER;
BEGIN
    RAISE NOTICE 'Organization Data Summary:';
    RAISE NOTICE '========================';
    
    FOR org_record IN SELECT id, name, slug FROM organizations ORDER BY name LOOP
        SELECT COUNT(*) INTO user_count FROM user_profiles WHERE organization_id = org_record.id;
        SELECT COUNT(*) INTO patient_count FROM patients WHERE organization_id = org_record.id;
        
        RAISE NOTICE 'Organization: % (%))', org_record.name, org_record.slug;
        RAISE NOTICE '  Users: %', user_count;
        RAISE NOTICE '  Patients: %', patient_count;
        RAISE NOTICE '';
    END LOOP;
END $$;