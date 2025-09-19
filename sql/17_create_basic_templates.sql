-- Create basic scenario templates and patient templates for testing
-- This will provide working data for the simulation system

-- First, let's create a simple scenario template
-- Note: We'll need to use a real tenant_id - this should be updated with your actual tenant ID

-- Debug: Check what tenants exist
DO $$
DECLARE
    tenant_count INTEGER;
    tenant_record RECORD;
BEGIN
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    RAISE NOTICE 'Total tenants found: %', tenant_count;
    
    FOR tenant_record IN SELECT id, name, tenant_type FROM tenants LIMIT 5 LOOP
        RAISE NOTICE 'Tenant: % - % (type: %)', tenant_record.id, tenant_record.name, tenant_record.tenant_type;
    END LOOP;
END $$;

-- Create a basic Emergency Medicine scenario template
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
  (SELECT id FROM tenants WHERE tenant_type IS NULL OR tenant_type != 'simulation' LIMIT 1), -- Use any non-simulation tenant
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
  (SELECT id FROM auth.users LIMIT 1), -- Use an existing user ID
  ARRAY['cardiology', 'emergency', 'acute_care']
) ON CONFLICT DO NOTHING;

-- Get the scenario template ID for creating patient templates
WITH scenario AS (
  SELECT id as scenario_id FROM scenario_templates WHERE name = 'Emergency Cardiac Event' LIMIT 1
)
-- Create a patient template for this scenario
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
) 
SELECT 
  gen_random_uuid(),
  scenario.scenario_id,
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
FROM scenario LIMIT 1
ON CONFLICT DO NOTHING;

-- Get the patient template ID for creating vitals templates
WITH patient_template AS (
  SELECT spt.id as patient_template_id 
  FROM simulation_patient_templates spt
  JOIN scenario_templates st ON st.id = spt.scenario_template_id
  WHERE st.name = 'Emergency Cardiac Event' 
  AND spt.patient_name = 'John Smith'
  LIMIT 1
)
-- Create initial vitals for this patient template
INSERT INTO simulation_vitals_templates (
  id,
  patient_template_id,
  vital_type,
  value_systolic,
  value_diastolic,
  value_numeric,
  unit,
  is_initial_value,
  notes
) 
SELECT 
  gen_random_uuid(),
  pt.patient_template_id,
  vital_type,
  value_systolic,
  value_diastolic,
  value_numeric,
  unit,
  true,
  notes
FROM patient_template pt
CROSS JOIN (VALUES
  ('blood_pressure', 150, 95, null, 'mmHg', 'Elevated BP on admission'),
  ('heart_rate', null, null, 88, 'bpm', 'Regular rhythm'),
  ('respiratory_rate', null, null, 22, 'breaths/min', 'Slightly elevated'),
  ('temperature', null, null, 98.6, 'F', 'Normal temperature'),
  ('oxygen_saturation', null, null, 94, '%', 'On room air'),
  ('pain_scale', null, null, 7, '1-10', 'Chest pain severity')
) AS vitals(vital_type, value_systolic, value_diastolic, value_numeric, unit, notes)
ON CONFLICT DO NOTHING;

-- Create medication templates
WITH patient_template AS (
  SELECT spt.id as patient_template_id 
  FROM simulation_patient_templates spt
  JOIN scenario_templates st ON st.id = spt.scenario_template_id
  WHERE st.name = 'Emergency Cardiac Event' 
  AND spt.patient_name = 'John Smith'
  LIMIT 1
)
INSERT INTO simulation_medications_templates (
  id,
  patient_template_id,
  medication_name,
  dosage,
  route,
  frequency,
  indication,
  is_prn,
  is_active,
  notes
) 
SELECT 
  gen_random_uuid(),
  pt.patient_template_id,
  medication_name,
  dosage,
  route,
  frequency,
  indication,
  is_prn,
  true,
  notes
FROM patient_template pt
CROSS JOIN (VALUES
  ('Aspirin', '325 mg', 'PO', 'Once', 'Chest pain/MI prophylaxis', false, 'Chewed and swallowed'),
  ('Nitroglycerin', '0.4 mg', 'SL', 'PRN', 'Chest pain', true, 'May repeat q5min x3'),
  ('Metoprolol', '25 mg', 'PO', 'BID', 'Hypertension/Cardioprotective', false, 'Hold if HR < 60'),
  ('Atorvastatin', '40 mg', 'PO', 'Daily', 'Hyperlipidemia', false, 'Take at bedtime')
) AS meds(medication_name, dosage, route, frequency, indication, is_prn, notes)
ON CONFLICT DO NOTHING;

-- Create initial notes templates
WITH patient_template AS (
  SELECT spt.id as patient_template_id 
  FROM simulation_patient_templates spt
  JOIN scenario_templates st ON st.id = spt.scenario_template_id
  WHERE st.name = 'Emergency Cardiac Event' 
  AND spt.patient_name = 'John Smith'
  LIMIT 1
)
INSERT INTO simulation_notes_templates (
  id,
  patient_template_id,
  note_type,
  note_content,
  created_by_role,
  is_initial_note
) 
SELECT 
  gen_random_uuid(),
  pt.patient_template_id,
  note_type,
  note_content,
  created_by_role,
  true
FROM patient_template pt
CROSS JOIN (VALUES
  ('admission', '65 y/o male presents with acute onset chest pain. Pain described as crushing, 7/10 severity, radiating to left arm. No relief with rest. Arrived via EMS.', 'nurse'),
  ('assessment', 'Patient appears anxious, diaphoretic. Denies shortness of breath. No previous cardiac history. Takes no medications regularly. Family history positive for CAD.', 'nurse'),
  ('plan', 'Monitor cardiac rhythm, obtain 12-lead EKG, chest X-ray, cardiac enzymes. Administer aspirin, establish IV access. NPO pending further evaluation.', 'physician')
) AS notes(note_type, note_content, created_by_role)
ON CONFLICT DO NOTHING;

-- Create a second simpler scenario for variety
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
  (SELECT id FROM tenants WHERE tenant_type IS NULL OR tenant_type != 'simulation' LIMIT 1),
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
  (SELECT id FROM auth.users LIMIT 1),
  ARRAY['surgery', 'recovery', 'pain_management']
) ON CONFLICT DO NOTHING;

-- Create patient template for post-surgical scenario
WITH scenario AS (
  SELECT id as scenario_id FROM scenario_templates WHERE name = 'Post-Surgical Recovery' LIMIT 1
)
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
) 
SELECT 
  gen_random_uuid(),
  scenario.scenario_id,
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
FROM scenario LIMIT 1
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Basic scenario and patient templates created successfully';