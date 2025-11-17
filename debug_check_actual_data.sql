-- CHECK: What's actually in medication_administrations right now?

-- 1. Get your active simulation details
SELECT 
  sa.id as sim_id,
  sa.tenant_id,
  sa.status,
  sa.template_name,
  (SELECT COUNT(*) FROM medication_administrations ma WHERE ma.tenant_id = sa.tenant_id) as med_admin_count
FROM simulation_active sa
WHERE sa.status = 'running'
ORDER BY sa.created_at DESC
LIMIT 1;

-- 2. Check if there are ANY medication_administrations records
SELECT COUNT(*) as total_records FROM medication_administrations;

-- 3. List ALL medication_administrations with their tenant_id
SELECT 
  id,
  tenant_id,
  medication_name,
  student_name,
  timestamp,
  barcode_scanned,
  created_at
FROM medication_administrations
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check patients and their tenant_id
SELECT 
  p.id as patient_id,
  p.tenant_id,
  p.first_name,
  p.last_name,
  (SELECT COUNT(*) FROM medication_administrations ma WHERE ma.patient_id = p.id) as med_count_for_patient
FROM patients p
WHERE p.tenant_id IN (SELECT tenant_id FROM simulation_active WHERE status = 'running')
ORDER BY p.created_at DESC;
