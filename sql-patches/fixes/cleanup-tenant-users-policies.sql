-- Quick cleanup script - run this first if you get "already exists" errors
-- This will remove ALL policies from tenant_users table

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Loop through all policies on tenant_users table and drop them
    FOR policy_record IN
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tenant_users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON tenant_users';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Verify all policies are removed
SELECT 'All tenant_users policies cleaned up' as status;

SELECT policyname 
FROM pg_policies 
WHERE tablename = 'tenant_users';
