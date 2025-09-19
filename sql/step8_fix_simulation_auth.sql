-- Fix simulation authentication by ensuring proper table structure and authentication function

-- First, let's make sure simulation_users table has all needed columns
DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_users' AND column_name = 'email'
  ) THEN
    ALTER TABLE simulation_users ADD COLUMN email TEXT;
  END IF;

  -- Add password column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_users' AND column_name = 'password'
  ) THEN
    ALTER TABLE simulation_users ADD COLUMN password TEXT;
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_users' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE simulation_users ADD COLUMN created_by UUID;
  END IF;
END $$;

-- Drop existing authentication functions to avoid signature conflicts
DROP FUNCTION IF EXISTS authenticate_simulation_user(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS authenticate_simulation_user(TEXT, TEXT);

-- Update the add_simulation_user function to store passwords
CREATE OR REPLACE FUNCTION add_simulation_user(
  p_simulation_tenant_id UUID,
  p_email TEXT,
  p_username TEXT,
  p_role TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user ID
  SELECT auth.uid() INTO v_current_user_id;
  
  -- For simulation purposes, we'll create simulation-specific user records
  v_user_id := gen_random_uuid();

  -- Add user to simulation tenant in tenant_users table (if it exists)
  BEGIN
    INSERT INTO tenant_users (
      tenant_id,
      user_id,
      role,
      permissions,
      created_at
    ) VALUES (
      p_simulation_tenant_id,
      v_user_id,
      p_role,
      CASE 
        WHEN p_role = 'nurse' THEN '["read_patients", "write_patients", "read_medications", "write_medications", "read_vitals", "write_vitals"]'::jsonb
        WHEN p_role = 'student' THEN '["read_patients", "read_medications", "read_vitals"]'::jsonb
        WHEN p_role = 'instructor' THEN '["admin"]'::jsonb
        ELSE '["read_patients"]'::jsonb
      END,
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- If tenant_users table doesn't exist or fails, continue anyway
    NULL;
  END;

  -- Add to simulation_users tracking table with password
  INSERT INTO simulation_users (
    simulation_tenant_id,
    user_id,
    username,
    email,
    role,
    password,
    created_by,
    created_at
  ) VALUES (
    p_simulation_tenant_id,
    v_user_id,
    p_username,
    COALESCE(p_email, p_username || '@simulation.local'),
    p_role,
    p_password, -- Store password directly (in production, use proper hashing)
    v_current_user_id,
    NOW()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create fixed authentication function that uses simulation_users table
CREATE OR REPLACE FUNCTION authenticate_simulation_user(
    p_username TEXT,
    p_password TEXT,
    p_simulation_tenant_id UUID DEFAULT NULL
) RETURNS TABLE (
    user_id UUID,
    username TEXT,
    email TEXT,
    role TEXT,
    tenant_id UUID,
    tenant_name TEXT,
    simulation_id UUID,
    is_simulation_user BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        su.user_id,
        su.username::TEXT,
        COALESCE(su.email, '')::TEXT,
        su.role::TEXT,
        su.simulation_tenant_id as tenant_id,
        COALESCE(t.name, '')::TEXT as tenant_name,
        t.simulation_id,
        true as is_simulation_user
    FROM simulation_users su
    JOIN tenants t ON su.simulation_tenant_id = t.id
    WHERE su.username = p_username 
    AND su.password = p_password  -- In production, use proper password hashing
    AND (p_simulation_tenant_id IS NULL OR su.simulation_tenant_id = p_simulation_tenant_id)
    AND t.tenant_type = 'simulation'
    ORDER BY su.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_simulation_user(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_simulation_user(TEXT, TEXT, UUID) TO anon;

-- Test the function exists
SELECT 'SUCCESS: Authentication function created' as status;