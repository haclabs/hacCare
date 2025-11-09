-- ============================================================================
-- DEBUG: Why are patient_medications not being deleted?
-- ============================================================================

\echo '🔍 DEBUG: Checking patient_medications deletion logic'
\echo ''

-- Step 1: Check config for patient_medications
\echo '📋 Step 1: Config for patient_medications'
SELECT 
  table_name,
  requires_id_mapping,
  has_tenant_id,
  delete_order,
  notes
FROM simulation_table_config
WHERE table_name = 'patient_medications';

\echo ''

-- Step 2: Count current medications in simulation tenant
\echo '📊 Step 2: Current medications in simulation tenant'
SELECT 
  COUNT(*) as total_meds,
  COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) as has_tenant_id,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as missing_tenant_id
FROM patient_medications pm
WHERE patient_id IN (
  SELECT id FROM patients WHERE tenant_id IN (SELECT tenant_id FROM simulation_active LIMIT 1)
);

\echo ''

-- Step 3: Show medication details
\echo '💊 Step 3: Medication details'
SELECT 
  pm.id,
  pm.patient_id,
  pm.tenant_id,
  pm.medication_name,
  pm.dosage,
  pm.created_at
FROM patient_medications pm
WHERE pm.patient_id IN (
  SELECT id FROM patients WHERE tenant_id IN (SELECT tenant_id FROM simulation_active LIMIT 1)
)
ORDER BY pm.created_at;

\echo ''

-- Step 4: Test DELETE query logic
\echo '🧪 Step 4: Would these meds be deleted by current DELETE loop?'
\echo '(Current loop skips tables where requires_id_mapping = true)'

SELECT 
  'NO - patient_medications has requires_id_mapping=true, so DELETE loop SKIPS it' as result;

\echo ''

-- Step 5: Show what DELETE query WOULD work
\echo '✅ Step 5: Correct DELETE query (via patient_id join)'
\echo 'DELETE FROM patient_medications WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = simulation_tenant_id);'

\echo ''
\echo '🐛 ROOT CAUSE: patient_medications needs ID mapping for barcodes BUT also needs deletion during reset'
\echo '💡 FIX: Add special handling like patient_vitals - delete via patient_id join'
