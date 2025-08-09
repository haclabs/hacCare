-- =============================================================================
-- UPGRADE CURRENT USER TO SUPER ADMIN
-- =============================================================================
-- Run this while you're authenticated to upgrade your current user to super_admin
-- =============================================================================

-- First, check who you are
SELECT 
    'CURRENT USER CHECK' as diagnostic,
    CASE 
        WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED - Cannot upgrade'
        ELSE 'AUTHENTICATED AS: ' || auth.uid()::text
    END as auth_status;

-- Check if you have a profile
SELECT 
    'CURRENT PROFILE CHECK' as diagnostic,
    id,
    email,
    role::text as current_role,
    is_active
FROM public.user_profiles 
WHERE id = auth.uid();

-- Upgrade current user to super_admin (only works if you're authenticated)
UPDATE public.user_profiles 
SET 
    role = 'super_admin',
    is_active = true,
    updated_at = NOW()
WHERE id = auth.uid();

-- Verify the upgrade
SELECT 
    'UPGRADE VERIFICATION' as diagnostic,
    id,
    email,
    role::text as new_role,
    is_active,
    updated_at
FROM public.user_profiles 
WHERE id = auth.uid();
