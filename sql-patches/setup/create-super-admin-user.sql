-- =============================================================================
-- CREATE SUPER ADMIN USER FOR AUTHENTICATION
-- =============================================================================
-- Run this in Supabase SQL Editor to create a super admin you can sign in with
-- =============================================================================

-- First, create the user profile (bypasses RLS as postgres user)
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Generate a UUID for the test user
    test_user_id := gen_random_uuid();
    
    -- Insert into user_profiles
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
        'admin@haccare.com',
        'Super Admin',
        'super_admin',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO UPDATE SET 
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    
    RAISE NOTICE 'Super admin profile created with ID: %', test_user_id;
    RAISE NOTICE 'Email: admin@haccare.com';
    RAISE NOTICE 'Next: Create matching auth user in Supabase Authentication tab';
END $$;

-- Verify the profile was created
SELECT 
    'VERIFICATION' as check,
    id,
    email,
    role::text,
    is_active,
    created_at
FROM public.user_profiles 
WHERE email = 'admin@haccare.com';
