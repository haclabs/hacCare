-- Add RLS policies to allow super admins to delete tenants
-- Run this in your Supabase SQL Editor

-- First, check current policies on tenants table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'tenants';

-- Add policy to allow super admins to delete tenants
CREATE POLICY "Super admins can delete any tenant"
  ON tenants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Also ensure super admins can see all tenants (for SELECT)
DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
CREATE POLICY "Super admins can view all tenants"
  ON tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR 
    id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow super admins to update any tenant
DROP POLICY IF EXISTS "Super admins can update any tenant" ON tenants;
CREATE POLICY "Super admins can update any tenant"
  ON tenants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR 
    id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Allow super admins to create tenants
DROP POLICY IF EXISTS "Super admins can create tenants" ON tenants;
CREATE POLICY "Super admins can create tenants"
  ON tenants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR 
    auth.uid() = admin_user_id
  );

-- Verify the new policies
SELECT 
    policyname, 
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY cmd, policyname;
