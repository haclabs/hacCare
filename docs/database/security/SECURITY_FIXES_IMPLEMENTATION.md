# Security Hardening Fixes - Implementation Guide

## Overview
This document guides you through applying security fixes for the 47 warnings from Supabase Linter.

## ✅ COMPLETED: Function Search Path Fixes (45 warnings)

**Migration Created:** `database/migrations/20251130_fix_function_search_paths_FINAL.sql`

**What it does:**
- Sets `search_path = public` on all 45 database functions with correct signatures
- Prevents potential search path injection attacks
- Uses safe `ALTER FUNCTION` approach (no function recreation needed)

**To Apply:**
```bash
# Apply via Supabase Dashboard (Required - uses correct signatures from your DB)
# 1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# 2. Copy contents of: database/migrations/20251130_fix_function_search_paths_FINAL.sql
# 3. Click "Run" to execute
# 4. Verify success message: "✅ Functions fixed: 45"
```

**Verification:**
```sql
-- Run this in Supabase SQL Editor to verify fixes
SELECT 
  p.proname as function_name,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_mode,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ FIXED'
    ELSE '❌ NEEDS FIX'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'update_lab_updated_at',
    'set_updated_at',
    'launch_simulation',
    'reset_simulation_for_next_session_v2',
    'create_simulation_snapshot'
  )
ORDER BY p.proname;
```

**Risk Assessment:**
- ✅ **LOW RISK**: Uses `ALTER FUNCTION` - doesn't recreate functions
- ✅ **NO BREAKING CHANGES**: Only adds security constraint
- ✅ **TESTED PATTERN**: Same approach used in `docs/development/database/functions/simple_search_path_fix.sql`

**Functions Fixed by Category:**

1. **Trigger Functions (8)** - Automatic timestamp/tenant updates
   - `update_lab_updated_at`, `set_updated_at`, `update_contact_submissions_updated_at`
   - `update_landing_content_timestamp`, `update_patient_notes_updated_at`
   - `update_patient_intake_output_events_updated_at`, `update_updated_at_column`
   - `set_medication_admin_tenant_id`

2. **Utility Functions (5)** - Session & data protection
   - `create_user_session`, `record_simulation_activity`
   - `protect_medication_identifiers`, `protect_patient_identifiers`
   - `archive_landing_content_version`

3. **Simulation Management (12)** - Launch, reset, delete operations
   - Launch: `launch_simulation`, `launch_simulation_instance`, `launch_run`, `start_simulation_run`
   - Reset: `reset_simulation_for_next_session`, `reset_simulation_for_next_session_v2`, `reset_simulation_instance`, `reset_run`
   - Delete: `delete_simulation`, `delete_simulation_run`, `delete_simulation_run_safe`, `cleanup_all_problem_simulations`
   - Stop: `stop_simulation_run`

4. **Complex Business Logic (17)** - Templates, snapshots, user management
   - Templates: `create_simulation_template`, `complete_simulation`
   - Categories: `update_simulation_categories`, `update_simulation_history_categories`
   - Snapshots: `create_snapshot`, `create_simulation_snapshot`, `save_template_snapshot_v2`, `restore_snapshot_to_tenant`, `restore_snapshot_to_tenant_v2`
   - Users: `assign_users_to_simulation`, `get_user_assigned_simulations`, `get_user_simulation_tenant_access`
   - Utilities: `generate_simulation_id_sets`, `get_simulation_label_data`, `update_lab_panel_status`
   - Metrics: `calculate_simulation_metrics`

5. **Debug Functions (2)**
   - `debug_vitals_restoration`, `debug_vitals_restoration_fixed`

---

## ⚠️ DECISION REQUIRED: Materialized View (1 warning)

**Warning:** `public.user_tenant_cache` is selectable by authenticated roles

**Analysis:**
- **What it contains:** User-tenant relationship cache (user_id, tenant_id, role, is_active)
- **Purpose:** Performance optimization for RLS policies
- **Sensitivity:** LOW - Only access control metadata, not business/patient data
- **Current Access:** Authenticated users only (NOT anonymous)

