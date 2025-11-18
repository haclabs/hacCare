-- Check what patients exist in the template tenant
-- This will show us which patient IDs the snapshot function is finding

-- Your template details:
-- Template ID: 3389f977-fe42-4bb1-8c8d-ffe8eed16eed
-- Tenant ID: 46b2a9a6-6cff-4343-bbc1-9e025becd415

-- 1. List all patients in the template tenant
SELECT 
  id,
  name,
  medical_record_number,
  created_at,
  updated_at
FROM patients
WHERE tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415'
ORDER BY created_at DESC;

-- 2. Check lab_panels that would be captured by snapshot
-- This simulates what save_template_snapshot_v2 does
SELECT 
  lp.id,
  lp.patient_id,
  lp.panel_time,
  p.name as patient_name,
  COUNT(lr.id) as result_count
FROM lab_panels lp
JOIN patients p ON p.id = lp.patient_id
LEFT JOIN lab_results lr ON lr.panel_id = lp.id
WHERE p.tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415'
GROUP BY lp.id, lp.patient_id, lp.panel_time, p.name
ORDER BY lp.panel_time DESC;

-- 3. Check for orphaned lab_panels (patient doesn't exist)
SELECT 
  lp.id,
  lp.patient_id,
  lp.panel_time,
  CASE 
    WHEN p.id IS NULL THEN '❌ ORPHANED - Patient deleted'
    ELSE '✅ Valid - Patient exists'
  END as status
FROM lab_panels lp
LEFT JOIN patients p ON p.id = lp.patient_id
WHERE lp.patient_id IN (
  -- Patient IDs from your snapshot
  'cc88ad01-9179-47d7-b787-d7800f293a36',
  '3f7681de-e9be-4ac2-bc1b-8c40cdfc0d57',
  '77c835bb-ccab-478d-afef-c0597011eef6',
  '4b67107e-fb5b-4613-8105-fcad31aacac4',
  '43a511c2-e0a4-415c-8bab-0a35a70e1766',
  '007a3673-b694-4732-9354-09b0ad723027',
  'f7807516-67dd-480a-b745-dc7639f3c351'
)
ORDER BY status, lp.panel_time;
