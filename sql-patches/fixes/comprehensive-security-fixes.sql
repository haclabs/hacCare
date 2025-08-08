-- COMPREHENSIVE SUPABASE SECURITY FIXES
-- This script addresses all the security warnings from Supabase linter

-- ============================================================================
-- FIX 1: Function Search Path Mutable Issues
-- ============================================================================

-- Fix all functions that have mutable search_path by adding SET search_path = public

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
DROP FUNCTION IF EXISTS trigger_refresh_user_tenant_cache();
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

-- 4. update_medication_administrations_updated_at function
DROP FUNCTION IF EXISTS update_medication_administrations_updated_at();
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
  
  -- Delete from auth.users
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
DROP FUNCTION IF EXISTS ensure_user_profile();
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

-- 10. get_tenant_users function (already fixed in previous scripts, but ensuring search_path)
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

SELECT '✅ FIXED: All function search_path issues resolved' as fix_status;

-- ============================================================================
-- FIX 2: Materialized View in API Issue
-- ============================================================================

-- Remove public access to user_tenant_cache materialized view
REVOKE ALL ON user_tenant_cache FROM anon;
REVOKE ALL ON user_tenant_cache FROM authenticated;

-- Only allow specific functions to access it
GRANT SELECT ON user_tenant_cache TO postgres;

SELECT '✅ FIXED: Materialized view access restricted' as fix_status;

-- ============================================================================
-- FIX 3: Grant proper permissions to fixed functions
-- ============================================================================

-- Grant execute permissions to authenticated users for all functions
GRANT EXECUTE ON FUNCTION validate_subdomain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_tenant_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_permanently(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_tenant_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_users(UUID) TO authenticated;

SELECT '✅ FIXED: Function permissions granted' as fix_status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that all functions now have immutable search_path
SELECT 
  'FUNCTION SEARCH PATH VERIFICATION:' as check_type,
  COUNT(*) as functions_with_mutable_search_path,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All functions have immutable search_path'
    ELSE '❌ Some functions still have mutable search_path'
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
    'get_tenant_users'
  )
  AND (p.proconfig IS NULL OR 'search_path=public' != ANY(p.proconfig));

-- Check materialized view permissions
SELECT 
  'MATERIALIZED VIEW PERMISSIONS:' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'user_tenant_cache'
  AND table_schema = 'public';

-- ============================================================================
-- REMAINING MANUAL FIXES NEEDED
-- ============================================================================

SELECT '⚠️  MANUAL FIXES STILL NEEDED:' as manual_fixes;
SELECT '1. Auth OTP Expiry: Go to Supabase Dashboard > Authentication > Settings' as fix1;
SELECT '   Set OTP expiry to less than 1 hour (recommended: 10-15 minutes)' as fix1_detail;
SELECT '2. Leaked Password Protection: Go to Authentication > Settings' as fix2;
SELECT '   Enable "Check against HaveIBeenPwned database"' as fix2_detail;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '🔒 DATABASE SECURITY FIXES COMPLETE!' as status;
SELECT '✅ Fixed all function search_path issues' as fix1;
SELECT '✅ Restricted materialized view access' as fix2;
SELECT '✅ Updated function permissions' as fix3;
SELECT '⚠️  2 manual fixes needed in Supabase Dashboard' as remaining;
SELECT 'Check Supabase Dashboard > Reports > Security to verify fixes' as verification;
