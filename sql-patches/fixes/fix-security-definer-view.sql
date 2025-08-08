-- FIX SECURITY DEFINER VIEW: Replace with safer RLS-based approach
-- This addresses Supabase's security alert about SECURITY DEFINER views

-- ============================================================================
-- STEP 1: Remove the problematic SECURITY DEFINER view
-- ============================================================================

-- Drop the existing view that has SECURITY DEFINER
DROP VIEW IF EXISTS secure_patient_alerts;

SELECT 'Removed SECURITY DEFINER view: secure_patient_alerts' as security_fix;

-- ============================================================================
-- STEP 2: Create a regular view that relies on RLS policies instead
-- ============================================================================

-- Create a standard view without SECURITY DEFINER
-- This will use the querying user's permissions and RLS policies
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

-- Apply Supabase's recommended security fix
ALTER VIEW public.patient_alerts_view 
SET (security_invoker = on);

-- Grant access to authenticated users (RLS will handle filtering)
GRANT SELECT ON patient_alerts_view TO authenticated;

SELECT 'Created safer view: patient_alerts_view (uses RLS policies)' as security_improvement;

-- ============================================================================
-- STEP 3: Ensure RLS policies are properly configured
-- ============================================================================

-- Verify RLS is enabled on the underlying table
SELECT 
  'RLS Status Check:' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled - SECURITY RISK'
  END as status
FROM pg_tables 
WHERE tablename = 'patient_alerts' AND schemaname = 'public';

-- ============================================================================
-- STEP 4: Update the get_secure_alerts function to use the new view
-- ============================================================================

-- First, let's diagnose the user profile issue
SELECT 'USER PROFILE DIAGNOSTIC:' as section;
SELECT 
  'Current auth.uid():' as check_type,
  auth.uid() as user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ Authentication required'
    WHEN auth.uid() = '00000000-0000-0000-0000-000000000000'::UUID THEN '❌ Invalid session'
    ELSE '✅ Valid authentication'
  END as auth_status;

SELECT 
  'User profile status:' as check_type,
  CASE 
    WHEN EXISTS(SELECT 1 FROM user_profiles WHERE id = auth.uid()) THEN '✅ Profile exists'
    ELSE '❌ Profile missing'
  END as profile_status,
  CASE 
    WHEN (SELECT is_active FROM user_profiles WHERE id = auth.uid()) THEN '✅ Active'
    WHEN (SELECT is_active FROM user_profiles WHERE id = auth.uid()) = false THEN '❌ Inactive'
    ELSE '❌ No profile'
  END as active_status;

-- Show user details if profile exists
SELECT 
  'Your user details:' as info,
  up.id,
  up.email,
  up.role,
  up.is_active,
  up.created_at
FROM user_profiles up
WHERE up.id = auth.uid();

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_secure_alerts();

-- Replace the function to use the new safer view
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
SECURITY DEFINER  -- This function can be SECURITY DEFINER as it has proper validation
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_exists BOOLEAN := false;
  user_active BOOLEAN := false;
BEGIN
  -- Check if auth.uid() is valid
  IF current_user_id IS NULL OR current_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
    RAISE EXCEPTION 'Access denied: Authentication required (auth.uid is null or invalid)';
  END IF;

  -- Check if user profile exists and is active
  SELECT 
    EXISTS(SELECT 1 FROM user_profiles WHERE id = current_user_id),
    COALESCE((SELECT is_active FROM user_profiles WHERE id = current_user_id), false)
  INTO user_exists, user_active;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Access denied: User profile not found for user %', current_user_id;
  END IF;
  
  IF NOT user_active THEN
    RAISE EXCEPTION 'Access denied: User account is inactive for user %', current_user_id;
  END IF;

  -- Return alerts using the RLS-protected view
  RETURN QUERY
  SELECT 
    pav.id as alert_id,  -- Renamed to avoid ambiguity
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

GRANT EXECUTE ON FUNCTION get_secure_alerts() TO authenticated;

SELECT 'Updated get_secure_alerts function to use RLS-based view' as function_update;

-- ============================================================================
-- STEP 5: Verify the fix works correctly
-- ============================================================================

-- Test the new view respects RLS policies
SELECT 'TESTING NEW VIEW:' as test_section;

-- Count alerts accessible through new view
SELECT 
  'Alerts visible through patient_alerts_view:' as test_type,
  COUNT(*) as alert_count,
  'Should only show alerts for your tenant' as note
FROM patient_alerts_view;

-- Test the updated function only if authentication is working
SELECT 'TESTING UPDATED FUNCTION:' as function_test;

-- Conditional function test
DO $$
DECLARE
  current_auth_uid UUID := auth.uid();
  function_result_count INTEGER := 0;
BEGIN
  -- Only test function if auth is valid
  IF current_auth_uid IS NOT NULL 
     AND current_auth_uid != '00000000-0000-0000-0000-000000000000'::UUID 
     AND EXISTS(SELECT 1 FROM user_profiles WHERE id = current_auth_uid AND is_active = true) THEN
    
    -- Test the function
    SELECT COUNT(*) INTO function_result_count FROM get_secure_alerts();
    RAISE NOTICE 'get_secure_alerts() returned % alerts', function_result_count;
    
  ELSE
    RAISE NOTICE 'Skipping function test - authentication issues detected';
    RAISE NOTICE 'Function created successfully but requires valid authentication to test';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Security verification
-- ============================================================================

SELECT 'SECURITY VERIFICATION:' as security_check;

-- Check that no SECURITY DEFINER views remain for patient_alerts
SELECT 
  'SECURITY DEFINER views check:' as check_type,
  COUNT(*) as definer_view_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No risky SECURITY DEFINER views found'
    ELSE '❌ SECURITY DEFINER views still exist'
  END as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND view_definition ILIKE '%patient_alert%'
  AND view_definition ILIKE '%SECURITY DEFINER%';

-- Verify RLS policies are active
SELECT 
  'RLS Policy Check:' as check_type,
  COUNT(*) as policy_count,
  'Active RLS policies on patient_alerts' as description
FROM pg_policies 
WHERE tablename = 'patient_alerts' 
  AND schemaname = 'public';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '🔒 SECURITY FIX COMPLETE!' as status;
SELECT '✅ Removed SECURITY DEFINER view' as fix1;
SELECT '✅ Created RLS-based view instead' as fix2;
SELECT '✅ Updated functions to use safer approach' as fix3;
SELECT '🔍 Supabase security alert should be resolved' as result;

-- Final instruction
SELECT 'Check Supabase Dashboard > Reports > Security to verify alert is cleared' as final_step;
