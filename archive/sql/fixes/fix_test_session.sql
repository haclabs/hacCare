-- Fix the test session with NULL user_id
-- Update it to use the correct Heather Gordon email

-- First, let's see what email Heather Gordon actually has
SELECT id, email, first_name, last_name 
FROM user_profiles 
WHERE (first_name ILIKE '%heather%' OR last_name ILIKE '%gordon%')
   OR email ILIKE '%heather%'
   OR email ILIKE '%gordon%';

-- Update the session with NULL user_id to use Heather's correct user_id
UPDATE user_sessions 
SET user_id = (
  SELECT id 
  FROM user_profiles 
  WHERE email = 'heather.gordon@lethpolytech.ca'
  LIMIT 1
)
WHERE user_id IS NULL 
  AND ip_address = '192.168.1.100';

-- Verify the fix
SELECT 
  us.id,
  up.email,
  up.first_name,
  up.last_name,
  us.ip_address,
  us.status,
  t.name as tenant_name
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
LEFT JOIN tenants t ON us.tenant_id = t.id
ORDER BY us.login_time DESC;