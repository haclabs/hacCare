-- ===========================================================================
-- CHECK FOR ORPHANED ALERTS
-- ===========================================================================
-- Purpose: Identify patient_alerts with NULL tenant_id before migration
-- Run this BEFORE deploying 015_security_hardening.sql
-- ===========================================================================

\echo '============================================================================'
\echo 'ORPHANED ALERTS DETECTION SCRIPT'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- STEP 1: COUNT ORPHANED ALERTS
-- ============================================================================

\echo '📊 Step 1: Count Orphaned Alerts (NULL tenant_id)'
\echo '---'

SELECT 
  COUNT(*) as orphaned_alert_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Database is clean - no orphaned alerts'
    WHEN COUNT(*) < 10 THEN '⚠️  Found ' || COUNT(*) || ' orphaned alerts (manageable)'
    ELSE '❌ Found ' || COUNT(*) || ' orphaned alerts (needs investigation)'
  END as assessment
FROM patient_alerts 
WHERE tenant_id IS NULL;

\echo ''

-- ============================================================================
-- STEP 2: SHOW ORPHANED ALERT DETAILS
-- ============================================================================

\echo '📋 Step 2: Orphaned Alert Details'
\echo '---'

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM patient_alerts WHERE tenant_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % orphaned alerts - showing details below:', orphan_count;
  ELSE
    RAISE NOTICE 'No orphaned alerts found - database is clean! ✅';
  END IF;
END $$;

SELECT 
  id,
  patient_id,
  patient_name,
  alert_type,
  message,
  priority,
  acknowledged,
  created_at,
  AGE(NOW(), created_at) as age
FROM patient_alerts 
WHERE tenant_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

\echo ''
\echo '(Showing max 20 most recent orphaned alerts)'
\echo ''

-- ============================================================================
-- STEP 3: ANALYZE ORPHANED ALERTS BY TYPE
-- ============================================================================

\echo '📊 Step 3: Orphaned Alerts by Type'
\echo '---'

