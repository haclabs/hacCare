-- Create lethpoly tenant for subdomain routing
-- Run this SQL in your remote Supabase SQL Editor

-- First, check if the tenant already exists
SELECT * FROM tenants WHERE subdomain = 'lethpoly';

-- If it doesn't exist, create it
INSERT INTO tenants (
    id,
    name,
    subdomain,
    status,
    settings,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Lethpoly Healthcare',
    'lethpoly',
    'active',
    '{"timezone": "UTC", "features": ["patients", "medications", "alerts"]}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (subdomain) DO NOTHING;

-- Verify the tenant was created
SELECT 
    id,
    name,
    subdomain,
    status,
    created_at
FROM tenants 
WHERE subdomain = 'lethpoly';

-- Check if you need to create a super admin user for this tenant
-- Replace 'your-email@example.com' with your actual email
SELECT 
    up.id as profile_id,
    up.email,
    up.role,
    tu.tenant_id,
    t.name as tenant_name
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id
LEFT JOIN tenants t ON tu.tenant_id = t.id
WHERE up.email = 'your-email@example.com'  -- Replace with your email
ORDER BY up.created_at DESC;
