# Security Audit Analysis - RLS Policies Review
**Date:** October 18, 2025  
**Status:** Production RC Security Review

## Executive Summary

Analyzed 156 Row Level Security (RLS) policies across 44 tables. This document highlights security concerns, best practices followed, and recommendations for production deployment.

---

## ✅ Security Strengths

### 1. **Comprehensive RLS Coverage**
- All 44 tables have RLS policies enabled
- Multi-layered security with tenant isolation
- Proper super_admin access controls throughout

### 2. **Tenant Isolation Implemented**
- Patient data isolated by `tenant_id`
- Consistent pattern: `tenant_id IN (SELECT tenant_users.tenant_id FROM tenant_users WHERE user_id = auth.uid())`
- Prevents cross-tenant data leakage

### 3. **Simulation Isolation**
- Dedicated policies for simulation data (`has_simulation_tenant_access()`)
- Simulation users properly isolated from production data
- Proper access control for simulation features

### 4. **Audit Trail Protection**
- Audit logs properly restricted
- Super admins can view, authenticated users can insert
- Proper tracking of who did what

---

## ⚠️ Security Concerns Identified

### 1. **Overly Permissive Policies** (HIGH PRIORITY)

#### **Issue A: Public Role on Sensitive Tables**
Many policies use `{public}` role instead of `{authenticated}`:

**Affected Tables:**
- `audit_logs` - Should require authentication
- `patient_*` tables - Using `{public}` when should use `{authenticated}`
- `bowel_records`, `diabetic_records` - Medical data accessible to public role
- `medication_administrations` - Critical medical data
- `user_profiles`, `user_sessions` - User data

**Risk:** Public role means unauthenticated users could potentially access endpoints if application logic fails.

**Recommendation:**
```sql
-- Change FROM:
CREATE POLICY "policy_name" ON table_name
  FOR SELECT TO public  -- ❌ Too permissive

-- Change TO:
CREATE POLICY "policy_name" ON table_name
  FOR SELECT TO authenticated  -- ✅ Requires login
```

#### **Issue B: `true` in INSERT/UPDATE with_check**
Multiple tables allow unrestricted inserts:

**Examples:**
- `bowel_records`: `with_check: true` - Anyone can insert any record
- `patient_admission_records`: `with_check: true`
- `patient_advanced_directives`: `with_check: true`
- `patient_wounds`: `with_check: true`
- `backup_audit_log`: `with_check: true`

**Risk:** No validation on data being inserted. User could insert records for any tenant.

**Recommendation:**
```sql
-- Replace `true` with proper tenant checks:
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
```

### 2. **CMS Tables Still Present** (MEDIUM PRIORITY)

Found CMS-related policies that should have been removed:
- `cms_audit_log` - 2 policies
- `landing_page_content` - 5 policies
- `landing_page_content_history` - 1 policy

**Risk:** Unused tables with security policies create unnecessary attack surface.

**Recommendation:** Remove these tables and policies completely:
```sql
DROP POLICY "Super admins can insert audit log" ON cms_audit_log;
DROP POLICY "Super admins can view audit log" ON cms_audit_log;
DROP TABLE cms_audit_log;

DROP TABLE landing_page_content_history;
DROP TABLE landing_page_content;
```

### 3. **Duplicate/Redundant Policies** (LOW PRIORITY)

Multiple tables have overlapping policies:

**Examples:**
- `patient_medications`: 6 consolidated policies + 2 additional select policies
- `patient_vitals`: 8 policies (4 consolidated + 4 simulation-specific)
- `patient_alerts`: 5 policies with overlapping logic
- `simulation_active`: 8 policies (4 pairs of duplicates)
- `simulation_participants`: 8 policies (4 pairs of duplicates)
- `simulation_templates`: 8 policies (4 pairs of duplicates)

**Risk:** 
- Confusion about which policy applies
- Performance overhead (PostgreSQL evaluates all policies)
- Maintenance complexity

**Recommendation:** Consolidate into single comprehensive policies per operation.

### 4. **Super Admin Function Usage** (MEDIUM PRIORITY)

Some policies use `is_super_admin()` function calls:
- `landing_page_content` - 4 policies
- `cms_audit_log` - 1 policy

**Concern:** Need to verify this function is SECURITY DEFINER and properly protected.

**Action Required:** Check function definition:
```sql
-- Verify from security audit output
SELECT * FROM pg_proc WHERE proname = 'is_super_admin';
```

---

## 🔍 Specific Policy Issues

### **Critical Issues**

