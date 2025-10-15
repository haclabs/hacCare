-- ============================================================================
-- CHECK: Patient Vitals RLS Policies
-- ============================================================================
-- Check if patient_vitals has simulation access support
-- ============================================================================

-- Check existing RLS policies on patient_vitals
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Command",
    qual as "USING clause (for SELECT/UPDATE/DELETE)",
    with_check as "WITH CHECK clause (for INSERT/UPDATE)"
FROM pg_policies 
WHERE tablename = 'patient_vitals'
ORDER BY policyname;

-- Check if the table has RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'patient_vitals';

-- Check if has_simulation_tenant_access function exists
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'has_simulation_tenant_access';
