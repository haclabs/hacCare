-- Migration: Add lab panels and lab results to patient transfer function
-- This updates duplicate_patient_to_tenant to include lab_panels and lab_results

-- Drop the old function (will be recreated from the enhanced version)
DROP FUNCTION IF EXISTS duplicate_patient_to_tenant(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

-- The updated function is in database/functions/duplicate_patient_to_tenant_enhanced.sql
-- Run that file after this migration

-- For immediate testing, here's a quick query to check if patient was duplicated:
-- SELECT id, patient_id, first_name, last_name, tenant_id FROM patients WHERE patient_id LIKE 'P%' ORDER BY created_at DESC LIMIT 10;

RAISE NOTICE '✅ Old duplicate_patient_to_tenant function dropped. Run database/functions/duplicate_patient_to_tenant_enhanced.sql to recreate with lab support.';
