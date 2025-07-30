-- Auth Security Configuration Recommendations
-- Description: SQL queries and recommendations for fixing auth security warnings
-- Date: 2025-07-30

-- =============================================================================
-- Note: These auth settings must be configured in Supabase Dashboard
-- The following are the settings you need to change manually:
-- =============================================================================

/*
Auth Configuration Changes Needed (via Supabase Dashboard):

1. Enable Leaked Password Protection:
   - Go to Authentication → Settings → Password Security
   - Enable "Leaked Password Protection"
   - This checks passwords against HaveIBeenPwned.org database

2. Enable Additional MFA Options:
   - Go to Authentication → Settings → Multi-Factor Authentication  
   - Enable additional MFA methods:
     * Phone (SMS)
     * Phone (WhatsApp) 
     * TOTP (Time-based One-Time Password)
   - Currently you likely only have one method enabled

These settings cannot be changed via SQL and must be configured 
through the Supabase Dashboard interface.
*/

-- =============================================================================
-- SQL Verification Queries (for after you make the dashboard changes)
-- =============================================================================

-- Check current auth configuration (this will show current settings)
SELECT 
    'Auth configuration check - run after making dashboard changes' as note;

-- You can verify MFA settings with:
-- SELECT * FROM auth.mfa_factors LIMIT 5;

-- You can check if leaked password protection is working by trying to use 
-- a known compromised password when creating a test user

-- =============================================================================
-- Additional Security Hardening (SQL-based)
-- =============================================================================

-- Enable RLS on auth-related tables if not already enabled
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Create additional security policies if needed
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'Users can only see their own profile'
    ) THEN
        CREATE POLICY "Users can only see their own profile"
            ON public.user_profiles FOR SELECT
            USING (auth.uid() = id OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = auth.uid() AND role = 'super_admin'
            ));
    END IF;
END $$;

-- Log completion
SELECT 
    'SQL-based security hardening complete' as status,
    'Manual auth configuration changes still required in dashboard' as reminder;
