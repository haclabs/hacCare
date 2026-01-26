-- =====================================================
-- FIX: TENANT_USERS ROLE CHECK CONSTRAINT
-- =====================================================
-- Migration: Update tenant_users role constraint to include coordinator and instructor
-- Date: 2026-01-26
-- Issue: Check constraint missing new roles coordinator, instructor, and viewer
-- =====================================================

-- Step 1: Drop the old constraint (if it exists)
ALTER TABLE tenant_users 
DROP CONSTRAINT IF EXISTS tenant_users_role_check;

-- Step 2: Add new constraint with ALL valid roles including viewer for simulation-only students
ALTER TABLE tenant_users
ADD CONSTRAINT tenant_users_role_check 
CHECK (role IN ('super_admin', 'coordinator', 'admin', 'instructor', 'nurse', 'viewer'));

COMMENT ON CONSTRAINT tenant_users_role_check ON tenant_users IS 
'Validates role: super_admin, coordinator, admin, instructor, nurse, viewer (simulation-only students)';

-- Step 3: Verify all roles are now valid
SELECT DISTINCT role, COUNT(*) as count
FROM tenant_users
GROUP BY role
ORDER BY role;
