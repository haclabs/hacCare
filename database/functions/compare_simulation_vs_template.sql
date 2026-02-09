-- ============================================================================
-- COMPARE ACTIVE SIMULATION VS CURRENT TEMPLATE
-- ============================================================================
-- Compares the active simulation's current data with the template's current snapshot
-- Used for showing accurate sync previews
-- ============================================================================

CREATE OR REPLACE FUNCTION compare_simulation_vs_template(
  p_simulation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sim_tenant_id UUID;
  v_template_id UUID;
  v_template_snapshot JSONB;
  v_sim_patient_count INT;
  v_sim_medication_count INT;
  v_sim_order_count INT;
  v_sim_wound_count INT;
  v_sim_device_count INT;
  v_template_patient_count INT;
  v_template_medication_count INT;
  v_template_order_count INT;
  v_template_wound_count INT;
  v_template_device_count INT;
  v_template_version INT;
  v_synced_version INT;
BEGIN
  -- Get simulation tenant and template
  SELECT sa.tenant_id, sa.template_id, sa.template_snapshot_version_synced,
         st.snapshot_data, st.snapshot_version
  INTO v_sim_tenant_id, v_template_id, v_synced_version,
       v_template_snapshot, v_template_version
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  -- Count CURRENT data in active simulation tenant
  SELECT 
    COUNT(DISTINCT p.id),
    COUNT(DISTINCT pm.id),
    COUNT(DISTINCT ord.id),
    COUNT(DISTINCT w.id),
    COUNT(DISTINCT d.id)
  INTO 
    v_sim_patient_count,
    v_sim_medication_count,
    v_sim_order_count,
    v_sim_wound_count,
    v_sim_device_count
  FROM patients p
  LEFT JOIN patient_medications pm ON pm.tenant_id = v_sim_tenant_id
  LEFT JOIN doctors_orders ord ON ord.tenant_id = v_sim_tenant_id
  LEFT JOIN wounds w ON w.tenant_id = v_sim_tenant_id
  LEFT JOIN devices d ON d.tenant_id = v_sim_tenant_id
  WHERE p.tenant_id = v_sim_tenant_id;
  
  -- Count data in template snapshot
  v_template_patient_count := jsonb_array_length(COALESCE(v_template_snapshot->'patients', '[]'::jsonb));
  v_template_medication_count := jsonb_array_length(COALESCE(v_template_snapshot->'patient_medications', '[]'::jsonb));
  v_template_order_count := jsonb_array_length(COALESCE(v_template_snapshot->'doctors_orders', '[]'::jsonb));
  v_template_wound_count := jsonb_array_length(COALESCE(v_template_snapshot->'wounds', '[]'::jsonb));
  v_template_device_count := jsonb_array_length(COALESCE(v_template_snapshot->'devices', '[]'::jsonb));
  
  RAISE NOTICE 'Simulation: % patients, % medications | Template: % patients, % medications',
    v_sim_patient_count, v_sim_medication_count, v_template_patient_count, v_template_medication_count;
  
  RETURN jsonb_build_object(
    'simulation_id', p_simulation_id,
    'template_id', v_template_id,
    'version_synced', v_synced_version,
    'version_current', v_template_version,
    'patient_count_old', v_sim_patient_count,
    'patient_count_new', v_template_patient_count,
    'medication_count_old', v_sim_medication_count,
    'medication_count_new', v_template_medication_count,
    'order_count_old', v_sim_order_count,
    'order_count_new', v_template_order_count,
    'wound_count_old', v_sim_wound_count,
    'wound_count_new', v_template_wound_count,
    'device_count_old', v_sim_device_count,
    'device_count_new', v_template_device_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION compare_simulation_vs_template TO authenticated;

COMMENT ON FUNCTION compare_simulation_vs_template IS 'Compares active simulation current data with template current snapshot for accurate sync preview';
