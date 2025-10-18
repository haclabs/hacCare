# Security Hardening Deployment Guide
**Date:** October 18, 2025  
**Migration:** 015_security_hardening.sql  
**Risk Level:** LOW - Safe for Production

---

## 📋 Quick Start

```bash
# Step 1: Check for orphaned alerts
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME \
  -f database/maintenance/check_orphaned_alerts.sql

# Step 2: Review the output, then deploy migration
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME \
  -f database/migrations/015_security_hardening.sql

# Step 3: Run test suite to verify
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME \
  -f database/maintenance/test_security_hardening.sql
```

---

## 📚 Files Created

### 1. **`database/migrations/015_security_hardening.sql`**
Main migration file that implements security hardening.

**Changes:**
- ✅ Removes CMS tables (cms_audit_log, landing_page_content, landing_page_content_history)
- ✅ Fixes overly permissive INSERT policies (bowel_records, patient_admission_records, patient_advanced_directives, patient_wounds)
- ✅ Simplifies user_profiles_bulletproof_delete policy
- ✅ Cleans up orphaned alerts with NULL tenant_id
- ✅ Hardens patient_alerts RLS policy

**Safety:**
- Tested against simulation, alert, and multi-tenant systems
- Built-in verification checks
- Automatic rollback on failure

---

### 2. **`database/maintenance/check_orphaned_alerts.sql`**
Pre-migration diagnostic script.

**Purpose:**
- Count orphaned alerts (NULL tenant_id)
- Analyze by type, age, and status
- Check if associated patients exist
- Generate backup script if needed
- Provide recommendations

**Run this FIRST** to understand database state before migration.

---

### 3. **`database/maintenance/test_security_hardening.sql`**
Post-migration test suite.

**Tests:**
- ✅ CMS tables removed
- ✅ No orphaned alerts remain
- ✅ New policies created
- ✅ Old policies removed
- ✅ Simulation policies intact
- ✅ Critical functions exist
- ✅ Multi-tenant isolation working
- ✅ RLS enabled on all tables
- 📊 Security DEFINER function audit
- 📊 Policy count summary

**Run this AFTER** migration to verify success.

---

## 🎯 What This Migration Does

### Phase 1: Remove CMS Remnants (ZERO RISK)
CMS feature was abandoned - these tables have no dependencies:
- `cms_audit_log` ❌
- `landing_page_content` ❌
- `landing_page_content_history` ❌

### Phase 2: Fix Overly Permissive INSERT Policies (LOW RISK)

**Problem:** Anyone authenticated can insert to ANY tenant
```sql
WITH CHECK (true)  -- ❌ No validation!
```

**Solution:** Proper tenant validation
```sql
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
```

**Tables hardened:**
- `bowel_records`
- `patient_admission_records`
- `patient_advanced_directives`
- `patient_wounds`

### Phase 3: Simplify Complex Policies (ZERO RISK)

**Before:**
```sql
COALESCE((id)::text, ''::text) = COALESCE((auth.uid())::text, ''::text)
```

**After:**
```sql
id = auth.uid() OR current_user_is_super_admin()
```

### Phase 4: Fix patient_alerts NULL Tenant (LOW RISK)

**Problem:** Alerts with NULL tenant_id bypass RLS
**Solution:** 
1. Clean up orphaned alerts
2. Prevent future NULL tenant_id alerts

**Note:** Simulation alerts unaffected (use in-memory storage)

---

## ⚠️ What This Migration Does NOT Do

### Deferred to Future Releases:

1. **Change {public} → {authenticated}** 
   - Lower priority security improvement
   - Will batch with other policy updates
   - ~60 policies affected

2. **Consolidate Duplicate Policies**
   - Performance optimization, not security critical
   - 24 duplicate policies identified
   - Can be done incrementally

3. **backup_audit_log Hardening**
   - Needs backup system testing first
   - Will address in separate migration

---

## 🔍 Pre-Deployment Checklist

### Required Steps:

