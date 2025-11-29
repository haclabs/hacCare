-- Set simulation_only flag for clsnurse account
-- This makes the user auto-route to simulation portal on login

UPDATE user_profiles
SET simulation_only = true
WHERE email = 'clsnurse@lethpolytech.ca';

-- Verify the change
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  simulation_only,
  is_active
FROM user_profiles
WHERE email = 'clsnurse@lethpolytech.ca';
