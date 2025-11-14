-- Check timer values for the "Testtting" simulation
SELECT 
  name,
  status,
  starts_at,
  ends_at,
  duration_minutes,
  EXTRACT(EPOCH FROM (ends_at - NOW())) / 60 as minutes_remaining,
  EXTRACT(EPOCH FROM (NOW() - starts_at)) / 60 as minutes_since_start,
  created_at
FROM simulation_active
WHERE name = 'Testtting'
ORDER BY created_at DESC
LIMIT 1;
