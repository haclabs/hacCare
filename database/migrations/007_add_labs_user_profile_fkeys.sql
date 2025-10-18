-- Add foreign key constraints from lab tables to user_profiles
-- This allows Supabase to join lab_panels/lab_results with user_profiles

-- Grant SELECT permission on user_tenant_cache to authenticated users
-- This is needed for RLS policies that reference this materialized view
GRANT SELECT ON user_tenant_cache TO authenticated;

-- Temporarily disable RLS to avoid permission issues during migration
ALTER TABLE lab_panels DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ack_events DISABLE ROW LEVEL SECURITY;

-- Drop existing foreign keys that point to auth.users
ALTER TABLE lab_panels DROP CONSTRAINT IF EXISTS lab_panels_entered_by_fkey;
ALTER TABLE lab_results DROP CONSTRAINT IF EXISTS lab_results_entered_by_fkey;
ALTER TABLE lab_results DROP CONSTRAINT IF EXISTS lab_results_ack_by_fkey;
ALTER TABLE lab_ack_events DROP CONSTRAINT IF EXISTS lab_ack_events_ack_by_fkey;

-- Add foreign keys pointing to user_profiles instead
ALTER TABLE lab_panels 
  ADD CONSTRAINT lab_panels_entered_by_fkey 
  FOREIGN KEY (entered_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE lab_results 
  ADD CONSTRAINT lab_results_entered_by_fkey 
  FOREIGN KEY (entered_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE lab_results 
  ADD CONSTRAINT lab_results_ack_by_fkey 
  FOREIGN KEY (ack_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

ALTER TABLE lab_ack_events 
  ADD CONSTRAINT lab_ack_events_ack_by_fkey 
  FOREIGN KEY (ack_by) 
  REFERENCES user_profiles(id) 
  ON DELETE SET NULL;

-- Create indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_lab_panels_entered_by ON lab_panels(entered_by);
CREATE INDEX IF NOT EXISTS idx_lab_results_entered_by ON lab_results(entered_by);
CREATE INDEX IF NOT EXISTS idx_lab_results_ack_by ON lab_results(ack_by);
CREATE INDEX IF NOT EXISTS idx_lab_ack_events_ack_by ON lab_ack_events(ack_by);

-- Re-enable RLS
ALTER TABLE lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ack_events ENABLE ROW LEVEL SECURITY;

COMMENT ON CONSTRAINT lab_panels_entered_by_fkey ON lab_panels 
  IS 'Foreign key to user_profiles for Supabase joins';
COMMENT ON CONSTRAINT lab_results_entered_by_fkey ON lab_results 
  IS 'Foreign key to user_profiles for Supabase joins';
COMMENT ON CONSTRAINT lab_results_ack_by_fkey ON lab_results 
  IS 'Foreign key to user_profiles for Supabase joins';
COMMENT ON CONSTRAINT lab_ack_events_ack_by_fkey ON lab_ack_events 
  IS 'Foreign key to user_profiles for Supabase joins';
