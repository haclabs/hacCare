-- ============================================================================
-- ADD STUDENT ROSTER SYSTEM FOR PROGRAM-BASED LEARNING
-- ============================================================================
-- Migration: Create student_roster table and scheduled_simulations table
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================
-- Purpose: Enable instructors to manage student enrollments in programs,
--          track cohorts, and schedule simulation sessions with batch
--          student assignment capabilities.
-- ============================================================================

-- ============================================================================
-- 1. CREATE STUDENT_ROSTER TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  cohort_id UUID,  -- Nullable for Phase 2 cohort management
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

-- Indexes for performance at scale
CREATE INDEX idx_student_roster_program_id ON student_roster(program_id);
CREATE INDEX idx_student_roster_user_id ON student_roster(user_id);
CREATE INDEX idx_student_roster_program_active ON student_roster(program_id, is_active) WHERE is_active = true;
CREATE INDEX idx_student_roster_cohort_id ON student_roster(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX idx_student_roster_student_number ON student_roster(student_number);

-- Enable RLS
ALTER TABLE student_roster ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see students in programs they have access to
CREATE POLICY student_roster_view_program
  ON student_roster
  FOR SELECT
  TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.tenant_id IN (
        SELECT uta.tenant_id 
        FROM user_tenant_access uta 
        WHERE uta.user_id = auth.uid() 
          AND uta.is_active = true
      )
    )
  );

-- RLS Policy: Only instructors/coordinators/admins can manage students
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

COMMENT ON TABLE student_roster IS 'Student enrollments in programs with cohort tracking';
COMMENT ON COLUMN student_roster.student_number IS 'Institutional student ID (unique across all programs)';
COMMENT ON COLUMN student_roster.cohort_id IS 'Optional cohort grouping (Phase 2 - e.g., Fall 2025, Spring 2026)';

-- ============================================================================
-- 2. CREATE SCHEDULED_SIMULATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES simulation_templates(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  cohort_id UUID,  -- Nullable - which cohort this is scheduled for
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  room_location TEXT,  -- Physical or virtual location
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'launched', 'completed', 'cancelled')),
  launched_simulation_id UUID REFERENCES simulation_active(id),  -- Links to actual launched simulation
  recurrence_rule TEXT,  -- Phase 2 - iCal RRULE format for recurring sessions
  student_count INTEGER DEFAULT 0,  -- Cached count of assigned students
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT scheduled_end_after_start CHECK (scheduled_end > scheduled_start),
  CONSTRAINT duration_positive CHECK (duration_minutes > 0)
);

-- Indexes for calendar queries
CREATE INDEX idx_scheduled_simulations_program_id ON scheduled_simulations(program_id);
CREATE INDEX idx_scheduled_simulations_template_id ON scheduled_simulations(template_id);
CREATE INDEX idx_scheduled_simulations_scheduled_start ON scheduled_simulations(scheduled_start);
CREATE INDEX idx_scheduled_simulations_scheduled_end ON scheduled_simulations(scheduled_end);
CREATE INDEX idx_scheduled_simulations_instructor_id ON scheduled_simulations(instructor_id);
CREATE INDEX idx_scheduled_simulations_status ON scheduled_simulations(status);
CREATE INDEX idx_scheduled_simulations_cohort_id ON scheduled_simulations(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX idx_scheduled_simulations_date_range ON scheduled_simulations(scheduled_start, scheduled_end, status);

-- Enable RLS
ALTER TABLE scheduled_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see schedules in programs they have access to
CREATE POLICY scheduled_simulations_view_program
  ON scheduled_simulations
  FOR SELECT
  TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.tenant_id IN (
        SELECT uta.tenant_id 
        FROM user_tenant_access uta 
        WHERE uta.user_id = auth.uid() 
          AND uta.is_active = true
      )
    )
  );

-- RLS Policy: Only instructors/coordinators/admins can manage schedules
CREATE POLICY scheduled_simulations_management
  ON scheduled_simulations
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

COMMENT ON TABLE scheduled_simulations IS 'Calendar of scheduled simulation sessions for programs';
COMMENT ON COLUMN scheduled_simulations.recurrence_rule IS 'iCal RRULE format for recurring sessions (Phase 2)';

-- ============================================================================
-- 3. ADD PERFORMANCE INDEXES FOR EXISTING TABLES
-- ============================================================================

-- simulation_participants indexes (critical for student assignment queries)
CREATE INDEX IF NOT EXISTS idx_simulation_participants_user_id ON simulation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_participants_simulation_id ON simulation_participants(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_participants_user_role ON simulation_participants(user_id, role);

-- simulation_active indexes (critical for active simulation queries)
CREATE INDEX IF NOT EXISTS idx_simulation_active_status ON simulation_active(status);
CREATE INDEX IF NOT EXISTS idx_simulation_active_status_ends ON simulation_active(status, ends_at) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_simulation_active_tenant_status ON simulation_active(tenant_id, status);

-- patients index for tenant filtering (scale optimization)
CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON patients(tenant_id);

-- ============================================================================
-- 4. CREATE UPDATED_AT TRIGGERS
-- ============================================================================

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

CREATE OR REPLACE FUNCTION update_scheduled_simulations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduled_simulations_updated_at_trigger
  BEFORE UPDATE ON scheduled_simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_simulations_updated_at();

-- ============================================================================
-- 5. VERIFY INDEXES WITH EXPLAIN ANALYZE EXAMPLES
-- ============================================================================

-- Test Query 1: Get active students in program (should use idx_student_roster_program_active)
-- EXPLAIN ANALYZE
-- SELECT * FROM student_roster 
-- WHERE program_id = 'xxx' AND is_active = true
-- ORDER BY student_number
-- LIMIT 50;

-- Test Query 2: Get scheduled simulations in date range (should use idx_scheduled_simulations_date_range)
-- EXPLAIN ANALYZE
-- SELECT * FROM scheduled_simulations
-- WHERE scheduled_start >= '2026-02-01' 
--   AND scheduled_end <= '2026-03-01'
--   AND status = 'scheduled'
--   AND program_id = 'xxx';

-- Test Query 3: Get user simulation assignments (should use idx_simulation_participants_user_id)
-- EXPLAIN ANALYZE
-- SELECT sp.*, s.name, s.status
-- FROM simulation_participants sp
-- JOIN simulation_active s ON s.id = sp.simulation_id
-- WHERE sp.user_id = 'xxx'
--   AND s.status = 'running';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
SELECT 'student_roster' as table_name, COUNT(*) as row_count FROM student_roster
UNION ALL
SELECT 'scheduled_simulations' as table_name, COUNT(*) as row_count FROM scheduled_simulations;

-- Show indexes created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('student_roster', 'scheduled_simulations', 'simulation_participants', 'simulation_active', 'patients')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
