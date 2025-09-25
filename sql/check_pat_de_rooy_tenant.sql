-- Check which tenant Pat de Rooy belongs to and clear those alerts too

-- 1. Find Pat de Rooy's tenant
SELECT 
    'Pat de Rooy Tenant Info' as section,
    p.id as patient_id,
    p.first_name,
    p.last_name,
    p.tenant_id,
    t.name as tenant_name,
    t.subdomain as tenant_subdomain
FROM patients p
JOIN tenants t ON p.tenant_id = t.id
WHERE p.first_name = 'Pat' AND p.last_name = 'de Rooy';

-- 2. Check alerts for Pat's tenant
SELECT 
    'Pat de Rooy Tenant Alerts' as section,
    COUNT(*) as unacknowledged_alerts,
    STRING_AGG(DISTINCT pa.alert_type::text, ', ') as alert_types,
    STRING_AGG(DISTINCT pa.patient_name, ', ') as affected_patients
FROM patient_alerts pa
WHERE pa.tenant_id = '744553ca-5455-4c5b-b235-5bf31c5072f5'
AND pa.acknowledged = false;

-- 3. Show recent alerts for Pat's tenant (last hour)
SELECT 
    'Recent Alerts for Pat Tenant' as section,
    pa.patient_name,
    pa.alert_type,
    LEFT(pa.message, 50) || '...' as message_preview,
    pa.acknowledged,
    EXTRACT(EPOCH FROM (NOW() - pa.created_at))/60 as minutes_ago
FROM patient_alerts pa
WHERE pa.tenant_id = '744553ca-5455-4c5b-b235-5bf31c5072f5'
AND pa.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pa.created_at DESC;