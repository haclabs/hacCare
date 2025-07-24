-- Check tenant_users role constraint and fix it
-- Run this to see current constraint and update it

-- 1. Check current role constraint on tenant_users table
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'tenant_users' 
AND tc.constraint_type = 'CHECK'
AND cc.check_clause LIKE '%role%';

-- 2. Check current role constraint on user_profiles table
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_profiles' 
AND tc.constraint_type = 'CHECK'
AND cc.check_clause LIKE '%role%';

-- 3. Check what roles currently exist in user_profiles
SELECT DISTINCT role, COUNT(*) as count
FROM user_profiles
GROUP BY role
ORDER BY role;

-- 4. Check what roles are being used in tenant_users (if any)
SELECT DISTINCT role, COUNT(*) as count
FROM tenant_users
GROUP BY role
ORDER BY role;
