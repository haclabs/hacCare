-- Diagnostic script to check user creation issues
-- Run this in your Supabase SQL editor

-- 1. Check if the system default tenant exists
SELECT 'System default tenant:' as info;
SELECT id, name, subdomain, status 
FROM tenants 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 2. Check current user_profiles table
SELECT 'Current user_profiles count:' as info;
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
       COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
FROM user_profiles;

-- 3. Check for any RLS issues with user_profiles
SELECT 'Testing user_profiles access:' as info;
SELECT id, email, role, is_active, created_at
FROM user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check orphaned users (users without tenant assignments)
SELECT 'Users without tenant assignments:' as info;
SELECT up.id, up.email, up.role, up.is_active
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id AND tu.is_active = true
WHERE tu.user_id IS NULL
ORDER BY up.created_at DESC
LIMIT 5;

-- 5. Check if there are RLS policies on user_profiles that might be blocking access
SELECT 'RLS policies on user_profiles:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 6. Check if RLS is enabled on user_profiles
SELECT 'RLS status for user_profiles:' as info;
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';
