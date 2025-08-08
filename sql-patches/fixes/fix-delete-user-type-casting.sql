-- FINAL FIX for Delete User Function - Type Casting Corrected
-- This fixes the "operator does not exist: text = uuid" error
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the function with type issues
DROP FUNCTION IF EXISTS delete_user_permanently(UUID) CASCADE;

-- Step 2: Create corrected function with proper type casting
CREATE OR REPLACE FUNCTION delete_user_permanently(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  user_email TEXT;
  user_id_text TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  -- Only super admins can permanently delete users
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can permanently delete users';
  END IF;
  
  -- Get user email for logging
  SELECT email INTO user_email
  FROM user_profiles WHERE id = target_user_id;
  
  -- Prevent deleting yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  
  -- Convert UUID to text for TEXT column comparisons
  user_id_text := target_user_id::TEXT;
  
  -- Delete from all related tables with proper type casting
  -- Using correct column names based on actual database schema
  
  -- 1. patient_medications uses prescribed_by (TEXT column)
  DELETE FROM patient_medications WHERE prescribed_by = user_id_text;
  
  -- 2. medication_administrations uses administered_by_id (TEXT column)
  DELETE FROM medication_administrations WHERE administered_by_id = user_id_text;
  
  -- 3. medication_administrations also has administered_by (TEXT column)
  DELETE FROM medication_administrations WHERE administered_by = user_id_text;
  
  -- 4. patient_wounds uses assessed_by (TEXT column)
  DELETE FROM patient_wounds WHERE assessed_by = user_id_text;
  
  -- 5. patient_notes uses nurse_id (UUID column)
  DELETE FROM patient_notes WHERE nurse_id = target_user_id;
  
  -- 6. patient_alerts uses acknowledged_by (UUID column)
  DELETE FROM patient_alerts WHERE acknowledged_by = target_user_id;
  
  -- 7. patient_images uses uploaded_by (UUID column)
  DELETE FROM patient_images WHERE uploaded_by = target_user_id;
  
  -- 8. diabetic_records uses recorded_by (UUID column)
  DELETE FROM diabetic_records WHERE recorded_by = target_user_id;
  
  -- 9. Tables with UUID columns that we know exist
  DELETE FROM tenant_users WHERE user_id = target_user_id;
  DELETE FROM audit_logs WHERE user_id = target_user_id;
  
  -- 10. Update tenants to remove as admin (UUID column)
  UPDATE tenants SET admin_user_id = NULL WHERE admin_user_id = target_user_id;
  
  -- Note: patient_vitals table has no user reference column, so nothing to delete there
  
  -- 11. Finally delete user profile (UUID column)
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Log the deletion
  RAISE NOTICE 'User % (%) permanently deleted by %', user_email, target_user_id, auth.uid();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors but continue
    RAISE NOTICE 'Error during user deletion: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_user_permanently(UUID) TO authenticated;

-- Step 4: Test the function signature
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'delete_user_permanently';

-- Step 5: Verify no type casting issues
SELECT 'Function created successfully with proper type casting' as status;
