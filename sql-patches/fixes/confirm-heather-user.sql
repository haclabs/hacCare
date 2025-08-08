-- Manually confirm the existing user so they can login
-- Replace 'heather@haccare.app' with the actual email if different

UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'heather@haccare.app'
  AND email_confirmed_at IS NULL;

-- Verify the user is now confirmed
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as is_confirmed,
  created_at
FROM auth.users 
WHERE email = 'heather@haccare.app';
