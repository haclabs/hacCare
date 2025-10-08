-- ============================================================================
-- FIX: Disable or drop the auto_set_tenant_id trigger on patient_alerts
-- ============================================================================

-- OPTION 1: Drop the trigger on patient_alerts (since we're passing tenant_id explicitly)
DROP TRIGGER IF EXISTS set_tenant_id ON patient_alerts;
DROP TRIGGER IF EXISTS auto_set_tenant_id ON patient_alerts;
DROP TRIGGER IF EXISTS auto_set_tenant_id_trigger ON patient_alerts;
DROP TRIGGER IF EXISTS before_insert_set_tenant_id ON patient_alerts;

-- OPTION 2: If the trigger exists with a different name, find it:
-- (Run find-trigger.sql first to see the exact name)

-- After dropping, verify no triggers remain
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'patient_alerts';

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

-- Now try the insert again
SELECT create_patient_alert_v3(
  '4eea8bb8-335a-47ea-95a6-d5ce6cf2ca61'::uuid,
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
  'vital_signs',
  'Test alert - trigger removed',
  'Test Patient',
  'medium',
  NULL
);
