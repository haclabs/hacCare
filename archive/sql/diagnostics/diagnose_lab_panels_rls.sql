-- Diagnostic queries to check lab_panels RLS setup
-- Run these to understand the current state

-- 1. Check current user's role
SELECT 
  id,
  email,
  role
FROM user_profiles
WHERE id = auth.uid();

-- 2. Check user_tenant_cache for current user
SELECT 
  user_id,
  tenant_id,
  created_at
FROM user_tenant_cache
WHERE user_id = auth.uid();

-- 3. Check all policies on lab_panels
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lab_panels'
ORDER BY policyname;

-- 4. Test the policy conditions directly
-- This will show if the user passes the super_admin check
SELECT 
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  ) AS is_super_admin,
  auth.uid() AS current_user_id,
  (SELECT role FROM user_profiles WHERE id = auth.uid()) AS current_role;

-- 5. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'lab_panels';
