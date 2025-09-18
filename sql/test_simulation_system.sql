-- Test query to verify simulation patient templates are working
-- Run this in Supabase SQL editor to test the system

-- 1. Check if we have patient templates
SELECT 
  id, 
  scenario_template_id,
  template_name,
  patient_name,
  age,
  room_number,
  diagnosis
FROM simulation_patient_templates
LIMIT 5;

-- 2. Check if instantiation function exists
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%patient%' 
  AND routine_schema = 'public';

-- 3. Test data: Check if we have any active simulations
SELECT 
  id,
  session_name,
  tenant_id,
  scenario_template_id,
  status,
  start_time,
  instructor_id
FROM active_simulations
ORDER BY start_time DESC
LIMIT 3;

-- 4. Check simulation users
SELECT 
  su.id,
  su.simulation_tenant_id,
  su.username,
  su.email,
  su.role,
  su.created_at
FROM simulation_users su
JOIN tenants t ON su.simulation_tenant_id = t.id
WHERE t.tenant_type = 'simulation'
ORDER BY su.created_at DESC
LIMIT 5;

-- 4a. Check simulation tenant relationships
SELECT 
  sim.id as simulation_id,
  sim.session_name,
  sim.status as sim_status,
  t.id as tenant_id,
  t.name as tenant_name,
  t.subdomain,
  t.tenant_type
FROM active_simulations sim
LEFT JOIN tenants t ON t.simulation_id = sim.id
WHERE t.tenant_type = 'simulation' OR t.tenant_type IS NULL
ORDER BY sim.start_time DESC
LIMIT 3;

-- 5. Test patient instantiation (if we have templates)
-- This will show if patients were created from templates
SELECT 
  sp.id,
  sp.active_simulation_id,
  sp.patient_name,
  sp.age,  -- Use direct age column since it exists
  sp.room_number,
  sp.diagnosis,
  sp.condition,
  sp.created_at
FROM simulation_patients sp
JOIN active_simulations sim ON sp.active_simulation_id = sim.id
WHERE sp.is_template = false  -- Only show instantiated patients, not templates
ORDER BY sp.created_at DESC
LIMIT 5;

-- 6. Check simulation vitals (if patients are instantiated)
SELECT 
  sv.id,
  sv.simulation_patient_id,
  sv.temperature,
  sv.blood_pressure_systolic,
  sv.blood_pressure_diastolic,
  sv.heart_rate,
  sv.respiratory_rate,
  sv.oxygen_saturation,
  sv.recorded_at,
  sv.is_baseline
FROM simulation_patient_vitals sv
JOIN simulation_patients sp ON sv.simulation_patient_id = sp.id
ORDER BY sv.recorded_at DESC
LIMIT 5;

-- 7. Check simulation medications (if patients are instantiated)
SELECT 
  sm.id,
  sm.simulation_patient_id,
  sm.name as medication_name,
  sm.category,
  sm.dosage,
  sm.route,
  sm.frequency,
  sm.admin_time,
  sm.status,
  sm.prescribed_by,
  sm.start_date
FROM simulation_patient_medications sm
JOIN simulation_patients sp ON sm.simulation_patient_id = sp.id
WHERE sm.is_template = false  -- Only show instantiated medications, not templates
ORDER BY sm.created_at DESC
LIMIT 5;