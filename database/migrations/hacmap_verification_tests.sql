-- ============================================================================
-- hacMap Database Verification Tests
-- ============================================================================
-- Run these queries after deploying hacmap_tables.sql to verify installation
-- ============================================================================

-- ============================================================================
-- TEST 1: Verify Tables Exist
-- ============================================================================
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('avatar_locations', 'devices', 'wounds') THEN '✅ Found'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('avatar_locations', 'devices', 'wounds')
ORDER BY table_name;

-- Expected: 3 rows with status '✅ Found'

-- ============================================================================
-- TEST 2: Verify RLS is Enabled
-- ============================================================================
SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('avatar_locations', 'devices', 'wounds')
ORDER BY tablename;

-- Expected: 3 rows with rowsecurity = true

-- ============================================================================
-- TEST 3: Verify Policies Exist
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd as operation,
  '✅ Policy exists' as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('avatar_locations', 'devices', 'wounds')
ORDER BY tablename, policyname;

-- Expected: 12 policies total (4 per table: SELECT, INSERT, UPDATE, DELETE)

-- ============================================================================
-- TEST 4: Verify Enums Exist
-- ============================================================================
SELECT 
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values,
  '✅ Enum exists' as status
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('device_type_enum', 'reservoir_type_enum', 'orientation_enum', 'wound_type_enum')
GROUP BY t.typname
ORDER BY t.typname;

-- Expected: 4 enums with their respective values

-- ============================================================================
-- TEST 5: Verify Indexes Exist
-- ============================================================================
SELECT 
  tablename,
  indexname,
  '✅ Index exists' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('avatar_locations', 'devices', 'wounds')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: 8 indexes total

-- ============================================================================
-- TEST 6: Verify Triggers Exist
-- ============================================================================
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  '✅ Trigger exists' as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('devices', 'wounds')
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- Expected: 2 triggers (one for devices, one for wounds)

-- ============================================================================
-- TEST 7: Verify Column Structure
-- ============================================================================
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('avatar_locations', 'devices', 'wounds')
ORDER BY table_name, ordinal_position;

-- Review output to ensure all expected columns are present

-- ============================================================================
-- TEST 8: Test Insert Permissions (requires valid UUIDs)
-- ============================================================================
/*
-- IMPORTANT: Replace these UUIDs with real values from your database
DO $$
DECLARE
  test_tenant_id uuid := 'YOUR-TENANT-UUID'::uuid;
  test_patient_id uuid := 'YOUR-PATIENT-UUID'::uuid;
  test_user_id uuid := 'YOUR-USER-UUID'::uuid;
  test_location_id uuid;
BEGIN
  -- Try to insert a test location
  INSERT INTO avatar_locations (tenant_id, patient_id, region_key, x_percent, y_percent, created_by)
  VALUES (test_tenant_id, test_patient_id, 'chest', 50, 30, test_user_id)
  RETURNING id INTO test_location_id;
  
  RAISE NOTICE '✅ Successfully inserted avatar_location: %', test_location_id;
  
  -- Try to insert a test device
  INSERT INTO devices (tenant_id, patient_id, location_id, type, created_by)
  VALUES (test_tenant_id, test_patient_id, test_location_id, 'closed-suction-drain', test_user_id);
  
  RAISE NOTICE '✅ Successfully inserted device';
  
  -- Try to insert a test wound
  INSERT INTO wounds (tenant_id, patient_id, location_id, wound_type, created_by)
  VALUES (test_tenant_id, test_patient_id, test_location_id, 'incision', test_user_id);
  
  RAISE NOTICE '✅ Successfully inserted wound';
  
  -- Cleanup test data
  DELETE FROM wounds WHERE location_id = test_location_id;
  DELETE FROM devices WHERE location_id = test_location_id;
  DELETE FROM avatar_locations WHERE id = test_location_id;
  
  RAISE NOTICE '✅ Cleanup completed - all tests passed!';
END $$;
*/

-- ============================================================================
-- SUMMARY CHECK
-- ============================================================================
SELECT 
  'Tables' as component,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 3 THEN '✅ Pass' ELSE '❌ Fail' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('avatar_locations', 'devices', 'wounds')

UNION ALL

SELECT 
  'RLS Policies' as component,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 12 THEN '✅ Pass' ELSE '❌ Fail' END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('avatar_locations', 'devices', 'wounds')

UNION ALL

SELECT 
  'Enums' as component,
  COUNT(DISTINCT typname) as count,
  CASE WHEN COUNT(DISTINCT typname) = 4 THEN '✅ Pass' ELSE '❌ Fail' END as status
FROM pg_type 
WHERE typname IN ('device_type_enum', 'reservoir_type_enum', 'orientation_enum', 'wound_type_enum')

UNION ALL

SELECT 
  'Indexes' as component,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 8 THEN '✅ Pass' ELSE '❌ Fail' END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('avatar_locations', 'devices', 'wounds')
  AND indexname LIKE 'idx_%'

UNION ALL

SELECT 
  'Triggers' as component,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 2 THEN '✅ Pass' ELSE '❌ Fail' END as status
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('devices', 'wounds')
  AND trigger_name LIKE '%updated_at%';

-- If all show '✅ Pass', your hacMap database is ready!
