-- ============================================================================
-- CREATE STUDENT ROSTER TABLE
-- ============================================================================
-- Migration: Add student_roster table for program student management
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================

-- Add 'student' role to user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'student';
        RAISE NOTICE '✅ Added student role to user_role enum';
    ELSE
        RAISE NOTICE '⚠️ student role already exists';
    END IF;
END $$;

COMMIT;

COMMENT ON TYPE user_role IS 'User roles: super_admin (cross-tenant), coordinator (tenant-wide), admin (tenant admin), instructor (program-scoped), nurse (clinical staff), student (learner)';

-- Drop table if exists (for idempotency)
DROP TABLE IF EXISTS student_roster CASCADE;

-- Create student_roster table
CREATE TABLE student_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  cohort_id UUID,  -- Nullable for future cohort management
  student_number TEXT NOT NULL,  -- Institutional student ID
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT student_roster_unique_user_program UNIQUE (user_id, program_id),
  CONSTRAINT student_roster_unique_student_number UNIQUE (student_number)
);

-- Indexes for performance
CREATE INDEX idx_student_roster_program_id ON student_roster(program_id);
CREATE INDEX idx_student_roster_user_id ON student_roster(user_id);
CREATE INDEX idx_student_roster_program_active ON student_roster(program_id, is_active) WHERE is_active = true;
CREATE INDEX idx_student_roster_cohort_id ON student_roster(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX idx_student_roster_student_number ON student_roster(student_number);

-- Enable RLS
ALTER TABLE student_roster ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see students in programs they have access to
DROP POLICY IF EXISTS student_roster_view_program ON student_roster;
CREATE POLICY student_roster_view_program
  ON student_roster
  FOR SELECT
  TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.tenant_id IN (
        SELECT tenant_id 
        FROM tenant_users
        WHERE user_id = auth.uid() 
          AND is_active = true
      )
    )
  );

-- RLS Policy: Only instructors/coordinators/admins can manage students
DROP POLICY IF EXISTS student_roster_management ON student_roster;
CREATE POLICY student_roster_management
  ON student_roster
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  );

-- Add updated_at trigger
DROP TRIGGER IF EXISTS student_roster_updated_at_trigger ON student_roster;

CREATE OR REPLACE FUNCTION update_student_roster_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_roster_updated_at_trigger
  BEFORE UPDATE ON student_roster
  FOR EACH ROW
  EXECUTE FUNCTION update_student_roster_updated_at();

-- Comments
COMMENT ON TABLE student_roster IS 'Student enrollments in programs with cohort tracking';
COMMENT ON COLUMN student_roster.student_number IS 'Institutional student ID (unique across all programs)';
COMMENT ON COLUMN student_roster.cohort_id IS 'Optional cohort grouping (e.g., Fall 2025, Spring 2026)';

-- Verify table created
SELECT 
  'student_roster table created' as status,
  COUNT(*) as initial_count
FROM student_roster;

