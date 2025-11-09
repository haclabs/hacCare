-- Test JSONB variable access
DO $$
DECLARE
  test_snapshot jsonb := '{"patient_vitals": [{"id": "123", "heart_rate": 72}], "doctors_orders": [{"id": "456"}]}'::jsonb;
  table_name text := 'patient_vitals';
BEGIN
  RAISE NOTICE 'Testing JSONB access with variable...';
  RAISE NOTICE 'Table name: %', table_name;
  RAISE NOTICE 'Direct access test_snapshot->''patient_vitals'': %', test_snapshot->'patient_vitals';
  RAISE NOTICE 'Variable access test_snapshot->table_name: %', test_snapshot->table_name;
  RAISE NOTICE 'Key exists (? operator): %', test_snapshot ? table_name;
  RAISE NOTICE 'Array length: %', jsonb_array_length(test_snapshot->table_name);
END $$;
