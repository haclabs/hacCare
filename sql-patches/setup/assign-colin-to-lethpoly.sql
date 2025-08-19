-- Assign colin@haclabs.io (super admin) to lethpoly tenant
-- This enables Option A: Super admin can access lethpoly.haccare.app directly

-- First, get Colin's user ID for verification
SELECT 
    id as user_id,
    email,
    role,
    first_name,
    last_name
FROM user_profiles 
WHERE email = 'colin@haclabs.io';

-- Assign Colin to lethpoly tenant as admin
-- This allows him to access lethpoly.haccare.app while keeping super admin privileges
INSERT INTO tenant_users (
    id,
    user_id,
    tenant_id,
    role,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    up.id,  -- Colin's user ID
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8',  -- Lethpoly tenant ID
    'admin',  -- Tenant role (not super_admin, just admin for this tenant)
    NOW(),
    NOW()
FROM user_profiles up
WHERE up.email = 'colin@haclabs.io'
ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = NOW();

-- Verify the assignment worked
SELECT 
    up.email,
    up.role as user_role,
    t.name as tenant_name,
    t.subdomain,
    tu.role as tenant_role,
    tu.created_at as assigned_at
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE t.subdomain = 'lethpoly'
ORDER BY tu.created_at DESC;

-- Final check: Show Colin's complete tenant assignments
SELECT 
    up.id as user_id,
    up.email,
    up.role as user_role,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'tenant_name', t.name,
                'subdomain', t.subdomain,
                'tenant_role', tu.role
            )
        ) FILTER (WHERE tu.tenant_id IS NOT NULL),
        '[]'::json
    ) as tenant_assignments
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id
LEFT JOIN tenants t ON tu.tenant_id = t.id
WHERE up.email = 'colin@haclabs.io'
GROUP BY up.id, up.email, up.role;
