-- Force PostgREST to reload its schema cache
-- This makes new functions immediately available via the API

NOTIFY pgrst, 'reload schema';

-- Alternative: Check if the function is visible in pg_catalog
SELECT 
  p.proname,
  n.nspname as schema_name,
  'Function exists and should be available via API' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('save_template_snapshot', 'restore_snapshot_to_tenant');
