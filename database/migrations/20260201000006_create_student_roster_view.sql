-- ============================================================================
-- CREATE STUDENT ROSTER VIEW WITH USER PROFILES
-- ============================================================================
-- Migration: Create view to join student_roster with user_profiles
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================
-- Purpose: PostgREST can't directly join student_roster to user_profiles
--          because they both reference auth.users independently. This view
--          provides a convenient joined representation.
-- ============================================================================

-- Drop view if exists (for idempotency)
DROP VIEW IF EXISTS student_roster_with_profiles CASCADE;

-- Create view joining student_roster with user_profiles
CREATE VIEW student_roster_with_profiles AS
SELECT 
  sr.id,
  sr.user_id,
  sr.program_id,
  sr.cohort_id,
  sr.student_number,
  sr.enrollment_date,
  sr.is_active,
  sr.notes,
  sr.created_at,
  sr.updated_at,
  sr.created_by,
  -- User profile fields (prefixed to avoid conflicts)
  up.email as user_email,
  up.first_name as user_first_name,
  up.last_name as user_last_name,
  up.role as user_role,
  up.phone as user_phone,
  up.simulation_only as user_simulation_only
FROM student_roster sr
LEFT JOIN user_profiles up ON sr.user_id = up.id;

-- Enable RLS on the view (inherits from student_roster policies)
ALTER VIEW student_roster_with_profiles SET (security_invoker = true);

-- Grant access to authenticated users
GRANT SELECT ON student_roster_with_profiles TO authenticated;

COMMENT ON VIEW student_roster_with_profiles IS 'Student roster with joined user profile information for easy querying';

-- Verify view created
SELECT 
  'student_roster_with_profiles view created' as status,
  COUNT(*) as row_count
FROM student_roster_with_profiles;
