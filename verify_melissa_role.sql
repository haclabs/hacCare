-- Verify Melissa's role was updated correctly
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  primary_program,
  updated_at
FROM user_profiles
WHERE email = 'melissa.schalk@lethpolytech.ca';

-- Check her program assignments
SELECT 
  up.user_id,
  p.code as program_code,
  p.name as program_name,
  up.assigned_at
FROM user_programs up
JOIN programs p ON p.id = up.program_id
JOIN user_profiles u ON u.id = up.user_id
WHERE u.email = 'melissa.schalk@lethpolytech.ca';
