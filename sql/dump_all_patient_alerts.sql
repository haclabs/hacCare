-- SQL Command to dump all patient alerts for all tenants
-- This will export all alerts including expired ones for analysis
-- Usage: Run this in your Supabase SQL editor or psql terminal

-- Basic dump of all alerts
SELECT 
    id,
    patient_id,
    patient_name,
    tenant_id,
    alert_type,
    message,
    priority,
    acknowledged,
    acknowledged_by,
    acknowledged_at,
    created_at,
    expires_at,
    -- Additional computed fields for analysis
    CASE 
        WHEN expires_at IS NULL THEN 'No Expiration'
        WHEN expires_at < NOW() THEN 'Expired'
        ELSE 'Active'
    END as expiration_status,
    CASE 
        WHEN acknowledged = true THEN 'Acknowledged'
        ELSE 'Unacknowledged'
    END as acknowledgment_status,
    -- Time since creation
    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_since_created,
    -- Time until expiration (negative if expired)
    CASE 
        WHEN expires_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (expires_at - NOW()))/3600
        ELSE NULL
    END as hours_until_expiration
FROM patient_alerts 
ORDER BY created_at DESC;

-- Summary statistics
SELECT 
    'ALERT SUMMARY' as report_section,
    COUNT(*)::text as total_alerts,
    COUNT(CASE WHEN acknowledged = false THEN 1 END)::text as unacknowledged_alerts,
    COUNT(CASE WHEN acknowledged = true THEN 1 END)::text as acknowledged_alerts,
    COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END)::text as expired_alerts,
    COUNT(CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 1 END)::text as active_alerts,
    COUNT(DISTINCT tenant_id)::text as unique_tenants,
    COUNT(DISTINCT patient_id)::text as unique_patients
FROM patient_alerts

UNION ALL

-- Alert type breakdown
SELECT 
    'BY TYPE: ' || alert_type as report_section,
    COUNT(*)::text as total_alerts,
    COUNT(CASE WHEN acknowledged = false THEN 1 END)::text as unacknowledged_alerts,
    COUNT(CASE WHEN acknowledged = true THEN 1 END)::text as acknowledged_alerts,
    COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END)::text as expired_alerts,
    COUNT(CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 1 END)::text as active_alerts,
    ''::text as unique_tenants,
    ''::text as unique_patients
FROM patient_alerts 
GROUP BY alert_type

UNION ALL

-- Priority breakdown
SELECT 
    'BY PRIORITY: ' || priority as report_section,
    COUNT(*)::text as total_alerts,
    COUNT(CASE WHEN acknowledged = false THEN 1 END)::text as unacknowledged_alerts,
    COUNT(CASE WHEN acknowledged = true THEN 1 END)::text as acknowledged_alerts,
    COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END)::text as expired_alerts,
    COUNT(CASE WHEN expires_at IS NULL OR expires_at > NOW() THEN 1 END)::text as active_alerts,
    ''::text as unique_tenants,
    ''::text as unique_patients
FROM patient_alerts 
GROUP BY priority

ORDER BY 1;

-- Recent alerts (last 48 hours) with patient details
SELECT 
    'RECENT ALERTS (Last 48 hours)' as section,
    pa.created_at,
    pa.patient_name,
    pa.tenant_id,
    pa.alert_type,
    pa.priority,
    pa.message,
    pa.acknowledged,
    CASE 
        WHEN pa.expires_at IS NULL THEN 'No Expiration'
        WHEN pa.expires_at < NOW() THEN 'Expired'
        ELSE 'Active'
    END as status
FROM patient_alerts pa
WHERE pa.created_at > NOW() - INTERVAL '48 hours'
ORDER BY pa.created_at DESC
LIMIT 100;

-- Tenant-wise alert distribution
SELECT 
    tenant_id,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN acknowledged = false THEN 1 END) as unacknowledged,
    COUNT(CASE WHEN alert_type = 'medication_due' THEN 1 END) as medication_alerts,
    COUNT(CASE WHEN alert_type = 'vital_signs' THEN 1 END) as vital_signs_alerts,
    COUNT(CASE WHEN alert_type = 'emergency' THEN 1 END) as emergency_alerts,
    COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_alerts,
    MIN(created_at) as oldest_alert,
    MAX(created_at) as newest_alert
FROM patient_alerts 
GROUP BY tenant_id
ORDER BY total_alerts DESC;