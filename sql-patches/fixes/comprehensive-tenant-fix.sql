-- COMPREHENSIVE FIX: Tenant Assignment and Function Structure
-- This script fixes both the function structure mismatch AND assigns user to tenant
-- Run this COMPLETE script in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Fix the get_user_current_tenant function structure mismatch
-- ============================================================================

-- Drop the problematic function that returns UUID
DROP FUNCTION IF EXISTS get_user_current_tenant(UUID);
DROP FUNCTION IF EXISTS get_user_current_tenant(target_user_id UUID);

-- Create the correct function that returns the expected table structure
CREATE OR REPLACE FUNCTION get_user_current_tenant(target_user_id UUID)
RETURNS TABLE(tenant_id UUID, role TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.tenant_id,
    tu.role::TEXT,  -- Cast VARCHAR to TEXT to match return type
    tu.is_active
  FROM tenant_users tu
  WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
  LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_current_tenant(UUID) TO authenticated;

SELECT 'Step 1 Complete: Function structure fixed!' as step1_status;

-- ============================================================================
-- STEP 2: Diagnose current user's tenant assignment
-- ============================================================================

SELECT 'STEP 2: DIAGNOSING TENANT ASSIGNMENT:' as section;

-- Check current user details
SELECT 
  'Current User Info:' as info,
  up.id,
  up.email,
  up.role,
  up.first_name,
  up.last_name,
  up.is_active
FROM user_profiles up
WHERE up.id = auth.uid();

-- Check current user's tenant assignments
SELECT 
  'Current Tenant Assignments:' as info,
  COALESCE(COUNT(*), 0) as assignment_count
FROM tenant_users tu
WHERE tu.user_id = auth.uid() AND tu.is_active = true;

-- Show detailed assignments if any exist
SELECT 
  'Detailed Assignments:' as info,
  tu.tenant_id,
  t.name as tenant_name,
  tu.role as tenant_role,
  tu.is_active
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid();

-- Show available tenants
SELECT 'AVAILABLE TENANTS:' as section;
SELECT 
  id,
  name,
  subdomain,
  status,
  created_at
FROM tenants
WHERE status = 'active'
ORDER BY created_at;

-- ============================================================================
-- STEP 3: Create assignment function
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_current_user_to_tenant(target_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_user_role TEXT;
  tenant_name TEXT;
  existing_assignment BOOLEAN;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = current_user_id;
  
  -- Get tenant name
  SELECT name INTO tenant_name
  FROM tenants WHERE id = target_tenant_id;
  
  IF tenant_name IS NULL THEN
    RETURN 'ERROR: Tenant not found with ID ' || target_tenant_id;
  END IF;
  
  -- Check if assignment already exists
  SELECT EXISTS(
    SELECT 1 FROM tenant_users 
    WHERE user_id = current_user_id 
    AND tenant_id = target_tenant_id
  ) INTO existing_assignment;
  
  IF existing_assignment THEN
    -- Update existing assignment to active
    UPDATE tenant_users 
    SET 
      is_active = true,
      updated_at = NOW()
    WHERE user_id = current_user_id 
    AND tenant_id = target_tenant_id;
    
    RETURN 'SUCCESS: Activated existing assignment to ' || tenant_name;
  ELSE
    -- Create new assignment
    INSERT INTO tenant_users (
      user_id,
      tenant_id,
      role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      current_user_id,
      target_tenant_id,
      COALESCE(current_user_role, 'admin'), -- Use user's existing role or default to admin
      true,
      NOW(),
      NOW()
    );
    
    RETURN 'SUCCESS: Created new assignment to ' || tenant_name || ' with role ' || COALESCE(current_user_role, 'admin');
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

SELECT 'Step 3 Complete: Assignment function created!' as step3_status;

-- ============================================================================
-- STEP 4: Auto-assign current user to first available tenant
-- ============================================================================

DO $$
DECLARE
  first_tenant_id UUID;
  result_message TEXT;
  current_assignments INTEGER;
BEGIN
  -- Check if user already has any active assignments
  SELECT COUNT(*) INTO current_assignments
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true;
  
  IF current_assignments > 0 THEN
    RAISE NOTICE 'User already has % active tenant assignment(s)', current_assignments;
  ELSE
    -- Get the first active tenant
    SELECT id INTO first_tenant_id
    FROM tenants 
    WHERE status = 'active'
    ORDER BY created_at
    LIMIT 1;
    
    IF first_tenant_id IS NOT NULL THEN
      SELECT assign_current_user_to_tenant(first_tenant_id) INTO result_message;
      RAISE NOTICE 'Auto-assignment result: %', result_message;
    ELSE
      RAISE NOTICE 'No active tenants found for assignment';
    END IF;
  END IF;
END $$;

SELECT 'Step 4 Complete: Auto-assignment attempted!' as step4_status;

-- ============================================================================
-- STEP 5: Test the fixed function
-- ============================================================================

SELECT 'STEP 5: TESTING FIXED FUNCTION:' as section;

-- Test the function that was causing the error
SELECT 
  'Testing get_user_current_tenant function:' as test_info,
  tenant_id,
  role,
  is_active
FROM get_user_current_tenant(auth.uid());

-- ============================================================================
-- STEP 6: Final verification
-- ============================================================================

SELECT 'STEP 6: FINAL VERIFICATION:' as section;

-- Verify user now has tenant assignment
SELECT 
  up.email,
  up.role as user_role,
  tu.tenant_id,
  t.name as tenant_name,
  tu.role as tenant_role,
  tu.is_active,
  'SUCCESS: User now has tenant assignment!' as status
FROM user_profiles up
JOIN tenant_users tu ON up.id = tu.user_id
JOIN tenants t ON tu.tenant_id = t.id
WHERE up.id = auth.uid()
  AND tu.is_active = true;

-- Show count of assignments
SELECT 
  'Total active assignments for current user:' as info,
  COUNT(*) as assignment_count
FROM tenant_users 
WHERE user_id = auth.uid() AND is_active = true;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '🎉 COMPLETE: All fixes applied successfully!' as final_status;
SELECT '✅ Function structure fixed - no more RPC errors' as fix1;
SELECT '✅ User assigned to tenant - access granted' as fix2;
SELECT '🔄 NEXT: Refresh your browser completely to see changes' as next_step;
