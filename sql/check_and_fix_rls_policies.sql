-- Check Row Level Security policies on active_simulations table
-- Run this to see if RLS is blocking anonymous access

-- Check if RLS is enabled on the table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'active_simulations';

-- Check existing policies on active_simulations
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
WHERE tablename = 'active_simulations';

-- If RLS is enabled and blocking anonymous access, we need to add a policy
-- This policy allows anyone to read simulations that allow anonymous access
-- First drop the policy if it exists, then create it
DROP POLICY IF EXISTS "Allow anonymous access to public simulations" ON public.active_simulations;

CREATE POLICY "Allow anonymous access to public simulations" 
ON public.active_simulations 
FOR SELECT 
USING (allow_anonymous_access = true AND status = 'running');

-- Verify the policy was created
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
WHERE tablename = 'active_simulations';