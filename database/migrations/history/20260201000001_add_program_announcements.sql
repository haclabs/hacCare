-- ============================================================================
-- ADD PROGRAM ANNOUNCEMENTS TABLE
-- ============================================================================
-- Migration: Create announcements table for program communications
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================

-- ============================================================================
-- 1. CREATE PROGRAM_ANNOUNCEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS program_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General' CHECK (category IN ('General', 'Templates', 'Training', 'Students', 'Important', 'Reminder')),
  is_pinned BOOLEAN DEFAULT false,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_name TEXT,  -- Cached for display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Optional expiration date
  
  CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_program_announcements_program_id ON program_announcements(program_id);
CREATE INDEX idx_program_announcements_author_id ON program_announcements(author_id);
CREATE INDEX idx_program_announcements_is_pinned ON program_announcements(is_pinned);
CREATE INDEX idx_program_announcements_created_at ON program_announcements(created_at DESC);
CREATE INDEX idx_program_announcements_category ON program_announcements(category);

-- Enable RLS
ALTER TABLE program_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see announcements in programs they have access to
CREATE POLICY program_announcements_view_program
  ON program_announcements
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

-- RLS Policy: Only instructors/coordinators/admins can create/manage announcements
CREATE POLICY program_announcements_management
  ON program_announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  );

-- Update trigger
CREATE OR REPLACE FUNCTION update_program_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER program_announcements_updated_at_trigger
  BEFORE UPDATE ON program_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_program_announcements_updated_at();

-- Comments
COMMENT ON TABLE program_announcements IS 'Announcements and updates for program communications';
COMMENT ON COLUMN program_announcements.is_pinned IS 'Pinned announcements appear at the top';
COMMENT ON COLUMN program_announcements.expires_at IS 'Optional expiration date for temporary announcements';
COMMENT ON COLUMN program_announcements.author_name IS 'Cached author name for performance';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify table created
SELECT 
  'program_announcements' as table_name, 
  COUNT(*) as row_count 
FROM program_announcements;
