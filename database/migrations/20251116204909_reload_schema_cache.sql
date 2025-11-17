-- Force schema cache reload by making a trivial change
-- This ensures PostgREST picks up the wound_assessments table structure

DO $$
BEGIN
  -- Send notification to reload schema
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

-- Add a comment to force schema change detection
COMMENT ON TABLE wound_assessments IS 'Tracks device and wound assessments over time for monitoring and documentation (updated)';
