-- QUICK FIX: Assign current user to tenant
-- Run this SQL script to fix the "not assigned to any organization" error

-- Step 1: Identify the problem
SELECT 'DIAGNOSING TENANT ASSIGNMENT ISSUE:' as section;

-- Check current user details
SELECT 
  'Current User:' as info,
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
  tu.tenant_id,
  t.name as tenant_name,
  tu.role as tenant_role,
  tu.is_active
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid();

-- Step 2: Show available tenants
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

-- Step 3: Quick fix function to assign user to a tenant
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
    RETURN 'ERROR: Tenant not found';
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
      COALESCE(current_user_role, 'admin'), -- Default to admin for tenant assignment
      true,
      NOW(),
      NOW()
    );
    
    RETURN 'SUCCESS: Created new assignment to ' || tenant_name;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Step 4: Auto-assign to first available tenant (uncomment the tenant ID you want)
-- Replace 'YOUR-TENANT-ID-HERE' with the actual tenant ID from the list above

-- Example usage (uncomment and replace with actual tenant ID):
-- SELECT assign_current_user_to_tenant('YOUR-TENANT-ID-HERE'::UUID) as result;

-- Or auto-assign to the first active tenant:
DO $$
DECLARE
  first_tenant_id UUID;
  result_message TEXT;
BEGIN
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
END $$;

-- Step 5: Verify the fix
SELECT 'VERIFICATION AFTER FIX:' as section;
SELECT 
  up.email,
  up.role as user_role,
  tu.tenant_id,
  t.name as tenant_name,
  tu.role as tenant_role,
  tu.is_active,
  'Assignment successful - you should now have access to alerts!' as status
FROM user_profiles up
JOIN tenant_users tu ON up.id = tu.user_id
JOIN tenants t ON tu.tenant_id = t.id
WHERE up.id = auth.uid()
  AND tu.is_active = true;

-- Final message
SELECT 'IMPORTANT: After running this script, refresh your browser to see the alerts!' as important_note;
