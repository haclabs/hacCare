-- Fix missing deactivate_user function
-- This ensures the function exists with the correct parameter name that the frontend expects
-- Run this in your Supabase SQL Editor

-- Step 1: Check if function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'deactivate_user';

-- Step 2: Drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS deactivate_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS deactivate_user(user_uuid UUID) CASCADE;
DROP FUNCTION IF EXISTS deactivate_user(target_user_id UUID) CASCADE;

-- Step 3: Create the function with the exact parameter name the frontend expects
CREATE OR REPLACE FUNCTION deactivate_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins can deactivate users
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can deactivate users';
  END IF;
  
  -- Deactivate in user_profiles
  UPDATE user_profiles 
  SET is_active = false, updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Deactivate in tenant_users 
  UPDATE tenant_users 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create permanently_delete_user function as well (for completeness)
CREATE OR REPLACE FUNCTION permanently_delete_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins can permanently delete users
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can permanently delete users';
  END IF;
  
  -- Delete from tenant_users first (foreign key constraint)
  DELETE FROM tenant_users WHERE user_id = target_user_id;
  
  -- Delete from user_profiles
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Note: This doesn't delete from Supabase Auth - that requires service role
  -- The Auth user will remain but won't be able to access the app
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION deactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION permanently_delete_user(UUID) TO authenticated;

-- Step 6: Verify the functions are created correctly
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('deactivate_user', 'permanently_delete_user')
ORDER BY proname;
