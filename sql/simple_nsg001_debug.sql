-- Simple NSG001 medication debug
-- Run this one query at a time

-- Query 1: Does NSG001 exist?
SELECT patient_id, id, first_name, last_name FROM patients WHERE patient_id = 'NSG001';

-- Query 2: Count medications for NSG001
SELECT COUNT(*) as med_count FROM patient_medications pm 
JOIN patients p ON pm.patient_id = p.id 
WHERE p.patient_id = 'NSG001';

-- Query 3: Show NSG001 medications if they exist
SELECT pm.name, pm.dosage, pm.status FROM patient_medications pm 
JOIN patients p ON pm.patient_id = p.id 
WHERE p.patient_id = 'NSG001';

-- Query 4: Check tenant info
SELECT p.patient_id, t.name as tenant_name FROM patients p 
JOIN tenants t ON p.tenant_id = t.id 
WHERE p.patient_id = 'NSG001';