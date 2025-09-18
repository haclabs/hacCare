-- ============================================
-- PART 2: CREATE SIMULATION USER FUNCTION
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Function to add users to simulation
CREATE OR REPLACE FUNCTION add_simulation_user(
  p_simulation_tenant_id UUID,
  p_email TEXT,
  p_username TEXT,
  p_role TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create auth user if password provided, otherwise assume user exists
  IF p_password IS NOT NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW()
    ) RETURNING id INTO v_user_id;
  ELSE
    -- Find existing user by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'User with email % not found', p_email;
    END IF;
  END IF;

  -- Add user to simulation tenant
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

  -- Add to simulation_users tracking table
  INSERT INTO simulation_users (
    simulation_tenant_id,
    user_id,
    username,
    role
  ) VALUES (
    p_simulation_tenant_id,
    v_user_id,
    p_username,
    p_role
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;