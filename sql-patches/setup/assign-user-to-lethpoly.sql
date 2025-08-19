-- Assign user to lethpoly tenant
-- Run this AFTER creating the tenant and AFTER replacing the email/user_id

-- Method 1: If you know your user email, use this query first to get your user ID
SELECT 
    id,
    email,
    role,
    created_at
FROM user_profiles 
WHERE email = 'your-email@example.com'  -- Replace with your actual email
ORDER BY created_at DESC
LIMIT 1;

-- Method 2: Get the lethpoly tenant ID (we know it's 2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8)
SELECT id, name, subdomain FROM tenants WHERE subdomain = 'lethpoly';

-- Method 3: Assign user to lethpoly tenant
-- Replace 'USER_ID_HERE' with your actual user profile ID
INSERT INTO tenant_users (
    id,
    user_id,
    tenant_id,
    role,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'USER_ID_HERE',     -- Replace with your user profile ID
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8',   -- Lethpoly tenant ID
    'admin',            -- or 'super_admin' if you want full access
    'active',
    NOW(),
    NOW()
) ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Verify the assignment
SELECT 
    tu.id,
    up.email,
    up.role as user_role,
    tu.role as tenant_role,
    t.name as tenant_name,
    t.subdomain,
    tu.status,
    tu.created_at
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE t.subdomain = 'lethpoly'
ORDER BY tu.created_at DESC;
