-- Fixed version - Drop existing functions first
-- Copy and paste this into Supabase SQL Editor

-- Drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT, TEXT[]);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS assign_user_to_tenant(UUID, UUID);

-- Drop existing get_user_current_tenant function with any parameter names
DROP FUNCTION IF EXISTS get_user_current_tenant(uuid);
DROP FUNCTION IF EXISTS get_user_current_tenant(target_user_id uuid);

-- Create the function that matches what UserForm.tsx is calling
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
BEGIN
  -- Check if user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_param) THEN
    RAISE EXCEPTION 'User with ID % does not exist', user_id_param;
  END IF;

  -- Check if tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id_param) THEN
    RAISE EXCEPTION 'Tenant with ID % does not exist', tenant_id_param;
  END IF;

  -- Check if user is already assigned to this tenant
  SELECT COUNT(*) INTO existing_record_count
  FROM tenant_users 
  WHERE user_id = user_id_param AND tenant_id = tenant_id_param AND is_active = true;

  IF existing_record_count > 0 THEN
    -- User is already assigned to this tenant, just return success
    RETURN;
  END IF;

  -- Deactivate any existing tenant assignments for this user
  UPDATE tenant_users 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = user_id_param AND is_active = true;

  -- Check if there's an inactive record we can reactivate
  IF EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = user_id_param AND tenant_id = tenant_id_param AND is_active = false
  ) THEN
    -- Reactivate existing record
    UPDATE tenant_users 
    SET is_active = true, updated_at = NOW()
    WHERE user_id = user_id_param AND tenant_id = tenant_id_param;
  ELSE
    -- Create new tenant assignment
    INSERT INTO tenant_users (
      id,
      user_id, 
      tenant_id, 
      role, 
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      user_id_param, 
      tenant_id_param, 
      (SELECT role FROM profiles WHERE id = user_id_param), -- Use role from profiles
      true,
      NOW(),
      NOW()
    );
  END IF;

  -- Log the assignment
  RAISE NOTICE 'User % assigned to tenant %', user_id_param, tenant_id_param;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_user_to_tenant(UUID, UUID) TO authenticated;

-- Create helper function to get user's current tenant (for the UI)
-- Using the same parameter name as the existing function
CREATE OR REPLACE FUNCTION get_user_current_tenant(target_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_users 
  WHERE user_id = target_user_id AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_user_current_tenant(UUID) TO authenticated;
