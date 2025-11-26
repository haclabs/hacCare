-- Quick diagnostic to check if avatar_id values are set
SELECT 
  id,
  patient_id,
  first_name,
  last_name,
  avatar_id,
  CASE 
    WHEN avatar_id IS NULL THEN '❌ No Avatar'
    ELSE '✅ Has Avatar'
  END as status
FROM patients
ORDER BY created_at DESC
LIMIT 20;

-- Check avatar distribution
SELECT 
  avatar_id,
  COUNT(*) as patient_count
FROM patients
GROUP BY avatar_id
ORDER BY avatar_id;
