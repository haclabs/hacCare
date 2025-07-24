-- Fix missing assign_user_to_tenant function for remote Supabase
-- Run this directly in your Supabase SQL Editor

-- 1. CREATE ASSIGN_USER_TO_TENANT FUNCTION
CREATE OR REPLACE FUNCTION assign_user_to_tenant(
  tenant_id_param UUID,
  user_id_param UUID,
  user_role_param TEXT DEFAULT 'nurse',
  user_permissions_param TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_data JSONB;
  retry_count INTEGER := 0;
  max_retries INTEGER := 3;
  tenant_exists BOOLEAN;
  user_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF tenant_id_param IS NULL OR user_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'tenant_id and user_id are required'
    );
  END IF;

  -- Retry loop for handling concurrent operations
  WHILE retry_count < max_retries LOOP
    BEGIN
      -- Check if tenant exists
      SELECT EXISTS(SELECT 1 FROM tenants WHERE id = tenant_id_param) INTO tenant_exists;
      IF NOT tenant_exists THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Tenant not found'
        );
      END IF;

      -- Check if user exists in auth.users
      SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id_param) INTO user_exists;
      IF NOT user_exists THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'User not found'
        );
      END IF;

      -- Insert or update tenant_users assignment
      INSERT INTO tenant_users (
        tenant_id,
        user_id,
        role,
        permissions,
        created_at,
        updated_at
      ) VALUES (
        tenant_id_param,
        user_id_param,
        user_role_param,
        user_permissions_param,
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, user_id) 
      DO UPDATE SET
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        updated_at = NOW();

      -- Success - return result
      SELECT jsonb_build_object(
        'success', true,
        'tenant_id', tenant_id_param,
        'user_id', user_id_param,
        'role', user_role_param,
        'permissions', user_permissions_param
      ) INTO result_data;

      RETURN result_data;

    EXCEPTION
      WHEN unique_violation THEN
        retry_count := retry_count + 1;
        IF retry_count >= max_retries THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to assign user after multiple retries'
          );
        END IF;
        -- Small delay before retry
        PERFORM pg_sleep(0.1 * retry_count);
        CONTINUE;
      
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', SQLERRM
        );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Maximum retries exceeded'
  );
END;
$$;

-- 2. CREATE HELPER FUNCTION TO FIND USERS BY EMAIL
CREATE OR REPLACE FUNCTION find_user_by_email(email_param TEXT)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    COALESCE(p.first_name || ' ' || p.last_name, au.email::TEXT) as full_name
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE au.email ILIKE email_param
  AND au.deleted_at IS NULL;
END;
$$;

-- 3. CREATE FUNCTION TO GET AVAILABLE ADMINS
CREATE OR REPLACE FUNCTION get_available_admins()
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    COALESCE(p.first_name || ' ' || p.last_name, au.email::TEXT) as full_name,
    COALESCE(p.role::TEXT, 'user') as role
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE au.deleted_at IS NULL
  AND (p.role IN ('admin', 'super_admin') OR p.role IS NULL)
  ORDER BY p.role DESC, au.email;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION assign_user_to_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION find_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_admins TO authenticated;
