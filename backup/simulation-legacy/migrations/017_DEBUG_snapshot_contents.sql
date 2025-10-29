-- ===========================================================================
-- DEBUG: Check what's in the template snapshot
-- ===========================================================================

DO $$
DECLARE
  v_simulation_id uuid := '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid;
  v_template_id uuid;
  v_snapshot jsonb;
BEGIN
  -- Get template ID
  SELECT template_id INTO v_template_id
  FROM simulation_active
  WHERE id = v_simulation_id;
  
  RAISE NOTICE 'Template ID: %', v_template_id;
  
  -- Get snapshot
  SELECT snapshot_data INTO v_snapshot
  FROM simulation_templates
  WHERE id = v_template_id;
  
  -- Check what keys exist in snapshot
  RAISE NOTICE 'Snapshot keys: %', jsonb_object_keys(v_snapshot);
  
  -- Check if patient_medications exists
  RAISE NOTICE 'Has patient_medications? %', (v_snapshot ? 'patient_medications');
  
  IF v_snapshot ? 'patient_medications' THEN
    RAISE NOTICE 'Medications count in snapshot: %', jsonb_array_length(v_snapshot->'patient_medications');
    RAISE NOTICE 'First medication sample: %', v_snapshot->'patient_medications'->0;
  END IF;
  
  -- Check if patient_vitals exists
  RAISE NOTICE 'Has patient_vitals? %', (v_snapshot ? 'patient_vitals');
  
  IF v_snapshot ? 'patient_vitals' THEN
    RAISE NOTICE 'Vitals count in snapshot: %', jsonb_array_length(v_snapshot->'patient_vitals');
    RAISE NOTICE 'First vital sample: %', v_snapshot->'patient_vitals'->0;
  END IF;
  
END $$;

-- Also check what patient_id values exist in the snapshot vs simulation
SELECT 
  'Snapshot patient_ids' as source,
  jsonb_array_elements(
    (SELECT snapshot_data->'patient_medications' FROM simulation_templates 
     WHERE id = (SELECT template_id FROM simulation_active WHERE id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'))
  )->>'patient_id' as patient_id
LIMIT 5;

-- Check actual patient_ids in the simulation
SELECT 
  'Simulation patient_ids' as source,
  patient_id
FROM patients 
WHERE tenant_id = (SELECT tenant_id FROM simulation_active WHERE id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b')
LIMIT 10;
