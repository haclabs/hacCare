-- Quick fix to add missing assign_user_to_tenant function to remote Supabase
-- Copy and paste this into your Supabase SQL Editor (https://app.supabase.com/project/YOUR_PROJECT/sql)

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS assign_user_to_tenant(uuid,uuid,text,text[]);
DROP FUNCTION IF EXISTS assign_user_to_tenant(uuid,uuid);
DROP FUNCTION IF EXISTS assign_user_to_tenant(uuid,uuid,text);

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
BEGIN
  -- Validate inputs
  IF tenant_id_param IS NULL OR user_id_param IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'tenant_id and user_id are required'
    );
  END IF;

  BEGIN
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

    -- Return success
    RETURN jsonb_build_object(
      'success', true,
      'tenant_id', tenant_id_param,
      'user_id', user_id_param,
      'role', user_role_param
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION assign_user_to_tenant TO authenticated;