- [ ] **Review Risk Analysis** (`docs/SECURITY_HARDENING_RISK_ANALYSIS.md`)
- [ ] **Run Orphaned Alerts Check** (`check_orphaned_alerts.sql`)
- [ ] **Review orphaned alert analysis** - Ensure count is acceptable
- [ ] **Backup database** (if orphaned alerts > 100)
- [ ] **Schedule maintenance window** (5-10 minutes)
- [ ] **Notify team** of deployment

### Optional Steps:

- [ ] Run in staging environment first
- [ ] Backup orphaned alerts to CSV (if needed)
- [ ] Review SECURITY DEFINER functions audit
- [ ] Test simulation system manually

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment Check
```bash
# Check for orphaned alerts
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB \
  -f database/maintenance/check_orphaned_alerts.sql > orphaned_alerts_report.txt

# Review the report
cat orphaned_alerts_report.txt
```

**Decision Point:**
- If count = 0: ✅ Proceed to Step 2
- If count < 100 and old: ✅ Proceed to Step 2 (auto cleanup)
- If count > 100: ⚠️ Review manually, consider backup
- If recent alerts: 🚨 Investigate root cause first

### Step 2: Deploy Migration
```bash
# Run the migration
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB \
  -f database/migrations/015_security_hardening.sql > migration_output.txt

# Check for errors
grep -i "error\|fail" migration_output.txt
```

**Expected output:**
```
✅ Phase 1 Complete: CMS tables removed
✅ Phase 2 Complete: INSERT policies hardened
✅ Phase 3 Complete: Complex policies simplified
✅ Phase 4 Complete: Patient alerts policy hardened
✅ Verification: All alerts have valid tenant_id
✅ Verification: All new policies created successfully
✅ Verification: CMS tables removed successfully
🎉 Security Hardening Migration Complete!
```

### Step 3: Run Test Suite
```bash
# Verify migration success
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB \
  -f database/maintenance/test_security_hardening.sql > test_results.txt

# Review results
cat test_results.txt
```

**All tests should show ✅ PASS**

### Step 4: Integration Testing

**Simulation System:**
```bash
# In your app:
1. Create simulation from template
2. Start simulation
3. Add test patient
4. Record vitals
5. Create alert (should be in-memory)
6. End simulation
7. Verify data cleanup
```

**Alert System:**
```bash
# In your app:
1. Switch to production tenant
2. Create test alert
3. Verify alert appears
4. Acknowledge alert
5. Switch tenants
6. Verify alert not visible to other tenant
```

**Multi-Tenant Isolation:**
```bash
# Test cross-tenant insert (should fail):
1. User A in Tenant 1
2. Try to create patient in Tenant 2
3. Should be rejected by database
```

---

## 🐛 Troubleshooting

### Issue: Migration fails with "Missing policies"

**Cause:** Old policies still exist  
**Solution:**
```sql
-- Drop all old policies manually
DROP POLICY IF EXISTS "Users can insert bowel records" ON bowel_records;
DROP POLICY IF EXISTS "Authenticated users can insert patient admission records" ON patient_admission_records;
-- etc.

-- Re-run migration
```

### Issue: Found orphaned alerts

**If count < 100 and old:**
- ✅ Safe to auto-cleanup (migration does this)

**If count > 100:**
```bash
# Backup before cleanup
psql -c "COPY (SELECT * FROM patient_alerts WHERE tenant_id IS NULL) 
  TO '/tmp/orphaned_alerts_backup.csv' WITH CSV HEADER;"

# Then run migration
```

**If recent alerts exist:**
```sql
-- Investigate why alerts are being created without tenant_id
SELECT * FROM patient_alerts 
WHERE tenant_id IS NULL 
  AND created_at > NOW() - INTERVAL '7 days';

-- Check application code creating these alerts
```

### Issue: Simulation stops working

**Symptoms:** Can't create simulation patients, vitals, medications

**Check:**
```sql
-- Verify has_simulation_tenant_access function exists
SELECT has_simulation_tenant_access('your-tenant-id');

-- Verify simulation policies intact
SELECT * FROM pg_policies 
WHERE tablename LIKE 'simulation%'
ORDER BY tablename, policyname;
```

**Rollback if needed:**
```sql
-- Restore old policies
-- (Keep backups of 014_xxx.sql states)
```

### Issue: Alerts not appearing

