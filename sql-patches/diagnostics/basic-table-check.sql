-- Simple diagnostic queries - start with basic table structure
-- Run these queries one by one in your remote Supabase SQL Editor

-- 1. Check if tenants table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'tenants';

-- 2. Show basic tenants table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenants' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check current tenants (without subdomain column first)
SELECT 
    id,
    name,
    status,
    created_at
FROM tenants 
ORDER BY created_at;

-- 4. Check if you have any users in user_profiles
SELECT 
    id,
    email,
    role,
    created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 5;
