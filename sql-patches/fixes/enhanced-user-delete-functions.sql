-- Enhanced User Management with Deactivate AND Permanent Delete
-- This provides both soft delete (deactivate) and hard delete (permanent removal)
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing functions to recreate them
DROP FUNCTION IF EXISTS deactivate_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS permanently_delete_user(UUID) CASCADE;
DROP FUNCTION IF EXISTS delete_user_permanently(UUID) CASCADE;

-- Step 2: Create DEACTIVATE function (soft delete)
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

-- Step 3: Create PERMANENT DELETE function (hard delete)
CREATE OR REPLACE FUNCTION delete_user_permanently(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  user_email TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins can permanently delete users
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can permanently delete users';
  END IF;
  
  -- Get user email for logging
  SELECT email INTO user_email
  FROM user_profiles
  WHERE id = target_user_id;
  
  -- Prevent deleting yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  
  -- Delete from all related tables in correct order (foreign key constraints)
  
  -- 1. Delete from patient_medications (if user created any)
  DELETE FROM patient_medications WHERE created_by = target_user_id;
  
  -- 2. Delete from patient_notes (if user created any)
  DELETE FROM patient_notes WHERE created_by = target_user_id;
  
  -- 3. Delete from patient_vitals (if user recorded any)
  DELETE FROM patient_vitals WHERE recorded_by = target_user_id;
  
  -- 4. Delete from patient_images (if user uploaded any)
  DELETE FROM patient_images WHERE uploaded_by = target_user_id;
  
  -- 5. Delete from medication_administrations (if user administered any)
  DELETE FROM medication_administrations WHERE administered_by = target_user_id;
  
  -- 6. Delete from alerts (if user created any)
  DELETE FROM alerts WHERE created_by = target_user_id;
  
  -- 7. Delete from tenant_users (user's tenant associations)
  DELETE FROM tenant_users WHERE user_id = target_user_id;
  
  -- 8. Update tenants table to remove user as admin if they were admin
  UPDATE tenants SET admin_user_id = NULL WHERE admin_user_id = target_user_id;
  
  -- 9. Finally delete from user_profiles
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Log the deletion (you could create an audit table for this)
  RAISE NOTICE 'User % (%) permanently deleted by %', user_email, target_user_id, auth.uid();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create helper function to reactivate users
CREATE OR REPLACE FUNCTION reactivate_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins can reactivate users
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can reactivate users';
  END IF;
  
  -- Reactivate in user_profiles
  UPDATE user_profiles 
  SET is_active = true, updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Reactivate in tenant_users 
  UPDATE tenant_users 
  SET is_active = true, updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION deactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_permanently(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_user(UUID) TO authenticated;

-- Step 6: Verify all functions exist
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('deactivate_user', 'delete_user_permanently', 'reactivate_user')
ORDER BY proname;
