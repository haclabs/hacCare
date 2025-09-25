-- Check Heather's user profile and multi-tenant admin status

-- 1. Check Heather's user_profiles entry
SELECT 
    'Heather User Profile' as section,
    id as user_id,
    email,
    role,
    created_at
FROM user_profiles
WHERE email ILIKE '%heather%';

-- 2. Check if Heather has multi_tenant_admins entry
SELECT 
    'Heather Multi-Tenant Admin Status' as section,
    mta.id,
    mta.user_id,
    up.email,
    mta.created_at,
    mta.updated_at
FROM multi_tenant_admins mta
JOIN user_profiles up ON mta.user_id = up.id
WHERE up.email ILIKE '%heather%';

-- 3. Check auth.users for Heather
SELECT 
    'Heather Auth User' as section,
    id as auth_id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
WHERE email ILIKE '%heather%';

-- 4. Show all multi-tenant admins for reference
SELECT 
    'All Multi-Tenant Admins' as section,
    mta.id,
    up.email,
    up.role,
    mta.created_at
FROM multi_tenant_admins mta
JOIN user_profiles up ON mta.user_id = up.id
ORDER BY mta.created_at DESC;