SELECT 
  alert_type,
  COUNT(*) as count,
  COUNT(CASE WHEN acknowledged THEN 1 END) as acknowledged_count,
  ROUND(COUNT(CASE WHEN acknowledged THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as ack_percentage
FROM patient_alerts 
WHERE tenant_id IS NULL
GROUP BY alert_type
ORDER BY count DESC;

\echo ''

-- ============================================================================
-- STEP 4: ANALYZE ORPHANED ALERTS BY AGE
-- ============================================================================

\echo '📊 Step 4: Orphaned Alerts by Age'
\echo '---'

SELECT 
  CASE 
    WHEN created_at > NOW() - INTERVAL '1 day' THEN 'Last 24 hours'
    WHEN created_at > NOW() - INTERVAL '7 days' THEN 'Last week'
    WHEN created_at > NOW() - INTERVAL '30 days' THEN 'Last month'
    WHEN created_at > NOW() - INTERVAL '90 days' THEN 'Last 3 months'
    ELSE 'Older than 3 months'
  END as age_category,
  COUNT(*) as count
FROM patient_alerts 
WHERE tenant_id IS NULL
GROUP BY age_category
ORDER BY 
  CASE age_category
    WHEN 'Last 24 hours' THEN 1
    WHEN 'Last week' THEN 2
    WHEN 'Last month' THEN 3
    WHEN 'Last 3 months' THEN 4
    ELSE 5
  END;

\echo ''

-- ============================================================================
-- STEP 5: CHECK IF PATIENTS EXIST FOR ORPHANED ALERTS
-- ============================================================================

\echo '📊 Step 5: Patient Existence Check'
\echo '---'

WITH orphaned_alerts AS (
  SELECT patient_id FROM patient_alerts WHERE tenant_id IS NULL
)
SELECT 
  COUNT(DISTINCT oa.patient_id) as total_patient_ids,
  COUNT(DISTINCT p.id) as existing_patients,
  COUNT(DISTINCT oa.patient_id) - COUNT(DISTINCT p.id) as missing_patients,
  CASE 
    WHEN COUNT(DISTINCT oa.patient_id) - COUNT(DISTINCT p.id) = 0 
    THEN '✅ All patients exist'
    ELSE '⚠️  ' || (COUNT(DISTINCT oa.patient_id) - COUNT(DISTINCT p.id)) || ' patients not found'
  END as status
FROM orphaned_alerts oa
LEFT JOIN patients p ON p.id = oa.patient_id;

\echo ''

-- ============================================================================
-- STEP 6: SHOW PATIENT DETAILS FOR ORPHANED ALERTS
-- ============================================================================

\echo '📋 Step 6: Patient Details (if patients exist)'
\echo '---'

SELECT 
  p.id,
  p.patient_id,
  p.first_name,
  p.last_name,
  p.tenant_id,
  t.name as tenant_name,
  COUNT(pa.id) as orphaned_alert_count
FROM patient_alerts pa
LEFT JOIN patients p ON p.id = pa.patient_id
LEFT JOIN tenants t ON t.id = p.tenant_id
WHERE pa.tenant_id IS NULL
GROUP BY p.id, p.patient_id, p.first_name, p.last_name, p.tenant_id, t.name
ORDER BY orphaned_alert_count DESC
LIMIT 10;

\echo ''
\echo '(Showing top 10 patients with orphaned alerts)'
\echo ''

-- ============================================================================
-- STEP 7: ANALYSIS AND RECOMMENDATIONS
-- ============================================================================

\echo '============================================================================'
\echo '📊 ANALYSIS AND RECOMMENDATIONS'
\echo '============================================================================'
\echo ''

DO $$
DECLARE
  orphan_count INTEGER;
  recent_count INTEGER;
  ack_count INTEGER;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO orphan_count FROM patient_alerts WHERE tenant_id IS NULL;
  SELECT COUNT(*) INTO recent_count FROM patient_alerts WHERE tenant_id IS NULL AND created_at > NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO ack_count FROM patient_alerts WHERE tenant_id IS NULL AND acknowledged = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ANALYSIS RESULTS ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Total orphaned alerts: %', orphan_count;
  RAISE NOTICE 'Created in last 7 days: %', recent_count;
  RAISE NOTICE 'Acknowledged alerts: %', ack_count;
  RAISE NOTICE '';
  
  IF orphan_count = 0 THEN
    RAISE NOTICE '✅ RECOMMENDATION: Database is clean - safe to proceed with migration';
  ELSIF recent_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Found % recent orphaned alerts', recent_count;
    RAISE NOTICE '   This suggests an ongoing issue creating alerts without tenant_id';
    RAISE NOTICE '   RECOMMENDATION: Investigate why alerts are being created with NULL tenant_id';
    RAISE NOTICE '   before proceeding with migration';
  ELSIF orphan_count < 100 THEN
    RAISE NOTICE '✅ RECOMMENDATION: Safe to clean up % orphaned alerts', orphan_count;
    RAISE NOTICE '   These appear to be legacy data - migration will remove them';
  ELSE
    RAISE NOTICE '❌ WARNING: Large number of orphaned alerts (%)!', orphan_count;
    RAISE NOTICE '   RECOMMENDATION: Manual review required before proceeding';
    RAISE NOTICE '   Consider backing up these alerts before deletion';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 8: GENERATE BACKUP SCRIPT (IF NEEDED)
-- ============================================================================

\echo ''
\echo '📝 Step 8: Backup Script Generation'
\echo '---'
\echo 'If you want to backup orphaned alerts before deletion, run:'
\echo ''

SELECT 'COPY (SELECT * FROM patient_alerts WHERE tenant_id IS NULL) TO ''/tmp/orphaned_alerts_backup_' || 
       to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS') || '.csv'' WITH CSV HEADER;' as backup_command;

\echo ''

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

\echo '============================================================================'
\echo 'ORPHANED ALERTS CHECK COMPLETE'
\echo '============================================================================'
\echo ''
\echo 'What to do next:'
\echo ''
\echo '  1. Review the analysis above'
\echo '  2. If count > 0, decide whether to:'
\echo '     a) Back up the orphaned alerts (use generated command above)'
\echo '     b) Investigate why they exist'
\echo '     c) Proceed with automatic cleanup'
\echo '  3. Run 015_security_hardening.sql when ready'
\echo ''
\echo 'The migration will automatically:'
\echo '  - Delete orphaned alerts'
\echo '  - Add policy to prevent future NULL tenant_id alerts'
\echo '  - Verify cleanup was successful'
\echo ''
\echo '============================================================================'
