-- ===========================================================================
-- Verify that the functions were updated correctly
-- ===========================================================================
-- Run this to check if the functions exist and see their definitions
-- ===========================================================================

-- Check if save_template_snapshot function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'save_template_snapshot'
  AND routine_schema = 'public';

-- Check if restore_snapshot_to_tenant function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'restore_snapshot_to_tenant'
  AND routine_schema = 'public';

-- Test the function with your template ID
-- Replace 'your-template-id-here' with your actual template ID
-- SELECT save_template_snapshot('your-template-id-here'::uuid);
