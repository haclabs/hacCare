-- ===========================================================================
-- CHECK FOR ORPHANED ALERTS
-- ===========================================================================
-- Purpose: Identify patient_alerts with NULL tenant_id before migration
-- Run this BEFORE deploying 015_security_hardening.sql
-- ===========================================================================

DO $$ BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ORPHANED ALERTS DETECTION SCRIPT';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 1: COUNT ORPHANED ALERTS
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '📊 Step 1: Count Orphaned Alerts (NULL tenant_id)';
  RAISE NOTICE '---';
END $$;

SELECT 
  COUNT(*) as orphaned_alert_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Database is clean - no orphaned alerts'
    WHEN COUNT(*) < 10 THEN '⚠️  Found ' || COUNT(*) || ' orphaned alerts (manageable)'
    ELSE '❌ Found ' || COUNT(*) || ' orphaned alerts (needs investigation)'
  END as assessment
FROM patient_alerts 
WHERE tenant_id IS NULL;

-- ============================================================================
-- STEP 2: SHOW ORPHANED ALERT DETAILS
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Step 2: Orphaned Alert Details';
  RAISE NOTICE '---';
END $$;

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

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '(Showing max 20 most recent orphaned alerts)';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: ANALYZE ORPHANED ALERTS BY TYPE
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '📊 Step 3: Orphaned Alerts by Type';
  RAISE NOTICE '---';
END $$;

SELECT 
  alert_type,
  COUNT(*) as count,
  COUNT(CASE WHEN acknowledged THEN 1 END) as acknowledged_count,
  ROUND(COUNT(CASE WHEN acknowledged THEN 1 END)::numeric / NULLIF(COUNT(*), 0)::numeric * 100, 2) as ack_percentage
FROM patient_alerts 
WHERE tenant_id IS NULL
GROUP BY alert_type
ORDER BY count DESC;

-- ============================================================================
-- STEP 4: ANALYZE ORPHANED ALERTS BY AGE
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Step 4: Orphaned Alerts by Age';
  RAISE NOTICE '---';
END $$;

WITH age_categories AS (
  SELECT 
    CASE 
      WHEN created_at > NOW() - INTERVAL '1 day' THEN 'Last 24 hours'
      WHEN created_at > NOW() - INTERVAL '7 days' THEN 'Last week'
      WHEN created_at > NOW() - INTERVAL '30 days' THEN 'Last month'
      WHEN created_at > NOW() - INTERVAL '90 days' THEN 'Last 3 months'
      ELSE 'Older than 3 months'
    END as age_category,
    CASE 
      WHEN created_at > NOW() - INTERVAL '1 day' THEN 1
      WHEN created_at > NOW() - INTERVAL '7 days' THEN 2
      WHEN created_at > NOW() - INTERVAL '30 days' THEN 3
      WHEN created_at > NOW() - INTERVAL '90 days' THEN 4
      ELSE 5
    END as sort_order
  FROM patient_alerts 
  WHERE tenant_id IS NULL
)
SELECT 
  age_category,
  COUNT(*) as count
FROM age_categories
GROUP BY age_category, sort_order
ORDER BY sort_order;

-- ============================================================================
-- STEP 5: CHECK IF PATIENTS EXIST FOR ORPHANED ALERTS
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Step 5: Patient Existence Check';
  RAISE NOTICE '---';
END $$;

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

-- ============================================================================
-- STEP 6: SHOW PATIENT DETAILS FOR ORPHANED ALERTS
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Step 6: Patient Details (if patients exist)';
  RAISE NOTICE '---';
END $$;

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

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '(Showing top 10 patients with orphaned alerts)';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 7: ANALYSIS AND RECOMMENDATIONS
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '📊 ANALYSIS AND RECOMMENDATIONS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;

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

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📝 Step 8: Backup Script Generation';
  RAISE NOTICE '---';
  RAISE NOTICE 'If you want to backup orphaned alerts before deletion, run:';
  RAISE NOTICE '';
END $$;

SELECT 'COPY (SELECT * FROM patient_alerts WHERE tenant_id IS NULL) TO ''/tmp/orphaned_alerts_backup_' || 
       to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS') || '.csv'' WITH CSV HEADER;' as backup_command;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ORPHANED ALERTS CHECK COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What to do next:';
  RAISE NOTICE '';
  RAISE NOTICE '  1. Review the analysis above';
  RAISE NOTICE '  2. If count > 0, decide whether to:';
  RAISE NOTICE '     a) Back up the orphaned alerts (use generated command above)';
  RAISE NOTICE '     b) Investigate why they exist';
  RAISE NOTICE '     c) Proceed with automatic cleanup';
  RAISE NOTICE '  3. Run 015_security_hardening.sql when ready';
  RAISE NOTICE '';
  RAISE NOTICE 'The migration will automatically:';
  RAISE NOTICE '  - Delete orphaned alerts';
  RAISE NOTICE '  - Add policy to prevent future NULL tenant_id alerts';
  RAISE NOTICE '  - Verify cleanup was successful';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;
