-- Compare devices vs wounds table structure to find the difference

-- 1. Check devices table constraints
SELECT 
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'devices'
ORDER BY con.contype, con.conname;

-- 2. Check wounds table constraints
SELECT 
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'wounds'
ORDER BY con.contype, con.conname;

-- 3. Check if devices has any NOT NULL columns that wounds doesn't
SELECT 
  'devices' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'devices'
AND is_nullable = 'NO'
AND column_default IS NULL
ORDER BY ordinal_position;

-- 4. Check for triggers on devices that might block inserts
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'devices'::regclass
AND tgname NOT LIKE 'RI_%'; -- Exclude foreign key triggers

-- 5. Try a manual INSERT to see the exact error
-- First get a sample device from the snapshot
DO $$
DECLARE
  v_sample_device jsonb;
  v_test_tenant uuid := '4facf82f-018c-402d-9e1e-9c7982cc31ac';
  v_patient_id uuid;
  v_location_id uuid;
BEGIN
  -- Get patient from active sim
  SELECT id INTO v_patient_id FROM patients WHERE tenant_id = v_test_tenant LIMIT 1;
  
  -- Get location from active sim
  SELECT id INTO v_location_id FROM avatar_locations WHERE tenant_id = v_test_tenant LIMIT 1;
  
  RAISE NOTICE 'Patient ID: %', v_patient_id;
  RAISE NOTICE 'Location ID: %', v_location_id;
  
  -- Try to insert a device manually
  BEGIN
    INSERT INTO devices (
      tenant_id,
      patient_id,
      location_id,
      type,
      orientation,
      securement_method
    ) VALUES (
      v_test_tenant,
      v_patient_id,
      v_location_id,
      'iv-peripheral',
      ARRAY['medial']::text[],
      ARRAY['Tape', 'StatLock']::text[]
    );
    RAISE NOTICE '✅ Manual INSERT succeeded!';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Manual INSERT failed: %', SQLERRM;
    RAISE WARNING 'Error detail: %', SQLSTATE;
  END;
END $$;
