-- Migrate existing patients to a default tenant
-- This preserves existing data while enabling multi-tenancy

-- Step 1: Create a default tenant (if not exists)
INSERT INTO tenants (name, description, status, settings)
VALUES (
  'Default Healthcare Facility',
  'Default tenant for existing patient data migration',
  'active',
  '{}'
)
ON CONFLICT DO NOTHING;

-- Step 2: Get the default tenant ID for use in updates
-- You'll need to replace 'YOUR_DEFAULT_TENANT_ID' with the actual UUID from step 1

-- Step 3: Update all patients without tenant_id to use default tenant
-- First, let's see how many patients need migration
SELECT 
  COUNT(*) as total_patients,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as patients_without_tenant,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as patients_with_tenant
FROM patients;

-- Update patients (replace YOUR_DEFAULT_TENANT_ID with actual tenant ID)
-- UPDATE patients 
-- SET tenant_id = 'YOUR_DEFAULT_TENANT_ID' 
-- WHERE tenant_id IS NULL;

-- Step 4: Update related tables
-- UPDATE patient_vitals 
-- SET tenant_id = 'YOUR_DEFAULT_TENANT_ID' 
-- WHERE tenant_id IS NULL;

-- UPDATE patient_notes 
-- SET tenant_id = 'YOUR_DEFAULT_TENANT_ID' 
-- WHERE tenant_id IS NULL;

-- UPDATE patient_medications 
-- SET tenant_id = 'YOUR_DEFAULT_TENANT_ID' 
-- WHERE tenant_id IS NULL;

-- UPDATE medication_administrations 
-- SET tenant_id = 'YOUR_DEFAULT_TENANT_ID' 
-- WHERE tenant_id IS NULL;

-- UPDATE patient_images 
-- SET tenant_id = 'YOUR_DEFAULT_TENANT_ID' 
-- WHERE tenant_id IS NULL;

-- Step 5: Verify migration
SELECT 
  'patients' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant
FROM patients
UNION ALL
SELECT 
  'patient_vitals' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant
FROM patient_vitals
UNION ALL
SELECT 
  'patient_notes' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as without_tenant,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as with_tenant
FROM patient_notes;
