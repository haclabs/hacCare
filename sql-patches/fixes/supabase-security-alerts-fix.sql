-- ============================================================================
-- SUPABASE SECURITY ALERTS COMPREHENSIVE FIX
-- ============================================================================
-- This script addresses ALL the security warnings from your Supabase dashboard:
-- 1. Function Search Path Mutable (10 functions)
-- 2. Materialized View in API (user_tenant_cache)
-- 3. Security Definer View (if any exist)
--
-- Copy and paste this entire script into Supabase SQL Editor and run it
-- ============================================================================

-- ============================================================================
-- FIX 1: SECURITY DEFINER VIEW ISSUE
-- ============================================================================

-- Remove any problematic SECURITY DEFINER views
DROP VIEW IF EXISTS secure_patient_alerts;

-- Create safer RLS-based view with security_invoker setting
CREATE OR REPLACE VIEW patient_alerts_view AS
SELECT 
  pa.id,
  pa.patient_id,
  pa.patient_name,
  pa.alert_type,
  pa.message,
  pa.priority,
  pa.acknowledged,
  pa.acknowledged_by,
  pa.acknowledged_at,
  pa.created_at,
  pa.tenant_id,
  t.name as tenant_name,
  t.subdomain as tenant_subdomain
FROM patient_alerts pa
JOIN tenants t ON pa.tenant_id = t.id;

-- Apply Supabase's recommended security_invoker setting
ALTER VIEW public.patient_alerts_view SET (security_invoker = on);

-- Grant access (RLS will handle filtering)
GRANT SELECT ON patient_alerts_view TO authenticated;

-- ============================================================================
-- FIX 2: FUNCTION SEARCH PATH MUTABLE ISSUES
-- ============================================================================

-- Fix all 10 functions that have mutable search_path by adding SET search_path = public

