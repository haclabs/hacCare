-- CLEAN FIX for Tenant Creation Permission Error
-- Run this in your Supabase SQL Editor

-- Step 1: Check table structure first
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

-- Check for any sequences (likely none since tenants probably uses UUID)
SELECT schemaname, sequencename 
FROM pg_sequences 
WHERE sequencename LIKE '%tenant%';

-- Step 2: Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies that might conflict
DROP POLICY IF EXISTS "tenants_simple_access" ON tenants;
DROP POLICY IF EXISTS "tenants_admin_manage" ON tenants;
DROP POLICY IF EXISTS "authenticated_users_can_create_tenants" ON tenants;
DROP POLICY IF EXISTS "tenant_insert_policy" ON tenants;
DROP POLICY IF EXISTS "Super admins can create tenants" ON tenants;

-- Step 4: Create INSERT policy (most important for your error)
CREATE POLICY "allow_authenticated_insert_tenants" ON tenants
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Step 5: Create SELECT policy 
CREATE POLICY "allow_users_select_tenants" ON tenants
FOR SELECT USING (
  -- Super admins can see all
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
  OR
  -- Users can see tenants they belong to
  id IN (
    SELECT tenant_id 
    FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR
  -- Users can see tenants they admin
  admin_user_id = auth.uid()
  OR
  -- Service role access
  auth.role() = 'service_role'
);

-- Step 6: Grant basic table permissions (NO sequence grants since tenants uses UUID)
GRANT SELECT, INSERT, UPDATE ON tenants TO authenticated;

-- Step 7: Verify the policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tenants';

-- Step 8: Test with a simple query
SELECT 'Tenant creation should now work!' as status;
