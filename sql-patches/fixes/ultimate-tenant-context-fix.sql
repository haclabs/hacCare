-- ULTIMATE TENANT CONTEXT FIX: Ensure frontend gets proper tenant data
-- This addresses the disconnect between database assignment and frontend context

-- ============================================================================
-- STEP 0: Check authentication status first
-- ============================================================================

SELECT 'AUTHENTICATION CHECK:' as section;
SELECT 
  'Current auth.uid():' as info,
  auth.uid() as user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NULL - Not authenticated'
    WHEN auth.uid() = '00000000-0000-0000-0000-000000000000'::UUID THEN '❌ Empty UUID - Authentication invalid'
    ELSE '✅ Valid UUID - Authenticated'
  END as auth_status;

-- Check if user profile exists
SELECT 
  'User profile check:' as info,
  CASE 
    WHEN EXISTS(SELECT 1 FROM user_profiles WHERE id = auth.uid()) THEN '✅ Profile exists'
    ELSE '❌ No profile found'
  END as profile_status;

-- ============================================================================
-- STEP 1: Fix the function to match frontend expectations exactly
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_current_tenant(UUID);

-- Create function that returns exactly what the frontend expects
CREATE OR REPLACE FUNCTION get_user_current_tenant(target_user_id UUID)
RETURNS TABLE(tenant_id UUID, role TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return the first active tenant assignment for the user
  RETURN QUERY
  SELECT 
    tu.tenant_id,
    tu.role::TEXT,
    tu.is_active
  FROM tenant_users tu
  WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
  ORDER BY tu.created_at DESC  -- Get most recent assignment
  LIMIT 1;
  
  -- If no results found, still return the structure but with nulls
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_current_tenant(UUID) TO authenticated;

-- ============================================================================
-- STEP 2: Test the function immediately
-- ============================================================================

SELECT 'TESTING FUNCTION:' as section;
SELECT 
  'Function result for current user:' as test,
  tenant_id,
  role,
  is_active
FROM get_user_current_tenant(auth.uid());

-- ============================================================================
-- STEP 3: Ensure user has an active tenant assignment
-- ============================================================================

-- Check current assignments
SELECT 'CURRENT ASSIGNMENTS:' as section;
SELECT 
  tu.user_id,
  tu.tenant_id,
  t.name as tenant_name,
  tu.role,
  tu.is_active,
  tu.created_at
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid()
ORDER BY tu.created_at DESC;

-- Ensure there's at least one active assignment
DO $$
DECLARE
  current_user_id UUID := auth.uid();
  active_count INTEGER;
  first_tenant_id UUID;
  user_role TEXT;
BEGIN
  -- Check if auth.uid() is valid
  IF current_user_id IS NULL OR current_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
    RAISE NOTICE 'ERROR: Invalid or null user ID. User not properly authenticated.';
    RAISE NOTICE 'Current auth.uid(): %', current_user_id;
    RAISE NOTICE 'Please log out and log back in to fix authentication.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Processing user: %', current_user_id;
  
  -- Count active assignments
  SELECT COUNT(*) INTO active_count
  FROM tenant_users 
  WHERE user_id = current_user_id AND is_active = true;
  
  IF active_count = 0 THEN
    RAISE NOTICE 'No active tenant assignments found - creating one...';
    
    -- Get user role
    SELECT role INTO user_role FROM user_profiles WHERE id = current_user_id;
    
    IF user_role IS NULL THEN
      RAISE NOTICE 'ERROR: User profile not found for user %', current_user_id;
      RETURN;
    END IF;
    
    -- Get first available tenant
    SELECT id INTO first_tenant_id FROM tenants WHERE status = 'active' ORDER BY created_at LIMIT 1;
    
    IF first_tenant_id IS NOT NULL THEN
      -- Create assignment
      INSERT INTO tenant_users (user_id, tenant_id, role, is_active, created_at, updated_at)
      VALUES (current_user_id, first_tenant_id, COALESCE(user_role, 'admin'), true, NOW(), NOW());
      
      RAISE NOTICE 'Created tenant assignment: % -> %', current_user_id, first_tenant_id;
    ELSE
      RAISE NOTICE 'ERROR: No active tenants available for assignment';
    END IF;
  ELSE
    RAISE NOTICE 'User has % active tenant assignment(s)', active_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create alternative direct query function (backup)
-- ============================================================================

-- Alternative function that directly joins with tenant data
CREATE OR REPLACE FUNCTION get_user_tenant_direct(target_user_id UUID)
RETURNS TABLE(
  tenant_id UUID,
  tenant_name TEXT,
  tenant_subdomain TEXT,
  user_role TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.subdomain as tenant_subdomain,
    tu.role::TEXT as user_role,
    tu.is_active
  FROM tenant_users tu
  JOIN tenants t ON tu.tenant_id = t.id
  WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
    AND t.status = 'active'
  ORDER BY tu.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_tenant_direct(UUID) TO authenticated;

-- Test the alternative function
SELECT 'TESTING ALTERNATIVE FUNCTION:' as section;
SELECT * FROM get_user_tenant_direct(auth.uid());

-- ============================================================================
-- STEP 5: Force refresh any cached data
-- ============================================================================

-- Update the user's updated_at to force cache refresh
UPDATE user_profiles 
SET updated_at = NOW() 
WHERE id = auth.uid();

-- Update tenant assignment updated_at
UPDATE tenant_users 
SET updated_at = NOW() 
WHERE user_id = auth.uid() AND is_active = true;

-- ============================================================================
-- STEP 6: Final comprehensive verification
-- ============================================================================

SELECT 'FINAL VERIFICATION:' as section;

-- Test both functions
SELECT 
  'get_user_current_tenant result:' as function_name,
  tenant_id,
  role,
  is_active
FROM get_user_current_tenant(auth.uid())
UNION ALL
SELECT 
  'get_user_tenant_direct result:' as function_name,
  tenant_id,
  tenant_name as role,  -- Just for display
  is_active
FROM get_user_tenant_direct(auth.uid());

-- Show final status
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ SUCCESS: User has active tenant assignments'
    ELSE '❌ PROBLEM: User still has no tenant assignments'
  END as final_status,
  COUNT(*) as assignment_count
FROM tenant_users 
WHERE user_id = auth.uid() AND is_active = true;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

SELECT '🔄 NEXT STEPS:' as instructions;
SELECT '1. Copy the "tenant_id" from the function results above' as step1;
SELECT '2. Clear browser cache completely (Ctrl+Shift+R)' as step2;
SELECT '3. If still not working, try incognito/private browsing' as step3;
SELECT '4. Check browser console for any remaining errors' as step4;
