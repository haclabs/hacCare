-- Check RLS status and policies for tenant_users table
-- Run this in your Supabase SQL editor to check current RLS setup

-- 1. Check if RLS is enabled on tenant_users
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'tenant_users';

-- 2. Check existing policies on tenant_users
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
WHERE tablename = 'tenant_users'
ORDER BY policyname;

-- 3. Check if tenant_users table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenant_users'
ORDER BY ordinal_position;

-- 4. Check current data in tenant_users (if any)
SELECT COUNT(*) as total_records FROM tenant_users;

-- 5. Check if there are any foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='tenant_users';
