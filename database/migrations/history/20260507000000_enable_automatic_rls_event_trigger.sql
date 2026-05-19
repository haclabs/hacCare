-- Migration: Enable Automatic RLS via Event Trigger
-- Date: 2026-05-07
-- Purpose: Automatically enables Row Level Security on all new tables created
--          in the public schema. This ensures no table is ever accidentally
--          left without RLS protection (critical for HIPAA/multi-tenant isolation).
--
-- NOTE: Supabase offers this as a project-level option during setup ("Enable automatic RLS").
-- This migration documents and applies the same behavior manually so it is
-- tracked in version control alongside the rest of the schema.

-- Step 1: Function that runs after any DDL command
CREATE OR REPLACE FUNCTION public.enable_rls_on_new_tables()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    -- Only act on CREATE TABLE statements in the public schema
    IF obj.command_tag = 'CREATE TABLE' AND obj.schema_name = 'public' THEN
      EXECUTE format(
        'ALTER TABLE %s ENABLE ROW LEVEL SECURITY',
        obj.object_identity  -- already schema-qualified, e.g. "public.patients"
      );
    END IF;
  END LOOP;
END;
$$;

-- Step 2: Event trigger that fires after DDL completes
-- Drop first to make this migration idempotent (safe to re-run)
DROP EVENT TRIGGER IF EXISTS enable_rls_on_table_creation;

CREATE EVENT TRIGGER enable_rls_on_table_creation
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION public.enable_rls_on_new_tables();

-- Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_event_trigger WHERE evtname = 'enable_rls_on_table_creation'
  ) THEN
    RAISE NOTICE 'Event trigger "enable_rls_on_table_creation" created successfully.';
  ELSE
    RAISE EXCEPTION 'Event trigger creation failed!';
  END IF;
END;
$$;
