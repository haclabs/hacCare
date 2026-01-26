-- Check if the user's role was actually updated in the database
-- User ID from your console log: 4ca6eb03-119d-41d8-be76-7bf95a781268

SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  primary_program,
  is_active,
  simulation_only,
  updated_at
FROM user_profiles
WHERE id = '4ca6eb03-119d-41d8-be76-7bf95a781268';

-- Check program assignments
SELECT 
  up.id,
  up.user_id,
  p.code as program_code,
  p.name as program_name,
  up.assigned_at
FROM user_programs up
JOIN programs p ON p.id = up.program_id
WHERE up.user_id = '4ca6eb03-119d-41d8-be76-7bf95a781268';
