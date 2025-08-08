-- ADMIN USER CREATION FIX: Create confirmed users who can login immediately
-- This fixes the issue where admin-created users can't login due to email confirmation requirement
-- Run this in your Supabase SQL Editor

-- Create a function for super admins to create confirmed users
CREATE OR REPLACE FUNCTION create_confirmed_user(
  user_email TEXT,
  user_password TEXT,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'nurse'
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  current_user_role TEXT;
  hashed_password TEXT;
BEGIN
  -- Get current user's role for permission check
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  -- Only super admins can create confirmed users
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can create confirmed users';
  END IF;

  -- Validate email format
  IF user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', user_email;
  END IF;

  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'User with email % already exists', user_email;
  END IF;

  -- Generate UUID for new user
  new_user_id := gen_random_uuid();

  -- Hash the password (using Supabase's built-in function if available, otherwise plain text with warning)
  -- Note: In production, you should use proper password hashing
  hashed_password := user_password; -- This is a simplified approach

  -- Insert into auth.users with confirmed email
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    new_user_id,
    user_email,
    crypt(user_password, gen_salt('bf')), -- Use bcrypt for password hashing
    NOW(), -- Email is confirmed immediately
    NOW(),
    NOW(),
    jsonb_build_object(
      'first_name', COALESCE(first_name, 'User'),
      'last_name', COALESCE(last_name, 'Name')
    ),
    false,
    'authenticated'
  );

  -- Create user profile
  INSERT INTO user_profiles (
    id,
    email,
    role,
    first_name,
    last_name,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_email,
    user_role,
    COALESCE(first_name, 'User'),
    COALESCE(last_name, 'Name'),
    true,
    NOW(),
    NOW()
  );

  RETURN QUERY
  SELECT 
    new_user_id,
    user_email,
    'User created successfully and can login immediately'::TEXT;

  RAISE NOTICE 'Created confirmed user: % with ID: %', user_email, new_user_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE NOTICE 'Error creating user %: %', user_email, SQLERRM;
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users (function will check for super_admin role)
GRANT EXECUTE ON FUNCTION create_confirmed_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Alternative simpler approach: Create a function to mark existing users as confirmed
CREATE OR REPLACE FUNCTION confirm_user_email(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role for permission check
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  -- Only super admins can confirm user emails
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can confirm user emails';
  END IF;

  -- Update the user to be confirmed
  UPDATE auth.users 
  SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = target_user_id
    AND email_confirmed_at IS NULL;

  IF FOUND THEN
    RAISE NOTICE 'User % email confirmed successfully', target_user_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'User % not found or already confirmed', target_user_id;
    RETURN FALSE;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION confirm_user_email(UUID) TO authenticated;

SELECT 'User creation functions created successfully!' as status;
SELECT 'Users created by admins will now be able to login immediately' as message;
