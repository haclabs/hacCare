-- =============================================================================
-- SUPER ADMIN AUTHENTICATION DIAGNOSTIC
-- =============================================================================
-- Run this in Supabase SQL Editor to diagnose auth issues
-- =============================================================================

-- 1. Check if you have any users in the auth system
SELECT 
    'AUTH USERS CHECK' as diagnostic,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
    COUNT(CASE WHEN email LIKE '%admin%' THEN 1 END) as admin_emails,
    string_agg(DISTINCT SUBSTRING(email FROM '^[^@]+'), ', ') as user_prefixes
FROM auth.users;

-- 2. Check user_profiles table for super_admin role
SELECT 
    'USER PROFILES CHECK' as diagnostic,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admin_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_profiles,
    string_agg(DISTINCT role::text, ', ') as available_roles
FROM public.user_profiles;

-- 3. Check for auth/profile mismatches
SELECT 
    'AUTH PROFILE ALIGNMENT' as diagnostic,
    auth_count,
    profile_count,
    CASE 
        WHEN auth_count = profile_count THEN 'ALIGNED ✓'
        WHEN auth_count > profile_count THEN 'MISSING PROFILES ⚠️'
        WHEN auth_count < profile_count THEN 'EXTRA PROFILES ⚠️'
        ELSE 'UNKNOWN'
    END as alignment_status
FROM (
    SELECT 
        (SELECT COUNT(*) FROM auth.users) as auth_count,
        (SELECT COUNT(*) FROM public.user_profiles) as profile_count
) alignment;

-- 4. Check specific super admin setup
SELECT 
    'SUPER ADMIN DETAILS' as diagnostic,
    up.id,
    up.email,
    up.role,
    up.is_active,
    CASE 
        WHEN au.id IS NOT NULL THEN 'AUTH EXISTS ✓'
        ELSE 'NO AUTH RECORD ❌'
    END as auth_status,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'EMAIL CONFIRMED ✓'
        ELSE 'EMAIL NOT CONFIRMED ❌'
    END as email_status
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE up.role = 'super_admin'
ORDER BY up.created_at DESC;

-- 5. Check for RLS policy issues that might block profile access
SELECT 
    'USER PROFILES RLS POLICIES' as diagnostic,
    policyname,
    permissive,
    roles,
    cmd,
    LEFT(qual, 100) as policy_logic
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 6. Test current auth context (will show if you're authenticated)
SELECT 
    'CURRENT AUTH TEST' as diagnostic,
    CASE 
        WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED ❌'
        ELSE 'AUTHENTICATED AS: ' || auth.uid()::text || ' ✓'
    END as auth_status,
    CASE 
        WHEN current_user = 'anon' THEN 'ANONYMOUS ROLE'
        WHEN current_user = 'authenticated' THEN 'AUTHENTICATED ROLE'
        ELSE 'OTHER ROLE: ' || current_user
    END as db_role;

-- 7. Create a test super admin if none exists (UNCOMMENT TO RUN)
/*
-- Only run this if you need to create a super admin
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Generate a UUID for the test user
    test_user_id := gen_random_uuid();
    
    -- Insert into user_profiles (this should work if RLS allows)
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name, 
        role, 
        is_active, 
        created_at, 
        updated_at
    ) VALUES (
        test_user_id,
        'test.superadmin@example.com',
        'Test Super Admin',
        'super_admin',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET 
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RAISE NOTICE 'Test super admin created/updated with ID: %', test_user_id;
END $$;
*/
