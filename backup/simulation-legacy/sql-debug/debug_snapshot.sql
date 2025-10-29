-- Debug query to check simulation template snapshot
-- Replace 'your-simulation-id' with your actual simulation ID

WITH sim_info AS (
  SELECT 
    sa.id as simulation_id,
    sa.tenant_id,
    sa.template_id,
    st.snapshot_data,
    st.name as template_name
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  -- WHERE sa.id = 'your-simulation-id'::uuid
  ORDER BY sa.created_at DESC
  LIMIT 1
)
SELECT 
  simulation_id,
  tenant_id,
  template_id,
  template_name,
  -- Check what keys exist in snapshot
  (SELECT array_agg(key) FROM jsonb_object_keys(snapshot_data) as key) as snapshot_keys,
  -- Check if vitals exist and count
  (snapshot_data ? 'vitals') as has_vitals,
  CASE 
    WHEN snapshot_data ? 'vitals' THEN jsonb_array_length(snapshot_data->'vitals')
    ELSE 0 
  END as vitals_count,
  -- Check if doctors_orders exist and count
  (snapshot_data ? 'doctors_orders') as has_doctors_orders,
  CASE 
    WHEN snapshot_data ? 'doctors_orders' THEN jsonb_array_length(snapshot_data->'doctors_orders')
    ELSE 0 
  END as doctors_orders_count,
  -- Show sample data if exists
  CASE 
    WHEN snapshot_data ? 'vitals' AND jsonb_array_length(snapshot_data->'vitals') > 0 
    THEN snapshot_data->'vitals'->0
    ELSE NULL 
  END as sample_vital,
  CASE 
    WHEN snapshot_data ? 'doctors_orders' AND jsonb_array_length(snapshot_data->'doctors_orders') > 0 
    THEN snapshot_data->'doctors_orders'->0
    ELSE NULL 
  END as sample_order
FROM sim_info;

-- Also check current live data
WITH sim_info AS (
  SELECT 
    sa.id as simulation_id,
    sa.tenant_id,
    sa.template_id
  FROM simulation_active sa
  ORDER BY sa.created_at DESC
  LIMIT 1
)
SELECT 
  'LIVE DATA COUNTS' as info,
  (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = (SELECT tenant_id FROM sim_info LIMIT 1)) as current_vitals,
  (SELECT COUNT(*) FROM doctors_orders WHERE patient_id IN 
    (SELECT id FROM patients WHERE tenant_id = (SELECT tenant_id FROM sim_info LIMIT 1))) as current_orders,
  (SELECT COUNT(*) FROM patients WHERE tenant_id = (SELECT tenant_id FROM sim_info LIMIT 1)) as current_patients,
  (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = (SELECT tenant_id FROM sim_info LIMIT 1)) as current_medications;