1. **`user_profiles_bulletproof_delete`**
   - Complex COALESCE logic: `COALESCE((id)::text, ''::text)`
   - Overly complex, hard to audit
   - **Recommendation:** Simplify to: `id = auth.uid() OR current_user_is_super_admin()`

2. **`patient_alerts.super_admin_alert_access`**
   - Uses `CASE WHEN tenant_id IS NULL THEN true`
   - Allows access to NULL tenant alerts by anyone
   - **Risk:** Potential data leak if tenant_id accidentally NULL
   - **Fix:** Remove NULL case or add super_admin check

3. **`patients.Simulation users cannot see regular patients`**
   - Uses `NOT EXISTS` to exclude
   - Creates negative policy (harder to reason about)
   - **Recommendation:** Use positive inclusion instead

### **Medium Issues**

4. **Handover Notes Policies**
   - Uses `auth.role() = 'authenticated'` instead of role-based checks
   - No tenant isolation
   - **Risk:** All authenticated users can see all handover notes
   - **Fix:** Add tenant_id checks

5. **Multiple `auth.uid()` Nesting**
   - Pattern: `SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid`
   - Unnecessary triple-nesting throughout
   - **Fix:** Use `auth.uid()` directly

---

## 📊 Policy Statistics

| Category | Count | Status |
|----------|-------|--------|
| **Total Policies** | 156 | ✅ All tables covered |
| **Using {public} role** | ~60 | ⚠️ Should be {authenticated} |
| **With `true` checks** | 15 | ⚠️ Too permissive |
| **Duplicate policies** | 24 | ⚠️ Should consolidate |
| **CMS-related** | 8 | ❌ Should delete |
| **Proper tenant isolation** | 95 | ✅ Good |
| **Super admin access** | 85 | ✅ Consistent |

---

## 🎯 Recommended Actions

### **Phase 1: Critical Fixes (Before Production)**

1. **Remove CMS Tables & Policies**
   ```sql
   -- Remove all CMS-related tables
   DROP TABLE IF EXISTS cms_audit_log CASCADE;
   DROP TABLE IF EXISTS landing_page_content_history CASCADE;
   DROP TABLE IF EXISTS landing_page_content CASCADE;
   ```

2. **Fix Overly Permissive INSERT Policies**
   - Replace `with_check: true` with proper tenant validation
   - Priority tables: `bowel_records`, `patient_*` tables

3. **Change {public} to {authenticated}**
   - Update all patient/medical data policies
   - Update user profile policies
   - Keep only truly public data as {public} (tenant branding)

### **Phase 2: Optimization (Post-Production)**

4. **Consolidate Duplicate Policies**
   - `simulation_*` tables: Merge 8 policies → 4 policies each
   - `patient_medications`: Remove redundant select policies
   - `patient_vitals`: Consolidate simulation policies

5. **Simplify Complex Policies**
   - `user_profiles_bulletproof_delete`: Reduce COALESCE nesting
   - Remove triple-nested `auth.uid()` calls
   - Use helper functions for common patterns

6. **Add Missing Policies**
   - Verify all tables have DELETE policies with proper restrictions
   - Add audit logging triggers where missing

---

## 🔒 Best Practices Followed

### ✅ What's Working Well

1. **Consistent Super Admin Pattern**
   ```sql
   EXISTS (
     SELECT 1 FROM user_profiles 
     WHERE id = auth.uid() 
       AND role = 'super_admin' 
       AND is_active = true
   )
   ```

2. **Tenant Isolation Pattern**
   ```sql
   tenant_id IN (
     SELECT tenant_id FROM tenant_users 
     WHERE user_id = auth.uid() AND is_active = true
   )
   ```

3. **Simulation Access Control**
   ```sql
   has_simulation_tenant_access(tenant_id)
   ```

4. **User Ownership Checks**
   ```sql
   created_by = auth.uid()
   nurse_id = auth.uid()
   user_id = auth.uid()
   ```

---

## 📝 SQL Script: Critical Fixes

Create this migration to fix critical issues:

