-- Acknowledge ALL remaining alerts for NSG25 to completely reset alert system
-- This will clear all unacknowledged alerts regardless of age

-- Show what will be acknowledged
SELECT 
    'All Remaining Alerts to Acknowledge' as section,
    COUNT(*) as alert_count,
    STRING_AGG(DISTINCT pa.alert_type::text, ', ') as alert_types,
    STRING_AGG(DISTINCT pa.patient_name, ', ') as affected_patients,
    MIN(pa.created_at) as oldest_alert,
    MAX(pa.created_at) as newest_alert
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pa.acknowledged = false;

-- Acknowledge ALL remaining unacknowledged alerts for NSG25
UPDATE patient_alerts
SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid()
FROM patients p
WHERE patient_alerts.patient_id = p.id
AND p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND patient_alerts.acknowledged = false;

-- Verify complete cleanup
SELECT 
    'Final Verification' as section,
    COUNT(*) as remaining_alerts,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SYSTEM READY FOR NEW ALERTS'
        ELSE '⚠️ STILL HAS UNACKNOWLEDGED ALERTS'
    END as status
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pa.acknowledged = false;