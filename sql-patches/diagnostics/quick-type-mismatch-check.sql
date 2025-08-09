-- =============================================================================
-- QUICK DIAGNOSTIC: Check for text = uuid type mismatches
-- =============================================================================
-- Run this FIRST in Supabase SQL Editor to identify the exact problem
-- =============================================================================

-- 1. Check what type auth.uid() returns
SELECT 'AUTH.UID() TYPE' as check, pg_typeof(auth.uid()) as data_type;

-- 2. Check column types in key tables that use auth.uid()
SELECT 
    'COLUMN TYPES' as check,
    t.table_name,
    c.column_name,
    c.data_type,
    c.udt_name,
    CASE 
        WHEN c.column_name IN ('id', 'user_id') AND c.data_type != 'uuid' THEN 'POTENTIAL MISMATCH'
        ELSE 'OK'
    END as status
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
AND c.column_name IN ('id', 'user_id')
AND t.table_name IN ('user_profiles', 'tenant_users', 'patients', 'medication_administrations')
ORDER BY t.table_name, c.column_name;

-- 3. Find policies that might have type issues
SELECT 
    'PROBLEMATIC POLICIES' as check,
    tablename,
    policyname,
    CASE 
        WHEN qual ~ '(id|user_id)\s*=\s*auth\.uid\(\)' THEN 'DIRECT COMPARISON - LIKELY ERROR'
        WHEN qual ~ '(id|user_id)\s*=.*auth\.uid\(\)' THEN 'COMPARISON WITHOUT CASTING'
        ELSE 'PROBABLY OK'
    END as issue_type,
    LEFT(qual, 100) as policy_excerpt
FROM pg_policies 
WHERE qual LIKE '%auth.uid()%'
ORDER BY issue_type DESC;

-- 4. Check if there are any current errors in the logs
SELECT 
    'CURRENT AUTH SETUP' as check,
    CASE 
        WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED'
        ELSE 'AUTHENTICATED: ' || auth.uid()::text
    END as auth_status;
