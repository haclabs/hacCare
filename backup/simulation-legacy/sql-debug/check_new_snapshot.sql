-- Check the NEW snapshot structure for vitals
WITH current_sim AS (
  SELECT 
    sa.tenant_id,
    st.snapshot_data,
    st.updated_at as snapshot_updated
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  ORDER BY sa.created_at DESC
  LIMIT 1
)
SELECT 
  'NEW SNAPSHOT ANALYSIS' as info,
  snapshot_updated,
  -- Check all keys
  (SELECT array_agg(key) FROM jsonb_object_keys(snapshot_data) as key) as all_keys,
  -- Check vitals specifically
  (snapshot_data ? 'vitals') as has_vitals_key,
  (snapshot_data ? 'patient_vitals') as has_patient_vitals_key,
  -- Count vitals in both possible locations
  CASE 
    WHEN snapshot_data ? 'vitals' THEN jsonb_array_length(snapshot_data->'vitals')
    ELSE 0 
  END as vitals_count,
  CASE 
    WHEN snapshot_data ? 'patient_vitals' THEN jsonb_array_length(snapshot_data->'patient_vitals')
    ELSE 0 
  END as patient_vitals_count,
  -- Show sample if exists
  CASE 
    WHEN snapshot_data ? 'patient_vitals' AND jsonb_array_length(snapshot_data->'patient_vitals') > 0 
    THEN snapshot_data->'patient_vitals'->0
    WHEN snapshot_data ? 'vitals' AND jsonb_array_length(snapshot_data->'vitals') > 0 
    THEN snapshot_data->'vitals'->0
    ELSE NULL 
  END as sample_vital_record
FROM current_sim;