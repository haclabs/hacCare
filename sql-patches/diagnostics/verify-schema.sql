-- Schema verification query to understand table structures
-- Run this to verify the correct column names before applying optimizations

-- Check user_profiles structure
SELECT 'user_profiles columns' as table_info, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check tenant_users structure  
SELECT 'tenant_users columns' as table_info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'tenant_users'
ORDER BY ordinal_position;

-- Check existing policies on user_profiles
SELECT 'user_profiles policies' as policy_info, policyname, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Check existing policies that reference user_profiles
SELECT 'policies referencing user_profiles' as policy_info, tablename, policyname, 
       CASE 
         WHEN qual LIKE '%user_profiles%' THEN qual
         WHEN with_check LIKE '%user_profiles%' THEN with_check
         ELSE 'none'
       END as policy_text
FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual LIKE '%user_profiles%' OR with_check LIKE '%user_profiles%');

-- Sample of current auth.uid() usage patterns
SELECT 'current auth.uid patterns' as pattern_info, tablename, policyname,
       CASE 
         WHEN qual LIKE '%auth.uid()%' THEN 'QUAL: ' || qual
         WHEN with_check LIKE '%auth.uid()%' THEN 'CHECK: ' || with_check
         ELSE 'none'
       END as auth_usage
FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
LIMIT 10;
