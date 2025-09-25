-- Bulk acknowledge old alerts to allow new ones to be created
-- This will acknowledge alerts older than 1 hour for NSG25 tenant

-- First, show what will be acknowledged
SELECT 
    'Alerts to be Acknowledged (>1 hour old)' as section,
    COUNT(*) as alert_count,
    STRING_AGG(DISTINCT pa.alert_type::text, ', ') as alert_types,
    STRING_AGG(DISTINCT pa.patient_name, ', ') as affected_patients,
    MIN(pa.created_at) as oldest_alert,
    MAX(pa.created_at) as newest_alert
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pa.acknowledged = false
AND pa.created_at < NOW() - INTERVAL '1 hour';

-- Acknowledge all alerts older than 1 hour for NSG25 patients
UPDATE patient_alerts
SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid()
FROM patients p
WHERE patient_alerts.patient_id = p.id
AND p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND patient_alerts.acknowledged = false
AND patient_alerts.created_at < NOW() - INTERVAL '1 hour';

-- Show results after acknowledgment
SELECT 
    'Remaining Unacknowledged Alerts' as section,
    COUNT(*) as remaining_count,
    COALESCE(STRING_AGG(DISTINCT pa.alert_type::text, ', '), 'None') as alert_types
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pa.acknowledged = false;