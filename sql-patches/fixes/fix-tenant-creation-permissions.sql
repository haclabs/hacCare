-- Fix Tenant Creation Permission Error
-- This script addresses the "permission denied for table tenants" error
-- Run this in your Supabase SQL Editor

-- First, let's check the current state and table structure
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'tenants'
ORDER BY cmd, policyname;

-- Check if RLS is enabled on tenants table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tenants';

-- Check tenants table structure to understand primary key
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

-- Check for sequences related to tenants table
SELECT schemaname, sequencename 
FROM pg_sequences 
WHERE sequencename LIKE '%tenant%';

-- Check current user profiles and roles
SELECT id, email, role, tenant_id 
FROM user_profiles 
LIMIT 10;

                            -- ====================
                            -- SOLUTION: Fix Tenant Creation Permissions
                            -- ====================

                            -- Step 1: Ensure RLS is enabled on tenants table
                            ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

                            -- Step 2: Drop all existing conflicting policies on tenants table
                            DROP POLICY IF EXISTS "tenants_simple_access" ON tenants;
                            DROP POLICY IF EXISTS "tenants_admin_manage" ON tenants;
                            DROP POLICY IF EXISTS "Super admins can view all tenants" ON tenants;
                            DROP POLICY IF EXISTS "Super admins can create tenants" ON tenants;
                            DROP POLICY IF EXISTS "Super admins can update any tenant" ON tenants;
                            DROP POLICY IF EXISTS "Super admins can delete any tenant" ON tenants;
                            DROP POLICY IF EXISTS "Super admins can manage all tenants" ON tenants;
                            DROP POLICY IF EXISTS "Tenant admins can read their tenant" ON tenants;
                            DROP POLICY IF EXISTS "Users can view tenants" ON tenants;
                            DROP POLICY IF EXISTS "Authenticated users can view tenants" ON tenants;
                            DROP POLICY IF EXISTS "Authenticated users can manage tenants" ON tenants;

                            -- Step 3: Create comprehensive tenant policies

                            -- SELECT Policy: Allow users to view tenants they have access to
                            CREATE POLICY "tenant_select_policy" ON tenants
                            FOR SELECT USING (
                              -- Super admins can see all tenants
                                EXISTS (
                                    SELECT 1 FROM user_profiles 
                                        WHERE id = auth.uid() AND role = 'super_admin'
                                          )
                                            OR
                                              -- Users can see tenants they belong to
                                                id IN (
                                                    SELECT tenant_id 
                                                        FROM tenant_users 
                                                            WHERE user_id = auth.uid() AND is_active = true
                                                              )
                                                                OR
                                                                  -- Allow service role full access
                                                                    auth.role() = 'service_role'
                                                                    );

                                                                    -- INSERT Policy: Allow super admins and authorized users to create tenants
                                                                    CREATE POLICY "tenant_insert_policy" ON tenants
                                                                    FOR INSERT WITH CHECK (
                                                                      -- Super admins can create any tenant
                                                                        EXISTS (
                                                                            SELECT 1 FROM user_profiles 
                                                                                WHERE id = auth.uid() AND role = 'super_admin'
                                                                                  )
                                                                                    OR
                                                                                      -- Allow if the current user is set as admin_user_id
                                                                                        auth.uid() = admin_user_id
                                                                                          OR
                                                                                            -- Allow service role full access
                                                                                              auth.role() = 'service_role'
                                                                                                OR
                                                                                                  -- Allow authenticated users to create tenants (for initial setup)
                                                                                                    auth.uid() IS NOT NULL
                                                                                                    );

                                                                                                    -- UPDATE Policy: Allow super admins and tenant admins to update tenants
                                                                                                    CREATE POLICY "tenant_update_policy" ON tenants
                                                                                                    FOR UPDATE USING (
                                                                                                      -- Super admins can update any tenant
                                                                                                        EXISTS (
                                                                                                            SELECT 1 FROM user_profiles 
                                                                                                                WHERE id = auth.uid() AND role = 'super_admin'
                                                                                                                  )
                                                                                                                    OR
                                                                                                                      -- Tenant admins can update their own tenant
                                                                                                                        id IN (
                                                                                                                            SELECT tenant_id 
                                                                                                                                FROM tenant_users 
                                                                                                                                    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
                                                                                                                                      )
                                                                                                                                        OR
                                                                                                                                          -- Allow service role full access
                                                                                                                                            auth.role() = 'service_role'
                                                                                                                                            );

                                                                                                                                            -- DELETE Policy: Allow super admins to delete tenants
                                                                                                                                            CREATE POLICY "tenant_delete_policy" ON tenants
                                                                                                                                            FOR DELETE USING (
                                                                                                                                              -- Super admins can delete any tenant
                                                                                                                                                EXISTS (
                                                                                                                                                    SELECT 1 FROM user_profiles 
                                                                                                                                                        WHERE id = auth.uid() AND role = 'super_admin'
                                                                                                                                                          )
                                                                                                                                                            OR
                                                                                                                                                              -- Allow service role full access
                                                                                                                                                                auth.role() = 'service_role'
                                                                                                                                                                );

                                                                                                                                                                -- Step 4: Ensure user_profiles table has proper access
                                                                                                                                                                -- Create policy to allow users to read their own profile and super admins to read all
                                                                                                                                                                DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
                                                                                                                                                                CREATE POLICY "user_profiles_select_policy" ON user_profiles
                                                                                                                                                                FOR SELECT USING (
                                                                                                                                                                  id = auth.uid() 
                                                                                                                                                                    OR 
                                                                                                                                                                      EXISTS (
                                                                                                                                                                          SELECT 1 FROM user_profiles 
                                                                                                                                                                              WHERE id = auth.uid() AND role = 'super_admin'
                                                                                                                                                                                )
                                                                                                                                                                                  OR
                                                                                                                                                                                    auth.role() = 'service_role'
                                                                                                                                                                                    );

                                                                                                                                                                                    -- Step 5: Create a fallback policy for initial setup (temporary)
                                                                                                                                                                                    -- This allows any authenticated user to create their first tenant
                                                                                                                                                                                    CREATE POLICY "tenant_initial_setup_policy" ON tenants
                                                                                                                                                                                    FOR INSERT WITH CHECK (
                                                                                                                                                                                      auth.uid() IS NOT NULL AND
                                                                                                                                                                                        NOT EXISTS (
                                                                                                                                                                                            SELECT 1 FROM tenant_users WHERE user_id = auth.uid()
                                                                                                                                                                                              )
                                                                                                                                                                                              );

                                                                                                                                                                                              -- Step 6: Grant necessary table permissions
                                                                                                                                                                                              GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO authenticated;
                                                                                                                                                                                              GRANT SELECT ON user_profiles TO authenticated;
                                                                                                                                                                                              GRANT SELECT ON tenant_users TO authenticated;

                                                                                                                                                                                              -- Step 7: Verify the new policies are in place
                                                                                                                                                                                              SELECT 
                                                                                                                                                                                                  policyname, 
                                                                                                                                                                                                      cmd,
                                                                                                                                                                                                          qual,
                                                                                                                                                                                                              with_check
                                                                                                                                                                                                              FROM pg_policies 
                                                                                                                                                                                                              WHERE tablename = 'tenants'
                                                                                                                                                                                                              ORDER BY cmd, policyname;

                                                                                                                                                                                                              -- Step 8: Test the permissions (run as different user types)
                                                                                                                                                                                                              -- This will show what the current user can see
                                                                                                                                                                                                              SELECT 
                                                                                                                                                                                                                id, 
                                                                                                                                                                                                                  name, 
                                                                                                                                                                                                                    subdomain, 
                                                                                                                                                                                                                      status,
                                                                                                                                                                                                                        CASE 
                                                                                                                                                                                                                            WHEN admin_user_id = auth.uid() THEN 'You are admin'
                                                                                                                                                                                                                                ELSE 'Not admin'
                                                                                                                                                                                                                                  END as admin_status
                                                                                                                                                                                                                                  FROM tenants;

                                                                                                                                                                                                                                  COMMIT;