**Production alerts:**
```sql
-- Verify patient_alerts_access policy
SELECT * FROM pg_policies 
WHERE tablename = 'patient_alerts' 
  AND policyname = 'patient_alerts_access';

-- Check if alerts have tenant_id
SELECT COUNT(*), tenant_id 
FROM patient_alerts 
GROUP BY tenant_id;
```

**Simulation alerts:**
```javascript
// Check simulation mode in browser console
console.log(localStorage.getItem('currentTenant'));
// Should show tenant_type: 'simulation_active'

// Check in-memory alerts
import { simulationAlertStore } from './lib/simulationAlertStore';
console.log(simulationAlertStore.getAllAlerts());
```

---

## 📊 Rollback Plan

### If Migration Fails Mid-Way

Migration has built-in verification - if any phase fails, it will raise exception and rollback automatically.

### If Issues Found Post-Deployment

```sql
-- 1. Restore CMS tables (if needed - unlikely)
-- Run pre-migration backup

-- 2. Restore old INSERT policies
DROP POLICY "bowel_records_tenant_insert" ON bowel_records;
CREATE POLICY "Users can insert bowel records" ON bowel_records
  FOR INSERT TO public WITH CHECK (true);

-- Repeat for other tables

-- 3. Restore old user_profiles delete policy
DROP POLICY "user_profiles_delete" ON user_profiles;
-- Recreate old bulletproof version

-- 4. Restore old patient_alerts policy
DROP POLICY "patient_alerts_access" ON patient_alerts;
CREATE POLICY "super_admin_alert_access" ON patient_alerts
  FOR ALL TO public
  USING (CASE WHEN tenant_id IS NULL THEN true ELSE user_has_patient_access(tenant_id) END);
```

### Full Database Rollback

```bash
# Restore from backup taken before migration
pg_restore -h HOST -U USER -d DATABASE backup_before_migration.dump
```

---

## 📈 Success Metrics

### Immediate (Day 1):
- ✅ All tests pass
- ✅ Zero errors in application logs
- ✅ Simulation system working
- ✅ Alerts appearing correctly
- ✅ Multi-tenant isolation verified

### Short-term (Week 1):
- 📉 No cross-tenant data leaks reported
- 📉 No RLS policy violations in logs
- 📊 Performance stable or improved
- 👥 No user complaints about access issues

### Long-term (Month 1):
- 🔒 Zero security incidents related to tenant isolation
- 📊 Reduced database policy overhead (after duplicate consolidation)
- 👍 Team confidence in security posture

---

## 📝 Post-Deployment Tasks

### Required:

- [ ] Update deployment log
- [ ] Notify team of successful deployment
- [ ] Monitor logs for 24 hours
- [ ] Archive test results
- [ ] Update security audit documentation

### Optional:

- [ ] Schedule Phase 2 migration ({public} → {authenticated})
- [ ] Plan duplicate policy consolidation
- [ ] Review SECURITY DEFINER function audit
- [ ] Schedule backup_audit_log testing

---

## 🔗 Related Documentation

- `docs/SECURITY_AUDIT_ANALYSIS.md` - Full security audit findings
- `docs/SECURITY_HARDENING_RISK_ANALYSIS.md` - Detailed risk analysis
- `docs/PRODUCTION_RC_COMPLETE.md` - Overall production readiness
- `database/README.md` - Database structure overview

---

## 📞 Support

**If you encounter issues:**

1. Check troubleshooting section above
2. Review migration output logs
3. Run test suite to identify specific failure
4. Check application logs for errors
5. Verify database connectivity

**Critical Issues:**
- Have rollback plan ready
- Document the issue
- Consider emergency hotfix deployment

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All tests pass ✅
- [ ] Simulation system verified ✅
- [ ] Alert system verified ✅
- [ ] Multi-tenant isolation verified ✅
- [ ] No errors in logs ✅
- [ ] Team notified ✅
- [ ] Documentation updated ✅
- [ ] Monitoring active ✅

**Sign-off:**
- Migration Deployed By: ________________
- Date: ________________
- Verified By: ________________
- Production Status: ✅ APPROVED / ⏸️ PENDING / ❌ ROLLBACK
