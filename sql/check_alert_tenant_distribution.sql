-- Check which tenants the 14 alerts belong to

-- 1. Show alert distribution by tenant
SELECT 
    'Alert Distribution by Tenant' as section,
    t.name as tenant_name,
    t.subdomain,
    t.id as tenant_id,
    COUNT(pa.id) as alert_count,
    STRING_AGG(DISTINCT pa.alert_type::text, ', ') as alert_types
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
JOIN tenants t ON p.tenant_id = t.id
WHERE pa.acknowledged = false
GROUP BY t.id, t.name, t.subdomain
ORDER BY alert_count DESC;

-- 2. Show NSG25 specific alerts
SELECT 
    'NSG25 Alerts' as section,
    pa.id,
    pa.patient_name,
    pa.alert_type,
    LEFT(pa.message, 60) || '...' as message_preview,
    pa.priority,
    pa.created_at,
    pa.tenant_id,
    p.tenant_id as patient_tenant_id
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = '4b181815-24ae-44cb-9128-e74fefb35e13'
AND pa.acknowledged = false
ORDER BY pa.created_at DESC;

-- 3. Check if alert tenant_id matches patient tenant_id
SELECT 
    'Tenant ID Mismatch Check' as section,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN pa.tenant_id = p.tenant_id THEN 1 END) as matching_tenant_ids,
    COUNT(CASE WHEN pa.tenant_id != p.tenant_id THEN 1 END) as mismatched_tenant_ids,
    CASE 
        WHEN COUNT(CASE WHEN pa.tenant_id != p.tenant_id THEN 1 END) > 0 
        THEN '⚠️ TENANT ID MISMATCH FOUND'
        ELSE '✅ ALL TENANT IDS MATCH'
    END as status
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE pa.acknowledged = false;