-- =============================================================================
-- FIX AUTHENTICATION ISSUES CAUSING text = uuid ERRORS
-- =============================================================================
-- The error occurs because auth.uid() returns NULL when not authenticated
-- and PostgreSQL can't handle NULL comparisons with mixed types
-- =============================================================================

-- 1. First, let's check if you have any users in your auth.users table
SELECT 
    'USER COUNT CHECK' as check,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as recent_users
FROM auth.users;

-- 2. Check if you have any user_profiles
SELECT 
    'USER PROFILES CHECK' as check,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_profiles,
    string_agg(DISTINCT role, ', ') as available_roles
FROM public.user_profiles;

-- 3. Check current authentication context
SELECT 
    'AUTH CONTEXT' as check,
    COALESCE(auth.uid()::text, 'NULL') as current_user_id,
    COALESCE(auth.jwt() ->> 'role', 'NULL') as current_role,
    CASE 
        WHEN auth.uid() IS NULL THEN 'You need to authenticate first'
        ELSE 'Authenticated successfully'
    END as auth_message;

-- 4. Create a test authentication simulation (for debugging policies)
-- This helps test policies without actual authentication
DO $$
BEGIN
    -- Check if we can create a temporary function to simulate auth
    RAISE NOTICE 'To test policies, you need to:';
    RAISE NOTICE '1. Sign up a user in Supabase Auth';
    RAISE NOTICE '2. Or use the Supabase dashboard to create a test user';
    RAISE NOTICE '3. Then authenticate via the client to get auth.uid()';
END $$;

-- 5. Show example of how to create a test user (run this if you need a test user)
-- UNCOMMENT THE LINES BELOW if you want to create a test user:

/*
-- Create a test user profile (without auth.uid() dependency)
INSERT INTO public.user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'test@example.com',
    'Test User',
    'super_admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Show the created user
SELECT 'TEST USER CREATED' as status, id, email, role FROM public.user_profiles WHERE email = 'test@example.com';
*/

-- 6. Alternative: Fix policies to handle NULL auth.uid() gracefully
-- This prevents the text = uuid error when not authenticated

-- Check current problematic policies
SELECT 
    'POLICIES THAT FAIL WHEN NOT AUTHENTICATED' as check,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%IS NOT NULL%' THEN 'NEEDS NULL CHECK'
        ELSE 'PROBABLY OK'
    END as null_safety,
    LEFT(qual, 100) as policy_excerpt
FROM pg_policies 
WHERE qual LIKE '%auth.uid()%'
ORDER BY null_safety DESC;
