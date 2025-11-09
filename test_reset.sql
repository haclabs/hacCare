-- Manual test of reset functionality
-- This will restore the snapshot to the active simulation tenant

-- Get the active simulation details
SELECT 
  sa.id as simulation_id,
  sa.tenant_id,
  sa.template_id,
  st.name as template_name,
  st.id as actual_template_id
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
ORDER BY sa.created_at DESC
LIMIT 1;

-- Check what patients are in the simulation tenant
SELECT 
  patient_id as mrn,
  first_name,
  last_name,
  tenant_id
FROM patients
WHERE tenant_id = (SELECT tenant_id FROM simulation_active ORDER BY created_at DESC LIMIT 1);

-- Check what patients are in the template snapshot
SELECT 
  value->>'patient_id' as template_mrn,
  value->>'first_name' as first_name,
  value->>'last_name' as last_name
FROM simulation_templates st,
     jsonb_array_elements(st.snapshot_data->'patients') as value
WHERE st.id = (SELECT template_id FROM simulation_active ORDER BY created_at DESC LIMIT 1);

-- Run the restore function
SELECT restore_snapshot_to_tenant_v2(
  (SELECT tenant_id FROM simulation_active ORDER BY created_at DESC LIMIT 1)::uuid,
  (SELECT snapshot_data FROM simulation_templates 
   WHERE id = (SELECT template_id FROM simulation_active ORDER BY created_at DESC LIMIT 1))
);

-- Check how many vitals the patient has now
SELECT 
  p.patient_id as mrn,
  p.first_name,
  p.last_name,
  COUNT(pv.id) as vital_count
FROM patients p
LEFT JOIN patient_vitals pv ON pv.patient_id = p.id
WHERE p.tenant_id = (SELECT tenant_id FROM simulation_active ORDER BY created_at DESC LIMIT 1)
GROUP BY p.id, p.patient_id, p.first_name, p.last_name;

-- Show the actual vitals
SELECT 
  p.patient_id as mrn,
  pv.recorded_at,
  pv.heart_rate,
  pv.blood_pressure_systolic,
  pv.blood_pressure_diastolic,
  pv.temperature,
  pv.respiratory_rate,
  pv.oxygen_saturation
FROM patients p
JOIN patient_vitals pv ON pv.patient_id = p.id
WHERE p.tenant_id = (SELECT tenant_id FROM simulation_active ORDER BY created_at DESC LIMIT 1)
ORDER BY pv.recorded_at DESC;

-- Check doctor's orders too
SELECT 
  p.patient_id as mrn,
  d.order_type,
  d.order_date,
  d.order_text,
  d.doctor_name
FROM patients p
JOIN doctors_orders d ON d.patient_id = p.id
WHERE p.tenant_id = (SELECT tenant_id FROM simulation_active ORDER BY created_at DESC LIMIT 1)
ORDER BY d.created_at DESC;
