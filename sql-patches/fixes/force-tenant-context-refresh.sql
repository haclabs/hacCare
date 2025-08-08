-- FORCE TENANT CONTEXT REFRESH: Clear any cached issues
-- Run this quick script to verify your tenant assignment and force refresh

-- ============================================================================
-- STEP 1: Verify your tenant assignment exists and is working
-- ============================================================================

SELECT 'CURRENT USER TENANT VERIFICATION:' as section;

-- Check if you have active tenant assignments
SELECT 
  'Your Active Tenant Assignments:' as info,
  tu.tenant_id,
  t.name as tenant_name,
  t.subdomain,
  tu.role as your_role,
  tu.is_active,
  tu.created_at
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid() 
  AND tu.is_active = true;

-- Test the get_user_current_tenant function directly
SELECT 'TESTING FUNCTION DIRECTLY:' as section;
SELECT 
  'Function result:' as info,
  tenant_id,
  role,
  is_active
FROM get_user_current_tenant(auth.uid());

-- ============================================================================
-- STEP 2: Create a simple test function for debugging
-- ============================================================================

CREATE OR REPLACE FUNCTION debug_user_tenant_context()
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  tenant_id UUID,
  tenant_name TEXT,
  tenant_subdomain TEXT,
  assignment_role TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.email as user_email,
    up.role as user_role,
    t.id as tenant_id,
    t.name as tenant_name,
    t.subdomain as tenant_subdomain,
    tu.role::TEXT as assignment_role,
    tu.is_active
  FROM user_profiles up
  LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
  LEFT JOIN tenants t ON tu.tenant_id = t.id
  WHERE up.id = auth.uid();
END;
$$;

-- Test the debug function
SELECT 'DEBUG CONTEXT FUNCTION:' as section;
SELECT * FROM debug_user_tenant_context();

-- ============================================================================
-- STEP 3: Quick browser cache clear instructions
-- ============================================================================

SELECT '🔄 FRONTEND CACHE CLEAR INSTRUCTIONS:' as section;
SELECT 'If tenant assignment exists but frontend still shows no tenant:' as step1;
SELECT '1. Open browser Dev Tools (F12)' as step2;
SELECT '2. Go to Application tab > Storage > Clear Storage' as step3;
SELECT '3. Click "Clear site data"' as step4;
SELECT '4. Or try Incognito/Private browsing mode' as step5;
SELECT '5. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)' as step6;

-- ============================================================================
-- STEP 4: Create emergency tenant assignment if needed
-- ============================================================================

-- Emergency function to force-assign user if somehow assignment got lost
CREATE OR REPLACE FUNCTION emergency_assign_user_to_any_tenant()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  any_tenant_id UUID;
  current_user_role TEXT;
  result_msg TEXT;
BEGIN
  -- Check if user already has assignment
  IF EXISTS (SELECT 1 FROM tenant_users WHERE user_id = current_user_id AND is_active = true) THEN
    RETURN 'User already has active tenant assignment';
  END IF;
  
  -- Get user role
  SELECT role INTO current_user_role FROM user_profiles WHERE id = current_user_id;
  
  -- Get any active tenant
  SELECT id INTO any_tenant_id FROM tenants WHERE status = 'active' LIMIT 1;
  
  IF any_tenant_id IS NULL THEN
    RETURN 'ERROR: No active tenants found';
  END IF;
  
  -- Create assignment
  INSERT INTO tenant_users (user_id, tenant_id, role, is_active, created_at, updated_at)
  VALUES (current_user_id, any_tenant_id, COALESCE(current_user_role, 'admin'), true, NOW(), NOW());
  
  RETURN 'EMERGENCY: Assigned user to tenant ' || any_tenant_id;
END;
$$;

-- Only run emergency assignment if no active assignments exist
DO $$
DECLARE
  assignment_count INTEGER;
  emergency_result TEXT;
BEGIN
  SELECT COUNT(*) INTO assignment_count 
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true;
  
  IF assignment_count = 0 THEN
    SELECT emergency_assign_user_to_any_tenant() INTO emergency_result;
    RAISE NOTICE 'Emergency assignment: %', emergency_result;
  ELSE
    RAISE NOTICE 'User has % active assignments - no emergency action needed', assignment_count;
  END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT 'FINAL STATUS CHECK:' as section;
SELECT 
  'Your current status:' as info,
  CASE 
    WHEN COUNT(*) > 0 THEN 'TENANT ASSIGNED - Frontend should work after cache clear'
    ELSE 'NO TENANT ASSIGNMENT - Contact admin'
  END as status,
  COUNT(*) as active_assignments
FROM tenant_users 
WHERE user_id = auth.uid() AND is_active = true;

SELECT '✅ If you see "TENANT ASSIGNED" above, clear browser cache and refresh!' as instruction;
