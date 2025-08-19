-- Setup for super admin + specific lethpoly admin
-- Run these queries one by one in your remote Supabase SQL Editor

-- 1. First, check your current super admin account
-- Replace 'your-super-admin-email@example.com' with your actual super admin email
SELECT 
    up.id as profile_id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    tu.tenant_id,
    t.name as tenant_name,
    t.subdomain,
    tu.role as tenant_role
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id
LEFT JOIN tenants t ON tu.tenant_id = t.id
WHERE up.email = 'your-super-admin-email@example.com'  -- Replace with your super admin email
ORDER BY tu.created_at DESC;

-- 2. Check if you have a specific lethpoly admin user
-- Replace 'lethpoly-admin-email@example.com' with the lethpoly admin email
SELECT 
    up.id as profile_id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    tu.tenant_id,
    t.name as tenant_name,
    t.subdomain,
    tu.role as tenant_role
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id
LEFT JOIN tenants t ON tu.tenant_id = t.id
WHERE up.email = 'lethpoly-admin-email@example.com'  -- Replace with lethpoly admin email
ORDER BY tu.created_at DESC;

-- 3. Show all current user-tenant assignments for reference
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
ORDER BY t.subdomain, tu.created_at;
