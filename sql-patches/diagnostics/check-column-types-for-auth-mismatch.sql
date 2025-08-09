-- =============================================================================
-- DIAGNOSE TEXT = UUID TYPE MISMATCH ERRORS
-- =============================================================================
-- Run this in Supabase SQL Editor to identify type mismatches
-- =============================================================================

-- Check auth.uid() return type
SELECT 'AUTH.UID() TYPE CHECK' as check_type, pg_typeof(auth.uid()) as auth_uid_type;

-- Check user_id column types in key tables
SELECT 
    'USER_ID COLUMN TYPES' as check_type,
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE column_name IN ('user_id', 'id') 
AND table_name IN ('user_profiles', 'tenant_users', 'patients', 'medication_administrations')
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check for text vs UUID mismatches specifically
SELECT 
    'POTENTIAL TYPE MISMATCHES' as check_type,
    table_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'user_id' AND data_type = 'text' THEN 'MISMATCH: user_id should be UUID'
        WHEN column_name = 'id' AND data_type = 'text' THEN 'MISMATCH: id should be UUID'
        WHEN column_name = 'user_id' AND data_type = 'uuid' THEN 'CORRECT: UUID type'
        WHEN column_name = 'id' AND data_type = 'uuid' THEN 'CORRECT: UUID type'
        ELSE 'OTHER TYPE'
    END as type_status
FROM information_schema.columns 
WHERE column_name IN ('user_id', 'id') 
AND table_name IN ('user_profiles', 'tenant_users', 'patients', 'medication_administrations')
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check current policies that might have type issues
SELECT 
    'POLICY TEXT ANALYSIS' as check_type,
    schemaname,
    tablename,
    policyname,
    qual,
    CASE 
        WHEN qual LIKE '%user_id = auth.uid()%' THEN 'POTENTIAL ISSUE: Direct comparison'
        WHEN qual LIKE '%id = auth.uid()%' THEN 'POTENTIAL ISSUE: Direct comparison'
        WHEN qual LIKE '%user_id = (SELECT auth.uid())%' THEN 'SAFE: Subquery comparison'
        WHEN qual LIKE '%id = (SELECT auth.uid())%' THEN 'SAFE: Subquery comparison'
        ELSE 'NO OBVIOUS ISSUE'
    END as potential_issue
FROM pg_policies 
WHERE qual IS NOT NULL
AND (qual LIKE '%auth.uid()%')
ORDER BY tablename, policyname;
