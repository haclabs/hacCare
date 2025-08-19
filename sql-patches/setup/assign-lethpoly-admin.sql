-- Create or assign lethpoly-specific admin user
-- Run these queries AFTER checking the admin accounts first

-- Option A: If you want to create a NEW user specifically for lethpoly
-- (Only use this if you need a separate login for lethpoly)

-- First, check if the lethpoly admin user already exists
SELECT id, email, role FROM user_profiles 
WHERE email = 'lethpoly-admin@example.com';  -- Replace with desired email

-- If the user doesn't exist, you'll need to:
-- 1. Create the user through the Supabase Auth UI (sign up normally)
-- 2. Then run this to assign them to lethpoly tenant:

/*
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
    'LETHPOLY_USER_ID_HERE',  -- Replace with the new user's profile ID
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8',  -- Lethpoly tenant ID
    'admin',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();
*/

-- Option B: Assign your existing super admin to lethpoly tenant as well
-- (This allows you to switch between "view all tenants" and "lethpoly specific" modes)

-- Replace 'YOUR_SUPER_ADMIN_USER_ID' with your actual super admin user profile ID
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
    'YOUR_SUPER_ADMIN_USER_ID',  -- Replace with your super admin user profile ID
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8',  -- Lethpoly tenant ID
    'admin',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Verify the assignment
SELECT 
    up.email,
    up.role as user_role,
    t.name as tenant_name,
    t.subdomain,
    tu.role as tenant_role,
    tu.status,
    tu.created_at
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE t.subdomain = 'lethpoly'
ORDER BY tu.created_at DESC;