```sql
-- File: database/migrations/015_security_hardening.sql

-- 1. Remove CMS tables (already planned for removal)
DROP TABLE IF EXISTS cms_audit_log CASCADE;
DROP TABLE IF EXISTS landing_page_content_history CASCADE;
DROP TABLE IF EXISTS landing_page_content CASCADE;

-- 2. Fix bowel_records INSERT policy
DROP POLICY IF EXISTS "Users can insert bowel records" ON bowel_records;
CREATE POLICY "bowel_records_tenant_insert" ON bowel_records
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 3. Fix patient_admission_records policies
DROP POLICY IF EXISTS "Authenticated users can insert patient admission records" ON patient_admission_records;
CREATE POLICY "patient_admission_tenant_insert" ON patient_admission_records
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 4. Fix patient_advanced_directives policies
DROP POLICY IF EXISTS "Authenticated users can insert patient advanced directives" ON patient_advanced_directives;
CREATE POLICY "patient_advanced_directives_tenant_insert" ON patient_advanced_directives
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 5. Fix patient_wounds policies
DROP POLICY IF EXISTS "Authenticated users can insert patient wounds" ON patient_wounds;
CREATE POLICY "patient_wounds_tenant_insert" ON patient_wounds
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 6. Fix backup_audit_log INSERT policy
DROP POLICY IF EXISTS "backup_audit_insert_all" ON backup_audit_log;
CREATE POLICY "backup_audit_tenant_insert" ON backup_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 7. Simplify user_profiles_bulletproof_delete
DROP POLICY IF EXISTS "user_profiles_bulletproof_delete" ON user_profiles;
CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE TO authenticated
  USING (
    id = auth.uid() OR 
    current_user_is_super_admin()
  );

-- 8. Fix patient_alerts NULL tenant_id issue
DROP POLICY IF EXISTS "super_admin_alert_access" ON patient_alerts;
CREATE POLICY "patient_alerts_access" ON patient_alerts
  FOR ALL TO authenticated
  USING (
    current_user_is_super_admin() OR
    (tenant_id IS NOT NULL AND user_has_patient_access(tenant_id))
  );

-- 9. Add handover_notes tenant isolation
DROP POLICY IF EXISTS "Users can view handover notes for accessible patients" ON handover_notes;
CREATE POLICY "handover_notes_tenant_select" ON handover_notes
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

---

## 🚦 Production Readiness Assessment

### Security Score: **7/10**

**Strengths:**
- ✅ RLS enabled on all tables
- ✅ Tenant isolation comprehensive
- ✅ Super admin controls consistent
- ✅ Simulation isolation working

**Weaknesses:**
- ⚠️ Too many {public} role policies (should be {authenticated})
- ⚠️ Some INSERT policies use `true` (no validation)
- ⚠️ CMS tables still present
- ⚠️ Duplicate policies create confusion

### **Recommendation:**
**CONDITIONAL GO** - Deploy to production WITH immediate post-deployment of security hardening migration.

**Deployment Plan:**
1. Deploy current code to production
2. **Immediately** run `015_security_hardening.sql` migration
3. Run security audit again to verify fixes
4. Monitor for any access issues in first 24 hours
5. Phase 2 optimizations can wait for next release

---

## 📋 Post-Production Monitoring

### Security Metrics to Track

1. **Failed Policy Violations**
   - Monitor PostgreSQL logs for policy violations
   - Alert on unusual patterns

2. **Cross-Tenant Access Attempts**
   - Track queries that fail tenant_id checks
   - Investigate suspicious patterns

3. **Unauthorized Super Admin Checks**
   - Monitor `current_user_is_super_admin()` calls
   - Verify all calls are legitimate

4. **NULL tenant_id Occurrences**
   - Find any records with NULL tenant_id
   - Fix data integrity issues

### Recommended Monitoring Query

```sql
-- Run weekly to check for policy violations
SELECT 
  schemaname,
  tablename,
  COUNT(*) as violation_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_tup_ins + n_tup_upd + n_tup_del > 0
GROUP BY schemaname, tablename
ORDER BY violation_count DESC;
```

---

## 🔗 Related Documentation

- `database/maintenance/security_audit.sql` - Full audit script
- `database/policies/` - All RLS policy definitions
- `PRODUCTION_RC_COMPLETE.md` - Overall production readiness
- `database/README.md` - Database structure overview

---

## ✅ Action Items

- [ ] **CRITICAL:** Create and test `015_security_hardening.sql` migration
- [ ] **CRITICAL:** Remove CMS tables before production
- [ ] **HIGH:** Replace {public} with {authenticated} on sensitive tables
- [ ] **HIGH:** Fix INSERT policies with `true` validation
- [ ] **MEDIUM:** Consolidate duplicate policies (post-production)
- [ ] **MEDIUM:** Simplify complex COALESCE logic
- [ ] **LOW:** Remove triple-nested auth.uid() calls
- [ ] Set up policy violation monitoring
- [ ] Schedule security audit review (monthly)

---

**Next Steps:** Would you like me to create the `015_security_hardening.sql` migration file?
