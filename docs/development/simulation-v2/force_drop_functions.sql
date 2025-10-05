-- ===========================================================================
-- FORCE DROP AND RECREATE: Snapshot Functions
-- ===========================================================================
-- This completely removes the old functions and creates fresh ones
-- Run this if you're still getting the "uuid = text" error
-- ===========================================================================

-- Step 1: FORCEFULLY drop old functions
DROP FUNCTION IF EXISTS save_template_snapshot(uuid) CASCADE;
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb) CASCADE;

-- Step 2: Verify they're gone
SELECT count(*) as remaining_functions
FROM information_schema.routines
WHERE routine_name IN ('save_template_snapshot', 'restore_snapshot_to_tenant')
  AND routine_schema = 'public';

-- Step 3: Now run the fix_medication_table_name.sql file again
-- Copy the entire contents of that file and paste it below this line:
-- (Or run it separately after running this file)

DO $$ 
BEGIN
  RAISE NOTICE 'Old functions dropped. Now run fix_medication_table_name.sql to recreate them.';
END $$;
