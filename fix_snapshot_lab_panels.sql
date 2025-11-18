-- FIX CORRUPTED SNAPSHOT - Remove ghost lab_panels from snapshot_data JSONB
-- Template ID: 3389f977-fe42-4bb1-8c8d-ffe8eed16eed

-- STEP 1: Backup current snapshot first (just in case)
SELECT 
  id,
  name,
  snapshot_version,
  jsonb_array_length(snapshot_data -> 'lab_panels') as panel_count,
  snapshot_data -> 'lab_panels' as all_panels
FROM simulation_templates
WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed';

-- STEP 2: Filter lab_panels to keep only the 2 valid ones for patient cc88ad01
-- This updates the snapshot_data JSONB to remove ghost panels

UPDATE simulation_templates
SET 
  snapshot_data = jsonb_set(
    snapshot_data,
    '{lab_panels}',
    (
      SELECT jsonb_agg(panel)
      FROM jsonb_array_elements(snapshot_data -> 'lab_panels') AS panel
      WHERE panel ->> 'patient_id' = 'cc88ad01-9179-47d7-b787-d7800f293a36'
    )
  ),
  snapshot_version = snapshot_version + 1,
  snapshot_taken_at = now()
WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed';

-- STEP 3: Verify the fix - should show only 2 lab_panels now
SELECT 
  id,
  name,
  snapshot_version,
  jsonb_array_length(snapshot_data -> 'lab_panels') as panel_count_after_fix,
  snapshot_data -> 'lab_panels' as remaining_panels
FROM simulation_templates
WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed';

-- STEP 4: Also check if we need to clean lab_results that reference deleted panels
-- (Results that belong to the 6 ghost panels should also be removed)
SELECT 
  'Checking lab_results in snapshot...' as step,
  jsonb_array_length(snapshot_data -> 'lab_results') as total_results
FROM simulation_templates
WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed';

-- Get the IDs of the 2 valid lab_panels we're keeping
WITH valid_panel_ids AS (
  SELECT jsonb_array_elements(snapshot_data -> 'lab_panels') ->> 'id' as panel_id
  FROM simulation_templates
  WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed'
)
-- Now update to keep only lab_results that reference valid panels
UPDATE simulation_templates
SET 
  snapshot_data = jsonb_set(
    snapshot_data,
    '{lab_results}',
    (
      SELECT COALESCE(jsonb_agg(result), '[]'::jsonb)
      FROM jsonb_array_elements(snapshot_data -> 'lab_results') AS result
      WHERE result ->> 'panel_id' IN (
        SELECT jsonb_array_elements(snapshot_data -> 'lab_panels') ->> 'id'
        FROM simulation_templates
        WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed'
      )
    )
  )
WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed';

-- STEP 5: Final verification
SELECT 
  'FINAL CHECK' as status,
  jsonb_array_length(snapshot_data -> 'lab_panels') as lab_panels_count,
  jsonb_array_length(snapshot_data -> 'lab_results') as lab_results_count,
  snapshot_version
FROM simulation_templates
WHERE id = '3389f977-fe42-4bb1-8c8d-ffe8eed16eed';

-- STEP 6: Test by launching a new simulation and checking active tenant
-- (Run this AFTER executing the updates above)
-- 
-- Then in a NEW simulation launched from this template, check:
-- SELECT COUNT(*) FROM lab_panels WHERE tenant_id = '<new_sim_tenant_id>';
-- Should return exactly 2, not 8!
