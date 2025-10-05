-- Grant permissions for the snapshot functions
-- This ensures they can be called via the Supabase API

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION save_template_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb) TO authenticated;

-- Grant execute permissions to anon users (if needed)
GRANT EXECUTE ON FUNCTION save_template_snapshot(uuid) TO anon;
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb) TO anon;

-- Verify grants
SELECT 
  routine_name as function_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' 
  AND routine_name IN ('save_template_snapshot', 'restore_snapshot_to_tenant')
ORDER BY routine_name, grantee;
