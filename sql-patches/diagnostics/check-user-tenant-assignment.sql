-- DIAGNOSTIC: Check user tenant assignment status
-- Run this to see why admin user is getting "not assigned to any organization" error

-- Step 1: Check current user's profile and role
SELECT 'CURRENT USER PROFILE:' as section;
SELECT 
  id,
  email,
  role,
  first_name,
  last_name,
  is_active,
  created_at
FROM user_profiles 
WHERE id = auth.uid();

-- Step 2: Check tenant assignments for current user
SELECT 'CURRENT USER TENANT ASSIGNMENTS:' as section;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role as tenant_role,
  tu.is_active,
  t.name as tenant_name,
  t.subdomain,
  tu.created_at,
  tu.updated_at
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid();

-- Step 3: Check all tenant users to see the pattern
SELECT 'ALL TENANT USER ASSIGNMENTS:' as section;
SELECT 
  tu.user_id,
  up.email,
  up.role as user_role,
  tu.tenant_id,
  t.name as tenant_name,
  tu.role as tenant_role,
  tu.is_active,
  tu.created_at
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
ORDER BY up.email, t.name;

-- Step 4: Check if there are any users without tenant assignments
SELECT 'USERS WITHOUT TENANT ASSIGNMENTS:' as section;
SELECT 
  up.id,
  up.email,
  up.role,
  up.is_active,
  CASE 
    WHEN up.role = 'super_admin' THEN 'Super Admin - No Assignment Needed'
    ELSE 'NEEDS TENANT ASSIGNMENT'
  END as status
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
WHERE tu.user_id IS NULL
  AND up.is_active = true
ORDER BY up.role, up.email;

-- Step 5: Quick fix - assign current user to first available tenant if they're not a super admin
DO $$
DECLARE
  current_user_role TEXT;
  current_user_id UUID := auth.uid();
  first_tenant_id UUID;
  assignment_exists BOOLEAN;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = current_user_id;
  
  -- Check if user already has a tenant assignment
  SELECT EXISTS(
    SELECT 1 FROM tenant_users 
    WHERE user_id = current_user_id AND is_active = true
  ) INTO assignment_exists;
  
  -- If user is not super admin and has no tenant assignment, assign to first tenant
  IF current_user_role != 'super_admin' AND NOT assignment_exists THEN
    -- Get first available tenant
    SELECT id INTO first_tenant_id
    FROM tenants 
    WHERE status = 'active'
    ORDER BY created_at
    LIMIT 1;
    
    IF first_tenant_id IS NOT NULL THEN
      -- Assign user to tenant
      INSERT INTO tenant_users (
        user_id,
        tenant_id,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        current_user_id,
        first_tenant_id,
        COALESCE(current_user_role, 'nurse'),
        true,
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Auto-assigned current user to tenant: %', first_tenant_id;
    ELSE
      RAISE NOTICE 'No active tenants found for assignment';
    END IF;
  ELSE
    RAISE NOTICE 'User already has tenant assignment or is super admin';
  END IF;
END $$;

-- Step 6: Verify the assignment worked
SELECT 'VERIFICATION - CURRENT USER AFTER FIX:' as section;
SELECT 
  up.email,
  up.role as user_role,
  tu.tenant_id,
  t.name as tenant_name,
  tu.role as tenant_role,
  tu.is_active
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
LEFT JOIN tenants t ON tu.tenant_id = t.id
WHERE up.id = auth.uid();
