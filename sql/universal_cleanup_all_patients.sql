-- Universal cleanup for all patients across all tenants
-- This will clear all unacknowledged alerts system-wide

-- Show current unacknowledged alert count by tenant before cleanup
SELECT 
    'Before Cleanup - Alerts by Tenant' as section,
    t.name as tenant_name,
    t.subdomain,
    COUNT(*) as alert_count,
    STRING_AGG(DISTINCT pa.alert_type::text, ', ') as alert_types
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
JOIN tenants t ON p.tenant_id = t.id
WHERE pa.acknowledged = false
GROUP BY t.id, t.name, t.subdomain
ORDER BY alert_count DESC;

-- Acknowledge ALL unacknowledged alerts across ALL tenants and patients
UPDATE patient_alerts
SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid()
WHERE acknowledged = false;

-- Show results
SELECT 
    'After Cleanup Verification' as section,
    COUNT(*) as remaining_alerts,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL TENANTS READY - NO DUPLICATES POSSIBLE'
        ELSE '⚠️ STILL HAS UNACKNOWLEDGED ALERTS'
    END as status
FROM patient_alerts
WHERE acknowledged = false;