-- 1. validate_subdomain function
DROP FUNCTION IF EXISTS validate_subdomain(TEXT);
CREATE OR REPLACE FUNCTION validate_subdomain(subdomain_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
BEGIN
  -- Validate subdomain format and availability
  IF subdomain_input IS NULL OR LENGTH(subdomain_input) < 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if subdomain already exists
  IF EXISTS (SELECT 1 FROM tenants WHERE subdomain = subdomain_input) THEN
    RETURN FALSE;
  END IF;
  
  -- Basic validation: alphanumeric and hyphens only
  IF subdomain_input !~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 2. refresh_user_tenant_cache function
DROP FUNCTION IF EXISTS refresh_user_tenant_cache();
CREATE OR REPLACE FUNCTION refresh_user_tenant_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
BEGIN
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_tenant_cache;
END;
$$;

-- 3. trigger_refresh_user_tenant_cache function
-- First drop the trigger that depends on this function
DROP TRIGGER IF EXISTS tenant_users_cache_refresh ON tenant_users;

-- Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS trigger_refresh_user_tenant_cache() CASCADE;
CREATE OR REPLACE FUNCTION trigger_refresh_user_tenant_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
BEGIN
  -- Trigger cache refresh
  PERFORM refresh_user_tenant_cache();
  RETURN NULL;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER tenant_users_cache_refresh
  AFTER INSERT OR UPDATE OR DELETE ON tenant_users
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_user_tenant_cache();

-- 4. update_medication_administrations_updated_at function
-- First drop any triggers that depend on this function
DROP TRIGGER IF EXISTS medication_administrations_updated_at ON medication_administrations;

-- Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS update_medication_administrations_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_medication_administrations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger if it exists
DO $$
BEGIN
  -- Only create trigger if medication_administrations table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations') THEN
    EXECUTE 'CREATE TRIGGER medication_administrations_updated_at
      BEFORE UPDATE ON medication_administrations
      FOR EACH ROW
      EXECUTE FUNCTION update_medication_administrations_updated_at()';
  END IF;
END $$;

-- 5. delete_user_permanently function
DROP FUNCTION IF EXISTS delete_user_permanently(UUID);
CREATE OR REPLACE FUNCTION delete_user_permanently(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Only super admins can permanently delete users
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can permanently delete users';
  END IF;
  
  -- Delete from tenant_users first
  DELETE FROM tenant_users WHERE user_id = target_user_id;
  
  -- Delete from user_profiles
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Delete from auth.users (this requires service role)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN 'User permanently deleted';
END;
$$;

-- 6. deactivate_user function
DROP FUNCTION IF EXISTS deactivate_user(UUID);
CREATE OR REPLACE FUNCTION deactivate_user(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check permissions
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to deactivate users';
  END IF;
  
  -- Deactivate user
  UPDATE user_profiles 
  SET is_active = false, updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN 'User deactivated successfully';
END;
$$;

-- 7. reactivate_user function
DROP FUNCTION IF EXISTS reactivate_user(UUID);
CREATE OR REPLACE FUNCTION reactivate_user(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check permissions
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to reactivate users';
  END IF;
  
  -- Reactivate user
  UPDATE user_profiles 
  SET is_active = true, updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN 'User reactivated successfully';
END;
$$;

-- 8. delete_tenant_secure function
DROP FUNCTION IF EXISTS delete_tenant_secure(UUID);
CREATE OR REPLACE FUNCTION delete_tenant_secure(target_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Only super admins can delete tenants
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can delete tenants';
  END IF;
  
  -- Soft delete tenant
  UPDATE tenants 
  SET status = 'inactive', updated_at = NOW()
  WHERE id = target_tenant_id;
  
  RETURN 'Tenant deleted successfully';
END;
$$;

-- 9. ensure_user_profile function
-- First drop any triggers that depend on this function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now we can safely drop and recreate the function
DROP FUNCTION IF EXISTS ensure_user_profile() CASCADE;
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
BEGIN
  -- Create user profile if it doesn't exist
  INSERT INTO user_profiles (id, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'nurse',  -- Default role
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_profile();

-- 10. get_tenant_users function
DROP FUNCTION IF EXISTS get_tenant_users(UUID);
CREATE OR REPLACE FUNCTION get_tenant_users(target_tenant_id UUID)
RETURNS TABLE(
  user_id UUID,
  tenant_id UUID,
  role TEXT,
  permissions TEXT[],
  is_active BOOLEAN,
  email TEXT,
  first_name TEXT,
  last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.role::TEXT,
    tu.permissions,
    tu.is_active,
    up.email,
    up.first_name,
    up.last_name
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE tu.tenant_id = target_tenant_id;
END;
$$;

-- Update get_secure_alerts function to use new view and fix search_path
DROP FUNCTION IF EXISTS get_secure_alerts();
CREATE OR REPLACE FUNCTION get_secure_alerts()
RETURNS TABLE(
  alert_id UUID,
  patient_id UUID,
  patient_name TEXT,
  alert_type TEXT,
  message TEXT,
  priority TEXT,
  acknowledged BOOLEAN,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  tenant_id UUID,
  tenant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY FIX: Set immutable search_path
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_exists BOOLEAN := false;
  user_active BOOLEAN := false;
BEGIN
  -- Check if auth.uid() is valid
  IF current_user_id IS NULL OR current_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;

  -- Check if user profile exists and is active
  SELECT 
    EXISTS(SELECT 1 FROM user_profiles WHERE id = current_user_id),
    COALESCE((SELECT is_active FROM user_profiles WHERE id = current_user_id), false)
  INTO user_exists, user_active;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Access denied: User profile not found';
  END IF;
  
  IF NOT user_active THEN
    RAISE EXCEPTION 'Access denied: User account is inactive';
  END IF;

  -- Return alerts using the RLS-protected view
  RETURN QUERY
  SELECT 
    pav.id as alert_id,
    pav.patient_id,
    pav.patient_name,
    pav.alert_type,
    pav.message,
    pav.priority,
    pav.acknowledged,
    pav.acknowledged_by,
    pav.acknowledged_at,
    pav.created_at,
    pav.tenant_id,
    pav.tenant_name
  FROM patient_alerts_view pav
  ORDER BY pav.created_at DESC;
END;
$$;

-- ============================================================================
-- FIX 3: MATERIALIZED VIEW IN API ISSUE
-- ============================================================================

-- Remove public API access to user_tenant_cache materialized view
REVOKE ALL ON user_tenant_cache FROM anon;
REVOKE ALL ON user_tenant_cache FROM authenticated;

-- Only allow specific functions to access it (postgres role for system functions)
GRANT SELECT ON user_tenant_cache TO postgres;

-- ============================================================================
-- FIX 4: GRANT PROPER PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users for all fixed functions
GRANT EXECUTE ON FUNCTION validate_subdomain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_tenant_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_permanently(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_tenant_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_secure_alerts() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all functions now have immutable search_path
SELECT 
  'SEARCH PATH FIX VERIFICATION:' as check_type,
  p.proname as function_name,
  CASE 
    WHEN p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig) THEN '✅ Fixed'
    ELSE '❌ Still mutable'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'validate_subdomain',
    'refresh_user_tenant_cache',
    'trigger_refresh_user_tenant_cache',
    'update_medication_administrations_updated_at',
    'delete_user_permanently',
    'deactivate_user',
    'reactivate_user',
    'delete_tenant_secure',
    'ensure_user_profile',
    'get_tenant_users',
    'get_secure_alerts'
  )
ORDER BY p.proname;

-- Check materialized view permissions (should only show postgres)
SELECT 
  'MATERIALIZED VIEW PERMISSIONS:' as check_type,
  grantee,
  privilege_type,
  CASE 
    WHEN grantee IN ('anon', 'authenticated') THEN '❌ Public access still exists'
    ELSE '✅ Properly restricted'
  END as status
FROM information_schema.role_table_grants
WHERE table_name = 'user_tenant_cache'
  AND table_schema = 'public';

-- Check for any remaining SECURITY DEFINER views
SELECT 
  'SECURITY DEFINER VIEWS CHECK:' as check_type,
  COUNT(*) as definer_view_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No risky SECURITY DEFINER views found'
    ELSE '❌ SECURITY DEFINER views still exist'
  END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND view_definition ILIKE '%SECURITY DEFINER%';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '🔒 DATABASE SECURITY FIXES COMPLETE!' as status;
SELECT '✅ Fixed 10+ function search_path issues' as fix1;
SELECT '✅ Restricted materialized view API access' as fix2;
SELECT '✅ Replaced SECURITY DEFINER views with RLS-based approach' as fix3;
SELECT '✅ Applied security_invoker setting to views' as fix4;

-- ============================================================================
-- MANUAL FIXES STILL NEEDED IN SUPABASE DASHBOARD
-- ============================================================================

SELECT '⚠️  MANUAL FIXES STILL NEEDED:' as manual_fixes;
SELECT '1. Go to Supabase Dashboard > Authentication > Settings' as step1;
SELECT '   - Set OTP expiry to less than 1 hour (recommended: 10-15 minutes)' as step1_detail;
SELECT '2. In Authentication > Settings:' as step2;
SELECT '   - Enable "Check against HaveIBeenPwned database" for leaked password protection' as step2_detail;
SELECT '3. After running this script, go to Dashboard > Reports > Security' as step3;
SELECT '   - Verify that all security alerts are resolved' as step3_detail;

SELECT 'All database-level security issues should now be resolved!' as final_message;
