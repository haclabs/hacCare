-- Check if override data is being saved
SELECT 
  id,
  medication_name,
  barcode_scanned,
  patient_barcode_scanned,
  medication_barcode_scanned,
  override_reason,
  witness_name,
  timestamp
FROM medication_administrations
ORDER BY created_at DESC
LIMIT 3;
