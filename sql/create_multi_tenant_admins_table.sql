-- Check what admin-related tables exist and create missing multi_tenant_admins table

-- 1. Check Heather's user_profiles entry (this should work)
SELECT 
    'Heather User Profile' as section,
    id as user_id,
    email,
    role,
    created_at
FROM user_profiles
WHERE email ILIKE '%heather%';

-- 2. Check auth.users for Heather
SELECT 
    'Heather Auth User' as section,
    id as auth_id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
WHERE email ILIKE '%heather%';

-- 3. Check what tables exist related to admin/tenant
SELECT 
    'Existing Tables' as section,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%admin%' OR table_name LIKE '%tenant%'
ORDER BY table_name;

-- 4. Create the missing multi_tenant_admins table
CREATE TABLE IF NOT EXISTS multi_tenant_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 5. Add RLS policy for multi_tenant_admins
ALTER TABLE multi_tenant_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Multi-tenant admins can see all records, regular users can only see their own
CREATE POLICY "Multi-tenant admins can manage multi_tenant_admins"
ON multi_tenant_admins
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
    OR user_id = auth.uid()
);

-- 6. Add Heather as a multi-tenant admin (if she exists in user_profiles)
INSERT INTO multi_tenant_admins (user_id)
SELECT id FROM user_profiles WHERE email ILIKE '%heather%'
ON CONFLICT (user_id) DO NOTHING;

-- 7. Verify the setup
SELECT 
    'Final Multi-Tenant Admin Setup' as section,
    mta.id,
    up.email,
    up.role,
    mta.created_at
FROM multi_tenant_admins mta
JOIN user_profiles up ON mta.user_id = up.id
ORDER BY mta.created_at DESC;