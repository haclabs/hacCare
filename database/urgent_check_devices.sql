-- =====================================================
-- URGENT: Check why devices restore but wounds do
-- =====================================================

-- 1. After launching simulation, check BOTH tables in the active simulation tenant
-- Replace with your actual active simulation tenant_id: 4facf82f-018c-402d-9e1e-9c7982cc31ac

-- Check avatar_locations (parent)
SELECT 
  'avatar_locations' as table_name,
  COUNT(*) as count,
  string_agg(id::text, ', ') as ids
FROM avatar_locations
WHERE tenant_id = '4facf82f-018c-402d-9e1e-9c7982cc31ac';

-- Check wounds (child - WORKING)
SELECT 
  'wounds' as table_name,
  COUNT(*) as count,
  string_agg(id::text, ', ') as ids
FROM wounds
WHERE tenant_id = '4facf82f-018c-402d-9e1e-9c7982cc31ac';

-- Check devices (child - NOT WORKING)
SELECT 
  'devices' as table_name,
  COUNT(*) as count,
  string_agg(id::text, ', ') as ids
FROM devices
WHERE tenant_id = '4facf82f-018c-402d-9e1e-9c7982cc31ac';

-- 2. Check if devices exist without tenant_id filter (RLS bypass check)
SET LOCAL ROLE postgres;
SELECT 
  'devices (no tenant filter)' as table_name,
  COUNT(*) as count
FROM devices
WHERE patient_id IN (
  SELECT id FROM patients WHERE tenant_id = '4facf82f-018c-402d-9e1e-9c7982cc31ac'
);

-- 3. Compare table structures side by side
SELECT 
  c1.column_name,
  c1.data_type as devices_type,
  c2.data_type as wounds_type,
  CASE 
    WHEN c1.data_type = c2.data_type THEN '✅ Match'
    ELSE '❌ Different'
  END as comparison
FROM information_schema.columns c1
FULL OUTER JOIN information_schema.columns c2 
  ON c1.column_name = c2.column_name 
  AND c2.table_name = 'wounds'
WHERE c1.table_name = 'devices'
AND c1.table_schema = 'public'
AND c2.table_schema = 'public'
ORDER BY c1.ordinal_position;

-- 4. Check if there are any triggers on devices that might be failing
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'devices'::regclass;

-- 5. Look for the snapshot save function
SELECT 
  proname,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname LIKE '%snapshot%'
AND pronamespace = 'public'::regnamespace;
