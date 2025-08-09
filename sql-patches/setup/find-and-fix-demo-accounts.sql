-- =============================================================================
-- FIND AND FIX DEMO ACCOUNTS 
-- =============================================================================
-- Run this in Supabase SQL Editor to find and upgrade demo accounts
-- =============================================================================

-- 1. Show all users in auth.users (to find demo accounts)
SELECT 
    'ALL AUTH USERS' as diagnostic,
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email LIKE '%demo%' THEN 'DEMO ACCOUNT'
        WHEN email LIKE '%test%' THEN 'TEST ACCOUNT'  
        WHEN email LIKE '%admin%' THEN 'ADMIN ACCOUNT'
        ELSE 'REGULAR ACCOUNT'
    END as account_type
FROM auth.users
ORDER BY created_at DESC;

-- 2. Show all user profiles
SELECT 
    'ALL USER PROFILES' as diagnostic,
    id,
    email,
    role::text,
    is_active,
    created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- 3. Show users missing profiles
SELECT 
    'USERS WITHOUT PROFILES' as diagnostic,
    au.id,
    au.email,
    'Missing profile - this could be your demo account' as issue
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. Upgrade ALL existing user profiles to super_admin (NUCLEAR OPTION)
-- UNCOMMENT ONLY IF YOU WANT TO MAKE ALL USERS SUPER ADMIN
/*
UPDATE public.user_profiles 
SET 
    role = 'super_admin',
    is_active = true,
    updated_at = NOW();

SELECT 'ALL USERS UPGRADED' as result, COUNT(*) as upgraded_count 
FROM public.user_profiles 
WHERE role::text = 'super_admin';
*/

-- 5. Create profiles for users missing them
-- UNCOMMENT TO CREATE MISSING PROFILES AS SUPER ADMIN
/*
INSERT INTO public.user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'Demo User'),
    'super_admin',
    true,
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

SELECT 'MISSING PROFILES CREATED' as result, COUNT(*) as created_count
FROM public.user_profiles;
*/
