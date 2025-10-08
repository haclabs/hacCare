-- Investigate user_tenant_cache table and its relationship to the problem

-- 1. Check the structure of user_tenant_cache
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_tenant_cache'
ORDER BY ordinal_position;

-- 2. Check if there are any RLS policies on this table
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
WHERE tablename = 'user_tenant_cache';

-- 3. Check if there are triggers on user_tenant_cache
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_tenant_cache';

-- 4. Check the current data in user_tenant_cache
SELECT * FROM user_tenant_cache LIMIT 10;

-- 5. Check if there are any functions that reference this cache table
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) LIKE '%user_tenant_cache%';
