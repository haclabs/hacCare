-- RLS Performance Optimization Script
-- This script fixes the auth function re-evaluation warnings by wrapping auth functions in subqueries
-- This optimizes performance by evaluating auth functions once per query instead of once per row

-- 1. Get all policies with auth function performance issues
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%auth.uid()%' OR 
    qual LIKE '%auth.role()%' OR 
    qual LIKE '%current_setting%' OR
    with_check LIKE '%auth.uid()%' OR 
    with_check LIKE '%auth.role()%' OR 
    with_check LIKE '%current_setting%'
  )
ORDER BY tablename, policyname;

-- 2. Function to optimize a single policy by wrapping auth functions in subqueries
CREATE OR REPLACE FUNCTION optimize_rls_policy_performance(
  p_schema_name text,
  p_table_name text, 
  p_policy_name text,
  p_command text,
  p_qual text,
  p_with_check text
) RETURNS text AS $$
DECLARE
  optimized_qual text;
  optimized_with_check text;
  sql_statement text;
BEGIN
  -- Optimize the USING clause by wrapping auth functions in subqueries
  optimized_qual := p_qual;
  IF optimized_qual IS NOT NULL THEN
    -- Replace auth.uid() with (SELECT auth.uid())
    optimized_qual := regexp_replace(optimized_qual, '\yauth\.uid\(\)', '(SELECT auth.uid())', 'g');
    -- Replace auth.role() with (SELECT auth.role())  
    optimized_qual := regexp_replace(optimized_qual, '\yauth\.role\(\)', '(SELECT auth.role())', 'g');
    -- Replace current_setting calls with subqueries where appropriate
    optimized_qual := regexp_replace(optimized_qual, '\ycurrent_setting\(', '(SELECT current_setting(', 'g');
  END IF;
  
  -- Optimize the WITH CHECK clause
  optimized_with_check := p_with_check;
  IF optimized_with_check IS NOT NULL THEN
    -- Replace auth.uid() with (SELECT auth.uid())
    optimized_with_check := regexp_replace(optimized_with_check, '\yauth\.uid\(\)', '(SELECT auth.uid())', 'g');
    -- Replace auth.role() with (SELECT auth.role())
    optimized_with_check := regexp_replace(optimized_with_check, '\yauth\.role\(\)', '(SELECT auth.role())', 'g');
    -- Replace current_setting calls with subqueries where appropriate  
    optimized_with_check := regexp_replace(optimized_with_check, '\ycurrent_setting\(', '(SELECT current_setting(', 'g');
  END IF;
  
  -- Generate the SQL to recreate the policy with optimized expressions
  sql_statement := format('DROP POLICY IF EXISTS %I ON %I.%I', p_policy_name, p_schema_name, p_table_name);
  sql_statement := sql_statement || '; ';
  sql_statement := sql_statement || format('CREATE POLICY %I ON %I.%I FOR %s', 
    p_policy_name, p_schema_name, p_table_name, p_command);
    
  IF optimized_qual IS NOT NULL THEN
    sql_statement := sql_statement || ' USING (' || optimized_qual || ')';
  END IF;
  
  IF optimized_with_check IS NOT NULL THEN
    sql_statement := sql_statement || ' WITH CHECK (' || optimized_with_check || ')';
  END IF;
  
  RETURN sql_statement;
END;
$$ LANGUAGE plpgsql;

-- 3. Generate optimization statements for all problematic policies
WITH policy_optimizations AS (
  SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check,
    optimize_rls_policy_performance(schemaname, tablename, policyname, cmd, qual, with_check) as optimization_sql
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      qual LIKE '%auth.uid()%' OR 
      qual LIKE '%auth.role()%' OR 
      qual LIKE '%current_setting%' OR
      with_check LIKE '%auth.uid()%' OR 
      with_check LIKE '%auth.role()%' OR 
      with_check LIKE '%current_setting%'
    )
)
SELECT 
  tablename,
  policyname,
  'BEFORE: ' || COALESCE(qual, 'NULL') as original_qual,
  'AFTER:  ' || 
    regexp_replace(
      regexp_replace(
        COALESCE(qual, 'NULL'), 
        '\yauth\.uid\(\)', '(SELECT auth.uid())', 'g'
      ), 
      '\yauth\.role\(\)', '(SELECT auth.role())', 'g'
    ) as optimized_qual,
  optimization_sql
FROM policy_optimizations
ORDER BY tablename, policyname;

-- 4. Clean up the helper function
DROP FUNCTION IF EXISTS optimize_rls_policy_performance(text, text, text, text, text, text);