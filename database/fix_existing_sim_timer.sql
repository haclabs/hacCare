-- Fix existing simulation with NULL ends_at
UPDATE simulation_active
SET ends_at = starts_at + (duration_minutes || ' minutes')::interval
WHERE name = 'Testtting'
AND ends_at IS NULL;

-- Verify fix
SELECT 
  name,
  starts_at,
  ends_at,
  duration_minutes,
  EXTRACT(EPOCH FROM (ends_at - NOW())) / 60 as minutes_remaining
FROM simulation_active
WHERE name = 'Testtting';
