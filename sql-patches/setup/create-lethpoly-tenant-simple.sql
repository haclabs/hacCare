-- Check existing tenants and create lethpoly tenant
-- Run these queries one by one in your remote Supabase SQL Editor

-- 1. Check what tenants currently exist
SELECT 
    id,
    name,
    subdomain,
    status,
    created_at
FROM tenants 
ORDER BY created_at;

-- 2. Check if lethpoly tenant already exists
SELECT 
    id,
    name,
    subdomain,
    status,
    settings,
    created_at
FROM tenants 
WHERE subdomain = 'lethpoly';

-- 3. Create lethpoly tenant (only run if it doesn't exist from step 2)
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
    '{"currency": "USD", "features": {"mobile_app": true, "wound_care": true, "barcode_scanning": true, "advanced_analytics": true, "medication_management": true}, "security": {"password_policy": {"min_length": 8, "require_numbers": true, "require_symbols": false, "require_lowercase": true, "require_uppercase": true}, "session_timeout": 480, "two_factor_required": false}, "timezone": "UTC", "date_format": "MM/DD/YYYY"}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (subdomain) DO NOTHING;

-- 4. Verify the lethpoly tenant was created
SELECT 
    id,
    name,
    subdomain,
    status,
    created_at
FROM tenants 
WHERE subdomain = 'lethpoly';
