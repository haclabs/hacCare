-- ===========================================================================
-- DEBUG: Test save_template_snapshot function directly
-- ===========================================================================
-- This will help identify if the issue is in the SQL function or the JS call
-- ===========================================================================

-- Step 1: Check if function exists
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'save_template_snapshot'
  AND routine_schema = 'public';

-- Step 2: Get your template ID and test manually
-- First, find your template ID:
SELECT id, name, status, tenant_id 
FROM simulation_templates
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Test the function with a real template ID
-- REPLACE 'your-template-id-here' with an actual UUID from the query above
-- SELECT save_template_snapshot('your-template-id-here'::uuid);

-- Step 4: If you get an error, check what line number it references
-- The error "operator does not exist: uuid = text" suggests comparison issue

-- Step 5: Check if there's an OLD version still cached
-- Drop and recreate:
DROP FUNCTION IF EXISTS save_template_snapshot(uuid);
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb);

-- Then re-run the fix_medication_table_name.sql file
