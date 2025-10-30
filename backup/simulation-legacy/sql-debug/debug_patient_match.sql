-- Check if patient IDs in snapshot match current patient IDs

WITH current_sim AS (
  SELECT 
    sa.tenant_id as current_tenant_id,
    st.snapshot_data
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  ORDER BY sa.created_at DESC
  LIMIT 1
),
snapshot_patient_ids AS (
  SELECT DISTINCT
    (o->>'patient_id')::uuid as snapshot_patient_id
  FROM current_sim, jsonb_array_elements(snapshot_data->'doctors_orders') as o
),
current_patient_ids AS (
  SELECT 
    id as current_patient_id
  FROM patients 
  WHERE tenant_id = (SELECT current_tenant_id FROM current_sim)
)
SELECT 
  'PATIENT ID COMPARISON' as info,
  (SELECT array_agg(snapshot_patient_id) FROM snapshot_patient_ids) as snapshot_patient_ids,
  (SELECT array_agg(current_patient_id) FROM current_patient_ids) as current_patient_ids,
  -- Check overlap
  (SELECT COUNT(*) FROM snapshot_patient_ids s 
   JOIN current_patient_ids c ON s.snapshot_patient_id = c.current_patient_id) as matching_patients;

-- Also check tenant IDs
WITH current_sim AS (
  SELECT 
    sa.tenant_id as current_tenant_id,
    st.snapshot_data
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  ORDER BY sa.created_at DESC
  LIMIT 1
)
SELECT 
  'TENANT ID COMPARISON' as info,
  (SELECT current_tenant_id FROM current_sim) as current_tenant_id,
  (SELECT DISTINCT o->>'tenant_id' FROM current_sim, jsonb_array_elements(snapshot_data->'doctors_orders') as o LIMIT 1) as snapshot_tenant_id;