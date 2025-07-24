-- Add tenant_id column to patient_alerts table
-- This is required for multi-tenant alert filtering

-- Step 1: Add the tenant_id column to patient_alerts table
ALTER TABLE patient_alerts 
ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Step 2: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_patient_alerts_tenant_id ON patient_alerts(tenant_id);

-- Step 3: Update existing alerts to have the correct tenant_id based on their patient
UPDATE patient_alerts 
SET tenant_id = (
  SELECT p.tenant_id 
  FROM patients p 
  WHERE p.id = patient_alerts.patient_id
)
WHERE tenant_id IS NULL 
AND EXISTS (
  SELECT 1 FROM patients p 
  WHERE p.id = patient_alerts.patient_id 
  AND p.tenant_id IS NOT NULL
);

-- Step 4: Delete orphaned alerts (alerts for patients that don't exist)
DELETE FROM patient_alerts 
WHERE patient_id NOT IN (SELECT id FROM patients);

-- Step 5: Add RLS policy for patient_alerts (if RLS is enabled)
-- First check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'patient_alerts';

-- Enable RLS if not already enabled
ALTER TABLE patient_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see alerts from their tenant" ON patient_alerts;

-- Create RLS policy for patient_alerts
CREATE POLICY "Users can only see alerts from their tenant"
  ON patient_alerts FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Step 6: Add trigger to automatically set tenant_id for new alerts
CREATE OR REPLACE FUNCTION set_alert_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If tenant_id is not provided, get it from the patient
  IF NEW.tenant_id IS NULL THEN
    SELECT p.tenant_id INTO NEW.tenant_id
    FROM patients p
    WHERE p.id = NEW.patient_id;
    
    -- If patient doesn't have a tenant_id, this will fail
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create alert: patient has no tenant association';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS patient_alerts_tenant_trigger ON patient_alerts;
CREATE TRIGGER patient_alerts_tenant_trigger
  BEFORE INSERT OR UPDATE ON patient_alerts
  FOR EACH ROW EXECUTE FUNCTION set_alert_tenant_id();

-- Step 7: Verification
SELECT 
  'patient_alerts schema updated' as status,
  COUNT(*) as total_alerts,
  COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as alerts_without_tenant,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as alerts_with_tenant
FROM patient_alerts;

-- Check that RLS is working
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'patient_alerts') as policy_count
FROM pg_tables 
WHERE tablename = 'patient_alerts';
