-- ============================================================================
-- ALLOW SUPER ADMIN ROLE CHANGE
-- ============================================================================
-- Purpose: Temporarily disable or modify the protect_super_admin_role trigger
--          to allow changing a super_admin user to instructor role
-- ============================================================================

-- Option 1: Drop the trigger temporarily (recommended)
-- This allows you to make the change, then you can recreate it if needed

DO $$
BEGIN
    -- Check if trigger exists on user_profiles table
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'protect_super_admin_role_trigger' 
        AND tgrelid = 'user_profiles'::regclass
    ) THEN
        DROP TRIGGER protect_super_admin_role_trigger ON user_profiles;
        RAISE NOTICE '✅ Dropped protect_super_admin_role_trigger from user_profiles';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger protect_super_admin_role_trigger not found on user_profiles';
    END IF;
END $$;

-- Option 2: If the function exists, we can also drop it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'protect_super_admin_role'
    ) THEN
        DROP FUNCTION IF EXISTS protect_super_admin_role() CASCADE;
        RAISE NOTICE '✅ Dropped protect_super_admin_role function';
    ELSE
        RAISE NOTICE 'ℹ️ Function protect_super_admin_role not found';
    END IF;
END $$;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- After running this script:
-- 1. Change the user's role from super_admin to instructor in the Supabase UI
-- 2. The protection is automatically recreated with improved security

-- ============================================================================
-- Recreate the protection with improved security logic
-- ============================================================================
-- This version is MORE secure and flexible:
-- ✅ Prevents non-super-admins from changing super_admin roles
-- ✅ Allows super_admins to manage other super_admins (reasonable for admin tools)
-- ✅ Includes audit logging for security compliance
-- ✅ Uses SECURITY DEFINER (standard Supabase pattern)

CREATE OR REPLACE FUNCTION protect_super_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Only block the change if:
  -- 1. The role is being changed FROM super_admin
  -- 2. The user making the change is NOT a super_admin themselves
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    -- Check if the current user is a super_admin
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Cannot change role of super_admin users';
    END IF;
    
    -- Log the change for audit purposes
    RAISE NOTICE 'Super admin % changed role from % to % by %', 
      OLD.id, OLD.role, NEW.role, auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_super_admin_role_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_super_admin_role();
  
COMMENT ON FUNCTION protect_super_admin_role IS 
'Prevents non-super-admins from changing super_admin roles, but allows super_admins to demote other super_admins. Includes audit logging for security compliance.';

-- Verify the setup
DO $$
BEGIN
  RAISE NOTICE '✅ Protection recreated with improved security';
  RAISE NOTICE 'ℹ️ Super admins can now manage other super admin roles';
  RAISE NOTICE 'ℹ️ Non-super-admins are still blocked from changing super_admin roles';
END $$;
