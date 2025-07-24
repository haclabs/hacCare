-- Fix user deletion and role constraint issues
-- Run this in your Supabase SQL editor
-- Updated to match actual database schema

BEGIN;

-- 1. First, let's check what roles exist and fix the constraint
-- Check current tenant_users role constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%role%' 
AND conrelid = 'tenant_users'::regclass;

-- 2. Drop the restrictive role constraint on tenant_users if it exists
ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_role_check;

-- 3. Add a more permissive role constraint that matches user_profiles
-- Note: super_admin users should NOT be in tenant_users table, they manage globally
ALTER TABLE tenant_users 
ADD CONSTRAINT tenant_users_role_check 
CHECK (role IN ('admin', 'doctor', 'nurse', 'viewer'));

-- 4. Create a function to safely deactivate users (soft delete approach)
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

-- 5. Create a function to permanently delete user data (super admin only)
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

-- 6. Create a function to clean up orphaned users (no tenant assignment)
CREATE OR REPLACE FUNCTION cleanup_orphaned_users()
RETURNS TABLE(cleaned_user_id UUID, email TEXT) AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins can run cleanup
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can cleanup orphaned users';
  END IF;
  
  -- Return users that have no tenant assignments
  RETURN QUERY
  SELECT 
    up.id as cleaned_user_id,
    up.email
  FROM user_profiles up
  LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
  WHERE tu.user_id IS NULL
  AND up.role != 'super_admin'; -- Don't clean up super admins
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to fix existing users with role mismatches
-- Super admins should NOT be in tenant_users table - they are global
CREATE OR REPLACE FUNCTION fix_user_role_mismatches()
RETURNS TABLE(fixed_user_id UUID, old_role TEXT, action_taken TEXT) AS $$
DECLARE
  current_user_role TEXT;
  super_admin_count INT;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Only super admins can fix role mismatches
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can fix role mismatches';
  END IF;
  
  -- Count super admins in tenant_users before removal
  SELECT COUNT(*) INTO super_admin_count
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE up.role = 'super_admin';
  
  -- Remove super_admin users from tenant_users table
  -- Super admins should manage globally, not be in specific tenants
  DELETE FROM tenant_users 
  WHERE user_id IN (
    SELECT id FROM user_profiles WHERE role = 'super_admin'
  );
  
  -- Return info about removed super admins
  RETURN QUERY
  SELECT 
    up.id as fixed_user_id,
    up.role as old_role,
    ('Removed from tenant_users table (super admins are global)')::TEXT as action_taken
  FROM user_profiles up
  WHERE up.role = 'super_admin'
  LIMIT super_admin_count;
  
  -- Fix users with invalid roles in user_profiles
  UPDATE user_profiles 
  SET role = 'nurse', updated_at = NOW()
  WHERE role NOT IN ('super_admin', 'admin', 'doctor', 'nurse', 'viewer');
  
  -- Return info about fixed roles
  RETURN QUERY
  SELECT 
    up.id as fixed_user_id,
    'invalid_role'::TEXT as old_role,
    'Changed to nurse role'::TEXT as action_taken
  FROM user_profiles up
  WHERE role = 'nurse' AND updated_at > NOW() - INTERVAL '1 minute';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION deactivate_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION permanently_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_users() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_role_mismatches() TO authenticated;

-- 9. Show current state and issues
SELECT 'User management functions created successfully' as status;

-- Show users that are super_admin but in tenant_users table (this should be empty after fix)
SELECT 'Super admins in tenant_users table (should be empty after fix):' as info;
SELECT tu.user_id, up.email, up.role, tu.role as tenant_role
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
WHERE up.role = 'super_admin'
LIMIT 5;

-- Show users with invalid roles in user_profiles
SELECT 'Users with invalid roles in user_profiles:' as info;
SELECT id, email, role 
FROM user_profiles 
WHERE role NOT IN ('super_admin', 'admin', 'doctor', 'nurse', 'viewer')
LIMIT 5;

-- Show orphaned users (no tenant assignment and not super admin)
SELECT 'Orphaned users (no tenant assignment):' as info;
SELECT up.id, up.email, up.role
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
WHERE tu.user_id IS NULL
AND up.role != 'super_admin'
LIMIT 5;

COMMIT;
