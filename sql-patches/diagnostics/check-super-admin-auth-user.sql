-- =============================================================================
-- CHECK AND CREATE AUTH USER FOR EXISTING SUPER ADMIN PROFILE
-- =============================================================================
-- This script checks if admin@haccare.com has a matching auth user
-- =============================================================================

-- 1. Check the existing super admin profile
SELECT 
    'EXISTING SUPER ADMIN PROFILE' as check_type,
    id,
    email,
    role::text,
    is_active,
    created_at
FROM public.user_profiles 
WHERE email = 'admin@haccare.com';

-- 2. Check if there's a matching auth user
SELECT 
    'AUTH USER CHECK' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@haccare.com') 
        THEN 'AUTH USER EXISTS ✓'
        ELSE 'AUTH USER MISSING ❌'
    END as auth_status;

-- 3. Show auth user details if exists
SELECT 
    'AUTH USER DETAILS' as check_type,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    created_at
FROM auth.users 
WHERE email = 'admin@haccare.com';

-- 4. Check alignment between profile and auth user
SELECT 
    'PROFILE-AUTH ALIGNMENT' as check_type,
    up.email as profile_email,
    au.email as auth_email,
    CASE 
        WHEN up.id = au.id THEN 'IDs MATCH ✓'
        ELSE 'ID MISMATCH ❌'
    END as id_alignment,
    up.id as profile_id,
    au.id as auth_id
FROM public.user_profiles up
FULL OUTER JOIN auth.users au ON up.email = au.email
WHERE up.email = 'admin@haccare.com' OR au.email = 'admin@haccare.com';

-- =============================================================================
-- INSTRUCTIONS FOR CREATING AUTH USER
-- =============================================================================

SELECT 'NEXT STEPS' as instructions;
SELECT 'If AUTH USER MISSING, follow these steps:' as step_1;
SELECT '1. Go to Supabase Dashboard → Authentication → Users' as step_2;
SELECT '2. Click "Add User" button' as step_3;
SELECT '3. Enter email: admin@haccare.com' as step_4;
SELECT '4. Enter password: SuperAdmin123!' as step_5;
SELECT '5. Check "Email Confirm" box' as step_6;
SELECT '6. Check "Auto Confirm User" box' as step_7;
SELECT '7. Click "Create User"' as step_8;
SELECT '8. Sign in to your React app with these credentials' as step_9;
