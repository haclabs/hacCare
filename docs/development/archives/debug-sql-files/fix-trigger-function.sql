-- ============================================================================
-- FIX: Update auto_set_tenant_id function to handle when tenant_id is already provided
-- ============================================================================

-- First, get the current function definition
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'auto_set_tenant_id';

-- Drop and recreate the function to skip setting tenant_id if it's already provided
DROP FUNCTION IF EXISTS auto_set_tenant_id() CASCADE;

CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If tenant_id is already set (e.g., from RPC function), don't override it
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Otherwise, try to get it from user's profile
  -- (This is for backward compatibility with direct inserts)
  SELECT tenant_id INTO NEW.tenant_id
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- If still null, try from tenant_users
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger on all affected tables
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_alerts;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_vitals;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_medications;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_notes;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON medication_administrations;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON diabetic_records;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON bowel_records;
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patients;

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_alerts
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_vitals
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_medications
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_notes
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON medication_administrations
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON diabetic_records
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON bowel_records
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION auto_set_tenant_id IS 
  'Automatically sets tenant_id from user profile if not already provided. Skips if tenant_id is already set by RPC function.';

-- Verify triggers were created
SELECT 
  event_object_table AS table_name,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'set_tenant_id_before_insert'
ORDER BY event_object_table;
