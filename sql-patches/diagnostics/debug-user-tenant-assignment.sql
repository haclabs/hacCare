-- DIAGNOSTIC: Debug user tenant assignment issue
-- This script will help diagnose why a user who should have tenant assignment is showing the security message

-- Step 1: Show current authenticated user info
SELECT 'CURRENT USER INFO:' as diagnostic_step;
SELECT 
  'auth.uid():' as check_type,
    auth.uid() as user_id,
      CASE 
          WHEN auth.uid() IS NULL THEN '❌ Not authenticated'
              ELSE '✅ Authenticated'
                END as auth_status;

                -- Step 2: Check user profile exists
                SELECT 'USER PROFILE CHECK:' as diagnostic_step;
                SELECT 
                  up.id,
                    up.email,
                      up.role,
                        up.is_active,
                          up.created_at,
                            CASE 
                                WHEN up.is_active THEN '✅ Active'
                                    ELSE '❌ Inactive'
                                      END as profile_status
                                      FROM user_profiles up
                                      WHERE up.id = auth.uid();

                                      -- Step 3: Check tenant_users assignment
                                      SELECT 'TENANT ASSIGNMENT CHECK:' as diagnostic_step;
                                      SELECT 
                                        tu.user_id,
                                          tu.tenant_id,
                                            tu.role,
                                              tu.is_active as assignment_active,
                                                t.name as tenant_name,
                                                  t.subdomain,
                                                    t.status as tenant_status,
                                                      CASE 
                                                          WHEN tu.is_active AND t.status = 'active' THEN '✅ Valid assignment'
                                                              WHEN NOT tu.is_active THEN '❌ Assignment inactive'
                                                                  WHEN t.status != 'active' THEN '❌ Tenant inactive'
                                                                      ELSE '❌ Other issue'
                                                                        END as assignment_status
                                                                        FROM tenant_users tu
                                                                        JOIN tenants t ON tu.tenant_id = t.id
                                                                        WHERE tu.user_id = auth.uid();

                                                                        -- Step 4: Test the get_user_current_tenant function directly
                                                                        SELECT 'TESTING get_user_current_tenant FUNCTION:' as diagnostic_step;
                                                                        SELECT * FROM get_user_current_tenant(auth.uid());

                                                                        -- Step 5: Alternative direct check (in case RPC function has issues)
                                                                        SELECT 'DIRECT TENANT LOOKUP:' as diagnostic_step;
                                                                        SELECT 
                                                                          tu.tenant_id,
                                                                            tu.role,
                                                                              tu.is_active,
                                                                                t.name as tenant_name,
                                                                                  t.subdomain,
                                                                                    t.status as tenant_status
                                                                                    FROM tenant_users tu
                                                                                    JOIN tenants t ON tu.tenant_id = t.id
                                                                                    WHERE tu.user_id = auth.uid()
                                                                                      AND tu.is_active = true
                                                                                        AND t.status = 'active'
                                                                                        LIMIT 1;

                                                                                        -- Step 6: Check if there are multiple tenant assignments (which could cause confusion)
                                                                                        SELECT 'MULTIPLE ASSIGNMENT CHECK:' as diagnostic_step;
                                                                                        SELECT 
                                                                                          COUNT(*) as assignment_count,
                                                                                            CASE 
                                                                                                WHEN COUNT(*) = 0 THEN '❌ No assignments found'
                                                                                                    WHEN COUNT(*) = 1 THEN '✅ Single assignment (correct)'
                                                                                                        ELSE '⚠️ Multiple assignments (potential issue)'
                                                                                                          END as assignment_status
                                                                                                          FROM tenant_users
                                                                                                          WHERE user_id = auth.uid()
                                                                                                            AND is_active = true;

                                                                                                            -- Step 7: If multiple assignments, show them all
                                                                                                            SELECT 'ALL ACTIVE ASSIGNMENTS:' as diagnostic_step;
                                                                                                            SELECT 
                                                                                                              tu.tenant_id,
                                                                                                                tu.role,
                                                                                                                  tu.is_active,
                                                                                                                    t.name as tenant_name,
                                                                                                                      t.subdomain,
                                                                                                                        t.status as tenant_status,
                                                                                                                          tu.created_at as assignment_date
                                                                                                                          FROM tenant_users tu
                                                                                                                          JOIN tenants t ON tu.tenant_id = t.id
                                                                                                                          WHERE tu.user_id = auth.uid()
                                                                                                                            AND tu.is_active = true
                                                                                                                            ORDER BY tu.created_at DESC;
                                                                                                                            