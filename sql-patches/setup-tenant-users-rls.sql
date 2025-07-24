-- Complete RLS Setup for tenant_users table
-- Run this in your Supabase SQL editor to ensure proper tenant isolation

BEGIN;

-- 1. Enable RLS on tenant_users table (if not already enabled)
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh (optional - comment out if you want to keep existing)
DROP POLICY IF EXISTS "Users can only see tenant_users from their tenant" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_select_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update_policy" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete_policy" ON tenant_users;

-- 3. Create comprehensive RLS policies

-- SELECT policy: Users can only see tenant_users from their own tenant(s)
CREATE POLICY "tenant_users_select_policy"
  ON tenant_users FOR SELECT
  USING (
    -- Super admins can see all tenant_users
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Regular users can only see tenant_users from their own tenant(s)
    -- Use a direct check to avoid recursion
    (user_id = auth.uid() AND is_active = true)
    OR
    -- Users can see other users in the same tenant if they are in that tenant
    EXISTS (
      SELECT 1 FROM tenant_users tu_check
      WHERE tu_check.user_id = auth.uid() 
      AND tu_check.tenant_id = tenant_users.tenant_id 
      AND tu_check.is_active = true
    )
  );

-- INSERT policy: Only super admins and tenant admins can add users to tenants
CREATE POLICY "tenant_users_insert_policy"
  ON tenant_users FOR INSERT
  WITH CHECK (
    -- Super admins can insert users into any tenant
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Tenant admins can insert users into their own tenant
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      EXISTS (
        SELECT 1 FROM tenant_users tu_check
        WHERE tu_check.user_id = auth.uid() 
        AND tu_check.tenant_id = NEW.tenant_id 
        AND tu_check.is_active = true
      )
    )
  );

-- UPDATE policy: Super admins and tenant admins can update tenant_users
CREATE POLICY "tenant_users_update_policy"
  ON tenant_users FOR UPDATE
  USING (
    -- Super admins can update any tenant_users record
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Tenant admins can update records in their own tenant
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      EXISTS (
        SELECT 1 FROM tenant_users tu_check
        WHERE tu_check.user_id = auth.uid() 
        AND tu_check.tenant_id = tenant_users.tenant_id 
        AND tu_check.is_active = true
      )
    )
  )
  WITH CHECK (
    -- Same conditions for the updated data
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      EXISTS (
        SELECT 1 FROM tenant_users tu_check
        WHERE tu_check.user_id = auth.uid() 
        AND tu_check.tenant_id = NEW.tenant_id 
        AND tu_check.is_active = true
      )
    )
  );

-- DELETE policy: Only super admins can delete tenant_users records
CREATE POLICY "tenant_users_delete_policy"
  ON tenant_users FOR DELETE
  USING (
    -- Super admins can delete any tenant_users record
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Tenant admins can deactivate (not delete) users in their own tenant
    (
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
      )
      AND
      EXISTS (
        SELECT 1 FROM tenant_users tu_check
        WHERE tu_check.user_id = auth.uid() 
        AND tu_check.tenant_id = tenant_users.tenant_id 
        AND tu_check.is_active = true
      )
    )
  );

-- 4. Create helper function to get user's tenant ID(s)
CREATE OR REPLACE FUNCTION get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(tenant_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT tu.tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = user_uuid AND tu.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to check if user is admin of a specific tenant
CREATE OR REPLACE FUNCTION is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM tenant_users tu
    JOIN user_profiles up ON tu.user_id = up.id
    WHERE tu.user_id = user_uuid 
    AND tu.tenant_id = tenant_uuid 
    AND tu.is_active = true
    AND up.role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to assign user to tenant (for super admin use)
CREATE OR REPLACE FUNCTION assign_user_to_tenant(
  target_user_id UUID,
  target_tenant_id UUID,
  user_role TEXT DEFAULT 'nurse',
  user_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is super admin
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can assign users to tenants';
  END IF;
  
  -- Insert or update tenant_users record
  INSERT INTO tenant_users (user_id, tenant_id, role, permissions, is_active, created_at, updated_at)
  VALUES (target_user_id, target_tenant_id, user_role, user_permissions, true, NOW(), NOW())
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    is_active = true,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to remove user from tenant
CREATE OR REPLACE FUNCTION remove_user_from_tenant(
  target_user_id UUID,
  target_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if current user is super admin or tenant admin
  SELECT role INTO current_user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  IF current_user_role = 'super_admin' THEN
    -- Super admin can remove from any tenant
    UPDATE tenant_users 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = target_user_id AND tenant_id = target_tenant_id;
  ELSIF current_user_role = 'admin' THEN
    -- Tenant admin can only remove from their own tenant
    UPDATE tenant_users 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = target_user_id 
    AND tenant_id = target_tenant_id
    AND tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.is_active = true
    );
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to remove user from tenant';
  END IF;
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_tenant_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_tenant_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_to_tenant(UUID, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_tenant(UUID, UUID) TO authenticated;

-- 9. Verification queries
SELECT 'RLS Policies Created Successfully' as status;

-- Check that RLS is enabled
SELECT 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'tenant_users';

-- List all policies
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'tenant_users'
ORDER BY policyname;

COMMIT;
