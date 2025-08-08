-- AUTHENTICATION FIX: Handle null auth.uid() issue
-- Run this if you're getting null user_id errors

-- Check current authentication status
SELECT 'AUTHENTICATION DIAGNOSTIC:' as section;

-- Check auth.uid()
SELECT 
  'auth.uid() value:' as check_type,
  COALESCE(auth.uid()::TEXT, 'NULL') as value,
  CASE 
    WHEN auth.uid() IS NULL THEN 'ERROR: Not authenticated - please log in'
    WHEN auth.uid() = '00000000-0000-0000-0000-000000000000'::UUID THEN 'ERROR: Invalid session - please log out and log back in'
    ELSE 'SUCCESS: Valid authentication'
  END as status;

-- Check auth.users table
SELECT 
  'auth.users check:' as check_type,
  COUNT(*) as user_count,
  'Total users in auth system' as description
FROM auth.users;

-- Check user_profiles table
SELECT 
  'user_profiles check:' as check_type,
  COUNT(*) as profile_count,
  'Total profiles in system' as description
FROM user_profiles;

-- If auth.uid() is valid, show user details
DO $$
DECLARE
  current_auth_uid UUID := auth.uid();
BEGIN
  IF current_auth_uid IS NOT NULL AND current_auth_uid != '00000000-0000-0000-0000-000000000000'::UUID THEN
    -- Show current user details
    RAISE NOTICE 'Current authenticated user: %', current_auth_uid;
    
    -- Check if profile exists
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = current_auth_uid) THEN
      RAISE NOTICE 'User profile exists in database';
    ELSE
      RAISE NOTICE 'WARNING: User authenticated but no profile exists';
    END IF;
  ELSE
    RAISE NOTICE 'AUTHENTICATION PROBLEM: auth.uid() is null or invalid';
    RAISE NOTICE 'SOLUTION: Log out completely and log back in';
  END IF;
END $$;

-- Show authentication troubleshooting steps
SELECT '🔧 AUTHENTICATION TROUBLESHOOTING:' as help_section;
SELECT 'If auth.uid() is null or invalid:' as step1;
SELECT '1. Log out of the application completely' as step2;
SELECT '2. Clear browser cache and cookies' as step3;
SELECT '3. Log back in with your credentials' as step4;
SELECT '4. Run this script again to verify auth.uid() works' as step5;

-- Manual user lookup (if you know your email)
SELECT '📧 MANUAL USER LOOKUP:' as manual_section;
SELECT 'If you know your email, find your user ID:' as instruction;

-- Uncomment and replace with your actual email to find your user ID
-- SELECT 
--   'Your user details:' as info,
--   id as user_id,
--   email,
--   email_confirmed_at,
--   created_at
-- FROM auth.users 
-- WHERE email = 'your-email@example.com';

SELECT 'Uncomment the query above and replace with your email to find your user ID' as note;
