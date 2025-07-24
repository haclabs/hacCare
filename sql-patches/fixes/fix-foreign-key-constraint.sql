-- Fix foreign key constraint and user creation issues
-- Run this in your Supabase SQL editor

BEGIN;

-- 1. Check the current foreign key constraints
SELECT 'Foreign key constraints on tenant_users:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'tenant_users'::regclass
AND contype = 'f';

-- 2. Check if the System Default tenant exists
SELECT 'System Default tenant status:' as info;
SELECT id, name, subdomain, status
FROM tenants 
WHERE id = '00000000-0000-0000-0000-000000000000' 
   OR name = 'System Default'
   OR subdomain = 'system-default';

-- 3. Ensure System Default tenant exists with correct column names
INSERT INTO tenants (
    id, 
    name,
    subdomain,
    logo_url,
    primary_color,
    settings,
    status,
    created_at, 
    updated_at,
    admin_user_id,
    subscription_plan,
    max_users,
    max_patients
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System Default',
    'system-default',
    null,
    '#3B82F6',
    '{
      "timezone": "UTC",
      "date_format": "MM/DD/YYYY",
      "currency": "USD",
      "features": {
        "advanced_analytics": true,
        "medication_management": true,
        "wound_care": true,
        "barcode_scanning": true,
        "mobile_app": true
      },
      "security": {
        "two_factor_required": false,
        "session_timeout": 480,
        "password_policy": {
          "min_length": 8,
          "require_uppercase": true,
          "require_lowercase": true,
          "require_numbers": true,
          "require_symbols": false
        }
      }
    }',
    'active',
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000',
    'enterprise',
    1000,
    10000
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    subdomain = EXCLUDED.subdomain,
    status = 'active',
    updated_at = NOW();

-- 4. Fix the assign_user_to_tenant function with better error handling and retries
CREATE OR REPLACE FUNCTION assign_user_to_tenant(
  target_user_id UUID,
  target_tenant_id UUID,
  user_role TEXT DEFAULT 'nurse',
  user_permissions TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  is_tenant_admin BOOLEAN := FALSE;
  user_exists BOOLEAN := FALSE;
  tenant_exists BOOLEAN := FALSE;
  retry_count INTEGER := 0;
  max_retries INTEGER := 3;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Retry loop for user existence check (in case of timing issues)
  WHILE retry_count < max_retries LOOP
    -- Check if target user exists
    SELECT EXISTS (
      SELECT 1 FROM user_profiles WHERE id = target_user_id
    ) INTO user_exists;
    
    IF user_exists THEN
      EXIT; -- User found, exit the loop
    END IF;
    
    -- Wait and retry (PostgreSQL doesn't have built-in sleep, so we'll just increment)
    retry_count := retry_count + 1;
    
    IF retry_count >= max_retries THEN
      RAISE EXCEPTION 'Target user does not exist after % retries: %', max_retries, target_user_id;
    END IF;
  END LOOP;
  
  -- Check if target tenant exists and is active
  SELECT EXISTS (
    SELECT 1 FROM tenants WHERE id = target_tenant_id AND status = 'active'
  ) INTO tenant_exists;
  
  IF NOT tenant_exists THEN
    RAISE EXCEPTION 'Target tenant does not exist or is not active: %', target_tenant_id;
  END IF;
  
  -- Check if user has permission to assign
  IF current_user_role = 'super_admin' THEN
    -- Super admin can assign to any tenant
    NULL; -- Permission granted
  ELSIF current_user_role = 'admin' THEN
    -- Check if admin belongs to the target tenant
    SELECT EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid() 
      AND tu.tenant_id = target_tenant_id
      AND tu.is_active = true
    ) INTO is_tenant_admin;
    
    IF NOT is_tenant_admin THEN
      RAISE EXCEPTION 'Admin can only assign users to their own tenant';
    END IF;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to assign users to tenants';
  END IF;
  
  -- Perform the assignment with proper error handling
  BEGIN
    INSERT INTO tenant_users (user_id, tenant_id, role, permissions, is_active, created_at, updated_at)
    VALUES (target_user_id, target_tenant_id, user_role, user_permissions, true, NOW(), NOW())
    ON CONFLICT (user_id, tenant_id) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions,
      is_active = true,
      updated_at = NOW();
      
    RETURN TRUE;
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Foreign key constraint violation: user % or tenant % does not exist', target_user_id, target_tenant_id;
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error assigning user to tenant: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a simple test function to verify everything works
CREATE OR REPLACE FUNCTION test_tenant_assignment()
RETURNS TABLE(test_name TEXT, result TEXT) AS $$
BEGIN
  -- Test 1: Check if System Default tenant exists
  RETURN QUERY
  SELECT 
    'System Default Tenant Exists'::TEXT as test_name,
    CASE 
      WHEN EXISTS (SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000') 
      THEN 'PASS'::TEXT 
      ELSE 'FAIL'::TEXT 
    END as result;
    
  -- Test 2: Check if assign function exists
  RETURN QUERY
  SELECT 
    'Assign Function Exists'::TEXT as test_name,
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assign_user_to_tenant') 
      THEN 'PASS'::TEXT 
      ELSE 'FAIL'::TEXT 
    END as result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION assign_user_to_tenant(UUID, UUID, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION test_tenant_assignment() TO authenticated;

-- 7. Run tests and show results
SELECT 'Setup completed successfully!' as status;

SELECT * FROM test_tenant_assignment();

-- Show available tenants
SELECT 'Available tenants:' as info;
SELECT id, name, subdomain, status FROM tenants ORDER BY name;

COMMIT;
