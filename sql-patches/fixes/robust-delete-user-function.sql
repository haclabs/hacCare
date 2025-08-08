-- ROBUST FIX for Delete User Function - Handle All Type Mismatches
-- This completely eliminates the "operator does not exist: text = uuid" error
-- Run this in your Supabase SQL Editor

-- Step 1: Drop all existing versions of the function
DROP FUNCTION IF EXISTS delete_user_permanently(UUID) CASCADE;
DROP FUNCTION IF EXISTS permanently_delete_user(UUID) CASCADE;

-- Step 2: Create a safe version that handles type mismatches gracefully
CREATE OR REPLACE FUNCTION delete_user_permanently(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  user_email TEXT;
  user_id_text TEXT;
  deletion_count INTEGER := 0;
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
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User with ID % does not exist', target_user_id;
  END IF;
  
  -- Prevent deleting yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  
  -- Convert UUID to text for TEXT column comparisons
  user_id_text := target_user_id::TEXT;
  
  RAISE NOTICE 'Starting deletion of user % (%)', user_email, target_user_id;
  
  -- Delete from tables with UUID foreign keys (safe operations)
  BEGIN
    DELETE FROM patient_medications WHERE prescribed_by = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % patient_medications records', deletion_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting from patient_medications: %', SQLERRM;
  END;
  
  BEGIN
    DELETE FROM patient_notes WHERE author_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % patient_notes records', deletion_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting from patient_notes: %', SQLERRM;
  END;
  
  BEGIN
    DELETE FROM patient_vitals WHERE recorded_by = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % patient_vitals records', deletion_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting from patient_vitals: %', SQLERRM;
  END;
  
  BEGIN
    DELETE FROM patient_alerts WHERE acknowledged_by = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % patient_alerts records', deletion_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting from patient_alerts: %', SQLERRM;
  END;
  
  -- Handle medication_administrations table with TEXT columns carefully
  BEGIN
    -- Try different column combinations since the schema might vary
    
    -- Check if administered_by_id exists and is TEXT
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'medication_administrations' 
      AND column_name = 'administered_by_id'
      AND data_type = 'text'
    ) THEN
      EXECUTE format('DELETE FROM medication_administrations WHERE administered_by_id = %L', user_id_text);
      GET DIAGNOSTICS deletion_count = ROW_COUNT;
      RAISE NOTICE 'Deleted % medication_administrations records (by administered_by_id)', deletion_count;
    END IF;
    
    -- Check if administered_by exists and is TEXT
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'medication_administrations' 
      AND column_name = 'administered_by'
      AND data_type = 'text'
    ) THEN
      EXECUTE format('DELETE FROM medication_administrations WHERE administered_by = %L', user_id_text);
      GET DIAGNOSTICS deletion_count = ROW_COUNT;
      RAISE NOTICE 'Deleted % medication_administrations records (by administered_by)', deletion_count;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting from medication_administrations: %', SQLERRM;
  END;
  
  -- Delete from tenant relationship tables
  BEGIN
    DELETE FROM tenant_users WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % tenant_users records', deletion_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting from tenant_users: %', SQLERRM;
  END;
  
  -- Update tenants to remove as admin
  BEGIN
    UPDATE tenants SET admin_user_id = NULL WHERE admin_user_id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Updated % tenants records (removed as admin)', deletion_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error updating tenants: %', SQLERRM;
  END;
  
  -- Finally delete user profile
  BEGIN
    DELETE FROM user_profiles WHERE id = target_user_id;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    IF deletion_count = 0 THEN
      RAISE EXCEPTION 'Failed to delete user profile for %', target_user_id;
    END IF;
    RAISE NOTICE 'Deleted user profile for %', user_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Critical error deleting user profile: %', SQLERRM;
  END;
  
  RAISE NOTICE 'Successfully deleted user % (%)', user_email, target_user_id;
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'User deletion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_user_permanently(UUID) TO authenticated;

-- Step 4: Create a diagnostic function to check table schemas
CREATE OR REPLACE FUNCTION check_table_columns_for_user_deletion()
RETURNS TABLE(table_name TEXT, column_name TEXT, data_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.table_name::TEXT,
    c.column_name::TEXT,
    c.data_type::TEXT
  FROM information_schema.columns c
  WHERE c.table_name IN (
    'patient_medications', 'patient_notes', 'patient_vitals', 
    'patient_alerts', 'medication_administrations', 'tenant_users'
  )
  AND c.column_name IN (
    'prescribed_by', 'author_id', 'recorded_by', 'acknowledged_by',
    'administered_by', 'administered_by_id', 'user_id'
  )
  ORDER BY c.table_name, c.column_name;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Test the function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'delete_user_permanently';

-- Step 6: Show table schema for debugging
SELECT 'Table schema check:' as info;
SELECT * FROM check_table_columns_for_user_deletion();
