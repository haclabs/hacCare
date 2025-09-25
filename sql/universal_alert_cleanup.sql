-- Universal alert cleanup for super admin - acknowledge alerts across all tenants
-- Use this when super admin sees alerts from multiple tenants

-- Show all unacknowledged alerts across all tenants
SELECT 
    'All Unacknowledged Alerts by Tenant' as section,
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

-- Acknowledge ALL unacknowledged alerts across ALL tenants
UPDATE patient_alerts
SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid()
WHERE acknowledged = false;

-- Final verification - should show 0 alerts
SELECT 
    'Final System-Wide Verification' as section,
    COUNT(*) as remaining_alerts,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL TENANTS READY FOR NEW ALERTS'
        ELSE '⚠️ STILL HAS UNACKNOWLEDGED ALERTS'
    END as status
FROM patient_alerts
WHERE acknowledged = false;