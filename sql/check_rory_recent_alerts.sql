-- Check for recent alerts that might be blocking new ones

-- 1. Show recent alerts for Rory Arbuckle (last 10 minutes)
SELECT 
    'Recent Rory Arbuckle Alerts' as section,
    id,
    alert_type,
    LEFT(message, 60) || '...' as message_preview,
    acknowledged,
    priority,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM patient_alerts
WHERE patient_name = 'Rory Arbuckle'
AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- 2. Show all unacknowledged alerts for Rory (any time)
SELECT 
    'All Unacknowledged Rory Alerts' as section,
    id,
    alert_type,
    LEFT(message, 60) || '...' as message_preview,
    acknowledged,
    priority,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM patient_alerts
WHERE patient_name = 'Rory Arbuckle'
AND acknowledged = false
ORDER BY created_at DESC;

-- 3. Quick cleanup - acknowledge all Rory's existing alerts
UPDATE patient_alerts
SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid()
WHERE patient_name = 'Rory Arbuckle'
AND acknowledged = false;

-- 4. Final verification - should show 0 unacknowledged for Rory
SELECT 
    'Rory Cleanup Verification' as section,
    COUNT(*) as remaining_unacknowledged_alerts,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ RORY READY FOR NEW ALERTS'
        ELSE '⚠️ STILL HAS UNACKNOWLEDGED ALERTS'
    END as status
FROM patient_alerts
WHERE patient_name = 'Rory Arbuckle'
AND acknowledged = false;