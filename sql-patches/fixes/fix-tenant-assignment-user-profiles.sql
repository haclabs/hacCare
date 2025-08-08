-- FIXED: Tenant Assignment Function - Check user_profiles instead of profiles
-- This fixes the "User with ID does not exist" error during tenant assignment
-- Run this in your Supabase SQL Editor

-- Drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID);

-- Drop existing get_user_current_tenant function with different return types
DROP FUNCTION IF EXISTS get_user_current_tenant(UUID);
DROP FUNCTION IF EXISTS get_user_current_tenant(target_user_id UUID);

-- Create the corrected function that checks user_profiles instead of profiles
CREATE OR REPLACE FUNCTION assign_user_to_tenant(
  user_id_param UUID,
  tenant_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_record_count INTEGER;
  user_role TEXT;
BEGIN
  -- Check if user exists in user_profiles (not profiles!)
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = user_id_param) THEN
    RAISE EXCEPTION 'User with ID % does not exist', user_id_param;
  END IF;

  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id_param) THEN
    RAISE EXCEPTION 'Tenant with ID % does not exist', tenant_id_param;
  END IF;

  -- Get user's role from user_profiles
  SELECT role INTO user_role
  FROM user_profiles WHERE id = user_id_param;

  -- Check if user is already assigned to this tenant
  SELECT COUNT(*) INTO existing_record_count
  FROM tenant_users 
  WHERE user_id = user_id_param AND tenant_id = tenant_id_param AND is_active = true;

  IF existing_record_count > 0 THEN
    -- User is already assigned to this tenant, just return success
    RAISE NOTICE 'User % is already assigned to tenant %', user_id_param, tenant_id_param;
    RETURN;
  END IF;

  -- Deactivate any existing tenant assignments for this user
  UPDATE tenant_users 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = user_id_param AND is_active = true;

  -- Check if there's an inactive record we can reactivate
  UPDATE tenant_users 
  SET is_active = true, updated_at = NOW()
  WHERE user_id = user_id_param AND tenant_id = tenant_id_param AND is_active = false;

  -- Get the count of affected rows
  GET DIAGNOSTICS existing_record_count = ROW_COUNT;

  IF existing_record_count = 0 THEN
    -- Create new tenant assignment with user's current role
    INSERT INTO tenant_users (
      id,
      user_id, 
      tenant_id, 
      role, 
      permissions,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      user_id_param, 
      tenant_id_param, 
      COALESCE(user_role, 'nurse'), -- Use user's role or default to nurse
      ARRAY['patients:read', 'patients:write', 'alerts:read', 'alerts:write']::TEXT[], -- Default permissions
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'User % assigned to tenant % with role %', user_id_param, tenant_id_param, COALESCE(user_role, 'nurse');
  ELSE
    RAISE NOTICE 'Reactivated existing assignment for user % to tenant %', user_id_param, tenant_id_param;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_user_to_tenant(UUID, UUID) TO authenticated;

-- Drop any existing get_user_current_tenant functions with different signatures
DROP FUNCTION IF EXISTS get_user_current_tenant(UUID);
DROP FUNCTION IF EXISTS get_user_current_tenant(target_user_id UUID);

-- Create helper function to get user's current tenant (using user_profiles)
CREATE OR REPLACE FUNCTION get_user_current_tenant(target_user_id UUID)
RETURNS TABLE(
  tenant_id UUID,
  tenant_name TEXT,
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
    tu.tenant_id,
    t.name as tenant_name,
    tu.role as user_role,
    tu.is_active
  FROM tenant_users tu
  JOIN tenants t ON tu.tenant_id = t.id
  WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
  ORDER BY tu.updated_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_current_tenant(UUID) TO authenticated;

-- Test the functions
SELECT 'Fixed tenant assignment function created successfully!' as status;

-- Verify the function signature
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosrc LIKE '%user_profiles%' as checks_user_profiles_table
FROM pg_proc 
WHERE proname = 'assign_user_to_tenant';
