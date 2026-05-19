-- ============================================================================
-- UPDATE TENANT_USERS CONSTRAINT TO INCLUDE STUDENT ROLE
-- ============================================================================
-- Migration: Add 'student' to tenant_users role check constraint
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================
-- Purpose: Students need to be added to tenant_users when they join simulations
--          The CHECK constraint must allow the 'student' role
-- ============================================================================

-- Drop old constraint
ALTER TABLE tenant_users 
DROP CONSTRAINT IF EXISTS tenant_users_role_check;

-- Add new constraint with student role included
ALTER TABLE tenant_users
ADD CONSTRAINT tenant_users_role_check 
CHECK (role IN ('super_admin', 'coordinator', 'admin', 'instructor', 'nurse', 'student', 'viewer'));

COMMENT ON CONSTRAINT tenant_users_role_check ON tenant_users IS 
'Validates role: super_admin, coordinator, admin, instructor, nurse, student, viewer';

-- Verify constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'tenant_users_role_check';

