-- Check RLS policies on user_profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles' AND schemaname = 'public';

-- Check what the current user's role allows
SELECT 
    id,
    email,
    role as current_role
FROM user_profiles
WHERE email = (SELECT auth.email());
