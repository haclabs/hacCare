-- Diagnostic queries for subdomain routing troubleshooting
-- Run these in your remote Supabase SQL Editor

-- 1. Check all tenants and their subdomains
SELECT 
    id,
    name,
    subdomain,
    status,
    created_at
FROM tenants 
ORDER BY subdomain;

-- 2. Check if lethpoly tenant exists and is active
SELECT 
    id,
    name,
    subdomain,
    status,
    settings,
    created_at
FROM tenants 
WHERE subdomain = 'lethpoly';

-- 3. Check all users assigned to lethpoly tenant
SELECT 
    tu.id as assignment_id,
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.role as user_role,
    tu.role as tenant_role,
    tu.status,
    t.name as tenant_name,
    t.subdomain,
    tu.created_at as assigned_at
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE t.subdomain = 'lethpoly'
ORDER BY tu.created_at DESC;

-- 4. Check your user profile and tenant assignments
-- Replace 'your-email@example.com' with your actual email
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    up.role as user_role,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'tenant_id', tu.tenant_id,
                'tenant_name', t.name,
                'subdomain', t.subdomain,
                'tenant_role', tu.role,
                'status', tu.status
            )
        ) FILTER (WHERE tu.tenant_id IS NOT NULL),
        '[]'::json
    ) as tenant_assignments
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id
LEFT JOIN tenants t ON tu.tenant_id = t.id
WHERE up.email = 'admin@haccare.com'  -- Replace with your email
GROUP BY up.id, up.email, up.first_name, up.last_name, up.role;

-- 5. Check RLS policies on tenants table (should allow subdomain lookup)
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
WHERE tablename = 'tenants'
ORDER BY policyname;

-- 6. Test the subdomain lookup function directly
-- This should return the lethpoly tenant if everything is set up correctly
SELECT * FROM tenants WHERE subdomain = 'lethpoly' AND status = 'active';
