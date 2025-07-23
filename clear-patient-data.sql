-- Clear all patient data for fresh multi-tenant setup
-- WARNING: This will permanently delete all patient data!

-- Delete related data first (due to foreign key constraints)
DELETE FROM patient_vitals;
DELETE FROM patient_notes;  
DELETE FROM patient_medications;
DELETE FROM medication_administrations;
DELETE FROM patient_images;

-- Finally delete patients
DELETE FROM patients;

-- Reset any sequences if needed
-- ALTER SEQUENCE patients_id_seq RESTART WITH 1;

-- Verify deletion
SELECT 'patients' as table_name, COUNT(*) as remaining_records FROM patients
UNION ALL
SELECT 'patient_vitals' as table_name, COUNT(*) as remaining_records FROM patient_vitals
UNION ALL
SELECT 'patient_notes' as table_name, COUNT(*) as remaining_records FROM patient_notes
UNION ALL
SELECT 'patient_medications' as table_name, COUNT(*) as remaining_records FROM patient_medications
UNION ALL
SELECT 'medication_administrations' as table_name, COUNT(*) as remaining_records FROM medication_administrations
UNION ALL
SELECT 'patient_images' as table_name, COUNT(*) as remaining_records FROM patient_images;
