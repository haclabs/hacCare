-- Check existing alerts for NSG25 tenant to understand duplicate prevention

-- 1. Show all current alerts for NSG25 patients
SELECT 
    'Current NSG25 Alerts' as section,
    pa.id,
    pa.alert_type,
    pa.message,
    pa.patient_name,
    pa.priority,
    pa.acknowledged,
    pa.created_at,
    pa.expires_at,
    CASE 
        WHEN pa.expires_at > NOW() THEN '🟢 ACTIVE'
        ELSE '🔴 EXPIRED'
    END as status
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
ORDER BY pa.created_at DESC;

-- 2. Show recent alerts (last 24 hours) to see duplicate prevention in action
SELECT 
    'Recent Alerts (24h)' as section,
    pa.patient_name,
    pa.alert_type,
    pa.message,
    pa.acknowledged,
    pa.created_at,
    EXTRACT(EPOCH FROM (NOW() - pa.created_at))/3600 as hours_ago
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pa.created_at > NOW() - INTERVAL '24 hours'
ORDER BY pa.created_at DESC;

-- 3. Check if there are unacknowledged alerts that might be blocking new ones
SELECT 
    'Unacknowledged Alerts' as section,
    COUNT(*) as unacknowledged_count,
    STRING_AGG(DISTINCT pa.alert_type::text, ', ') as alert_types,
    STRING_AGG(DISTINCT pa.patient_name, ', ') as affected_patients
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pa.acknowledged = false
AND pa.expires_at > NOW();

-- 4. Show alerts created within the last hour (duplicate prevention window)
SELECT 
    'Alerts in Last Hour (Duplicate Window)' as section,
    pa.patient_name,
    pa.alert_type,
    LEFT(pa.message, 50) || '...' as message_preview,
    pa.acknowledged,
    EXTRACT(EPOCH FROM (NOW() - pa.created_at))/60 as minutes_ago
FROM patient_alerts pa
JOIN patients p ON pa.patient_id = p.id
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
AND pa.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pa.created_at DESC;