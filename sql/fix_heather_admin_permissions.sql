-- Check and fix Heather's user role for medication editing

-- 1. Check current user role
SELECT 
    'Current Heather Profile' as section,
    id,
    email,
    role,
    created_at
FROM user_profiles
WHERE email ILIKE '%heather%';

-- 2. Update Heather to super_admin if not already
UPDATE user_profiles
SET role = 'super_admin'
WHERE email ILIKE '%heather%' AND role != 'super_admin';

-- 3. Verify the change
SELECT 
    'Updated Heather Profile' as section,
    id,
    email,
    role,
    CASE 
        WHEN role = 'super_admin' THEN '✅ CAN EDIT/DELETE MEDICATIONS'
        ELSE '❌ CANNOT EDIT/DELETE MEDICATIONS'
    END as medication_permissions
FROM user_profiles
WHERE email ILIKE '%heather%';