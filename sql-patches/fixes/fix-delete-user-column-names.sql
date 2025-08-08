-- CORRECTED Delete User Function - Fixed Column Names
-- This fixes the "created_by does not exist" error
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the incorrect function
DROP FUNCTION IF EXISTS delete_user_permanently(UUID) CASCADE;

-- Step 2: Create corrected function with actual column names from your schema
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
  
  -- Delete from all related tables using CORRECT column names
  
  -- 1. Delete from patient_medications (uses prescribed_by, not created_by)
  DELETE FROM patient_medications WHERE prescribed_by = target_user_id;
  
  -- 2. Delete from patient_notes (uses author_id, not created_by)
  DELETE FROM patient_notes WHERE author_id = target_user_id;
  
  -- 3. Delete from patient_vitals (uses recorded_by)
  DELETE FROM patient_vitals WHERE recorded_by = target_user_id;
  
  -- 4. Delete from patient_images (only if this table exists and has the right column)
  -- Skip this for now since we haven't seen the schema
  
  -- 5. Delete from medication_administrations (uses administered_by_id)
  DELETE FROM medication_administrations WHERE administered_by_id = target_user_id::TEXT;
  
  -- 6. Delete from patient_alerts (uses acknowledged_by)
  DELETE FROM patient_alerts WHERE acknowledged_by = target_user_id;
  
  -- 7. Delete from tenant_users (user's tenant associations)
  DELETE FROM tenant_users WHERE user_id = target_user_id;
  
  -- 8. Update tenants table to remove user as admin if they were admin
  UPDATE tenants SET admin_user_id = NULL WHERE admin_user_id = target_user_id;
  
  -- 9. Finally delete from user_profiles
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Log the deletion
  RAISE NOTICE 'User % (%) permanently deleted by %', user_email, target_user_id, auth.uid();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_user_permanently(UUID) TO authenticated;

-- Step 4: Test the function exists with correct signature
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'delete_user_permanently';
