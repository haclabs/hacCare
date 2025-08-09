-- =============================================================================
-- SIMPLIFIED SUPER ADMIN AUTHENTICATION DIAGNOSTIC
-- =============================================================================
-- Run this in Supabase SQL Editor - avoids type casting issues
-- =============================================================================

-- 1. Check if you have any users in the auth system
SELECT 
    'AUTH USERS CHECK' as diagnostic,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users
FROM auth.users;

-- 2. List actual user emails (first 5)
SELECT 
    'AUTH USER EMAILS' as diagnostic,
    email,
    email_confirmed_at IS NOT NULL as confirmed,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check user_profiles table
SELECT 
    'USER PROFILES CHECK' as diagnostic,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role::text = 'super_admin' THEN 1 END) as super_admin_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_profiles
FROM public.user_profiles;

-- 4. List actual roles
SELECT 
    'PROFILE ROLES' as diagnostic,
    role::text as role_name,
    COUNT(*) as count
FROM public.user_profiles
GROUP BY role::text
ORDER BY count DESC;

-- 5. Check specific super admin users
SELECT 
    'SUPER ADMIN DETAILS' as diagnostic,
    up.email,
    up.role::text as role,
    up.is_active,
    up.created_at,
    CASE 
        WHEN au.id IS NOT NULL THEN 'AUTH EXISTS'
        ELSE 'NO AUTH RECORD'
    END as auth_status
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE up.role::text = 'super_admin'
ORDER BY up.created_at DESC;

-- 6. Check for missing profiles (users in auth but not in profiles)
SELECT 
    'MISSING PROFILES' as diagnostic,
    au.email,
    au.created_at,
    'User exists in auth but no profile' as issue
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ORDER BY au.created_at DESC
LIMIT 5;

-- 7. Test current authentication
SELECT 
    'CURRENT AUTH TEST' as diagnostic,
    CASE 
        WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED'
        ELSE 'AUTHENTICATED AS: ' || auth.uid()::text
    END as auth_status;

-- 8. Check if any profiles can be accessed (RLS test)
SELECT 
    'RLS ACCESS TEST' as diagnostic,
    COUNT(*) as accessible_profiles,
    CASE 
        WHEN COUNT(*) > 0 THEN 'CAN ACCESS PROFILES'
        ELSE 'CANNOT ACCESS PROFILES - RLS BLOCKING'
    END as access_status
FROM public.user_profiles;

-- 9. Simple tenant check
SELECT 
    'TENANT CHECK' as diagnostic,
    COUNT(*) as total_tenants,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants
FROM public.tenants;
