-- =====================================================
-- TEST RESET FUNCTION WITH BARCODE PRESERVATION
-- =====================================================

-- Step 1: Find an active simulation
SELECT 
  sa.id as simulation_id,
  sa.tenant_id,
  sa.status,
  sa.template_id,
  (SELECT COUNT(*) FROM patients WHERE tenant_id = sa.tenant_id) as patient_count,
  (SELECT COUNT(*) FROM devices WHERE tenant_id = sa.tenant_id) as device_count,
  (SELECT COUNT(*) FROM wounds WHERE tenant_id = sa.tenant_id) as wound_count,
  (SELECT array_agg(patient_id) FROM patients WHERE tenant_id = sa.tenant_id) as patient_barcodes_before
FROM simulation_active sa
WHERE sa.status = 'running'
LIMIT 1;

-- Step 2: Call reset function (REPLACE simulation_id with actual ID from above)
-- SELECT reset_simulation_for_next_session('PASTE_SIMULATION_ID_HERE');

-- Step 3: Verify results after reset
-- SELECT 
--   (SELECT COUNT(*) FROM patients WHERE tenant_id = 'PASTE_TENANT_ID_HERE') as patient_count,
--   (SELECT COUNT(*) FROM devices WHERE tenant_id = 'PASTE_TENANT_ID_HERE') as device_count,
--   (SELECT COUNT(*) FROM wounds WHERE tenant_id = 'PASTE_TENANT_ID_HERE') as wound_count,
--   (SELECT array_agg(patient_id) FROM patients WHERE tenant_id = 'PASTE_TENANT_ID_HERE') as patient_barcodes_after;

-- Step 4: Verify barcodes are UNCHANGED
-- The patient_barcodes_before and patient_barcodes_after should be IDENTICAL!