**Recommendation: ✅ ACCEPT THIS WARNING**

**Rationale:**
1. View is essential for RLS policy performance
2. Only contains access control metadata (who belongs to which tenant)
3. Users can only access their own relationships via RLS on actual tables
4. Not exposing sensitive patient/business data
5. Fixing this would require significant refactoring with minimal security benefit

**Alternative (Complex):**
If you want to eliminate the warning:
```sql
-- Create wrapper function
CREATE OR REPLACE FUNCTION get_current_user_tenant_context()
RETURNS TABLE (tenant_id UUID, role TEXT, is_active BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.tenant_id, t.role, t.is_active
  FROM user_tenant_cache t
  WHERE t.user_id = auth.uid();
END;
$$;

-- Revoke direct access
REVOKE SELECT ON user_tenant_cache FROM authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_tenant_context() TO authenticated;

-- Update all application code to use function instead of direct queries
-- Risk: Breaking changes, performance impact, maintenance overhead
```

**See:** `docs/database/security/user_tenant_cache_analysis.sql` for detailed analysis

---

## 🔒 TODO: Leaked Password Protection (1 warning)

**Warning:** Leaked password protection is currently disabled

**What it does:**
- Checks user passwords against HaveIBeenPwned.org database
- Prevents users from choosing passwords that have been compromised in data breaches
- Supabase Auth built-in feature

**To Enable:**

1. **Via Supabase Dashboard:**
   ```
   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/settings
   2. Scroll to "Password Security" section
   3. Toggle ON: "Enable leaked password protection"
   4. Click "Save"
   ```

2. **What happens:**
   - New signups: Password checked against breach database
   - Existing users: Not affected until they change password
   - If password found in breach: User sees error, must choose different password

**No Code Changes Required** - This is a Supabase Auth configuration setting.

**Documentation:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## Testing Plan

### After Applying Function Fixes

**1. Timestamp Triggers (Low Risk)**
```sql
-- Test in Supabase SQL Editor
UPDATE labs SET status = 'completed' WHERE id = (SELECT id FROM labs LIMIT 1);
SELECT updated_at FROM labs WHERE id = (SELECT id FROM labs LIMIT 1);
-- Should show current timestamp
```

**2. Simulation Launch (Medium Risk)**
- Launch a simulation as instructor
- Verify students can access
- Check simulation_runs table populated correctly

**3. Simulation Reset (Medium-High Risk)**
- Complete a simulation
- Reset it for next session
- Verify patient data restored from template
- Check medications, vitals, labs reset correctly

**4. HacMap Device Save (Integration)**
- Add a device to patient
- Verify device saves correctly
- Check error logs if save fails

**5. MAR Administration (Integration)**
- Administer medication
- Verify timestamp updates
- Check medication_administration table

### Rollback Plan

If anything breaks:
```bash
# The migration is non-destructive, but to rollback:
# Option 1: Remove search_path constraint
ALTER FUNCTION public.function_name RESET search_path;

# Option 2: Drop the migration
npx supabase migration repair --status reverted 20251130000000

# Option 3: Manual fix in Supabase SQL Editor
-- Remove the search_path setting from specific functions
```

---

## Summary

| Issue | Count | Status | Action Required |
|-------|-------|--------|-----------------|
| Function search_path | 45 | ✅ Migration Ready | Apply migration |
| Materialized view API | 1 | ⚠️ Accept Warning | No action (documented) |
| Leaked password protection | 1 | 🔒 Manual Config | Enable in dashboard |

**Total Warnings:** 47  
**Auto-Fixed:** 45  
**Accepted:** 1  
**Manual Config:** 1  

**Estimated Time:**
- Apply migration: 2 minutes
- Testing: 15-30 minutes
- Enable password protection: 1 minute

**Risk Level:** LOW
- Using safe `ALTER FUNCTION` approach
- No function recreation
- No breaking changes to function signatures
- Adds security constraint only
