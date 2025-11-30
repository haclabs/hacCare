# Database Function Cleanup Analysis
**Date:** November 30, 2025  
**Analyst:** GitHub Copilot  
**Database:** hacCare Production (Supabase)

---

## Executive Summary

- **Total Database Functions:** 135
- **Documented Active Functions:** 21
- **Potential Candidates for Removal:** 114 functions
- **Confidence Level:** Medium (requires verification)

---

## Active Functions (21 - Keep These)

### ✅ Documented in ACTIVE_SUPABASE_FUNCTIONS.md

1. `complete_simulation` ✅
2. `create_simulation_template` ✅
3. `create_snapshot` ✅
4. `create_user_session` ✅
5. `cleanup_old_sessions` ✅
6. `deactivate_user` ✅
7. `delete_simulation` ✅
8. `delete_user_permanently` ✅
9. `end_user_session` ✅
10. `find_user_by_email` ✅
11. `get_available_admin_users` ✅
12. `get_user_simulation_assignments` ✅
13. `launch_run` ✅
14. `launch_simulation` ✅
15. `reactivate_user` ✅
16. `reset_run` ✅
17. `reset_simulation_for_next_session` ✅
18. `save_template_snapshot_v2` ✅

**Missing from docs but likely active:**
19. `reset_simulation_for_next_session_v2` (newer version)
20. `restore_snapshot_to_tenant` (used by reset)
21. `restore_snapshot_to_tenant_v2` (newer version)
22. `update_user_profile_admin` (admin user management)
23. `update_simulation_categories` (category management)
24. `update_simulation_history_categories` (category management)

---

## Critical Functions (Keep - Used by System)

### Trigger Functions (Auto-executed)
These run automatically on database events:

1. `auto_set_tenant_id` - Tenant assignment trigger
2. `ensure_user_profile` - User profile creation trigger
3. `handle_new_user` - New user setup trigger
4. `handle_patient_tenant_assignment` - Patient assignment trigger
5. `handle_user_profile_update` - Profile update trigger
6. `protect_medication_identifiers` - Barcode protection trigger
7. `protect_patient_identifiers` - Patient ID protection trigger
8. `protect_super_admin_role` - Security trigger
9. `set_alert_tenant_id` - Alert tenant trigger
10. `set_medication_admin_tenant_id` - Medication tenant trigger
11. `set_tenant_id_on_insert` - Generic tenant trigger
12. `set_updated_at` - Timestamp trigger
13. `set_wound_assessment_tenant_id` - Wound tenant trigger
14. `set_wound_treatment_tenant_id` - Wound treatment trigger
15. `trigger_refresh_user_tenant_cache` - Cache refresh trigger
16. `update_backup_metadata_updated_at` - Backup timestamp trigger
17. `update_bowel_records_updated_at` - Bowel record timestamp
18. `update_contact_submissions_updated_at` - Contact timestamp
19. `update_handover_notes_updated_at` - Handover timestamp
20. `update_lab_panel_status` - Lab status auto-update
21. `update_lab_updated_at` - Lab timestamp
22. `update_landing_content_timestamp` - Landing page timestamp
23. `update_medication_administrations_updated_at` - Med admin timestamp
24. `update_patient_intake_output_events_updated_at` - Intake/output timestamp
25. `update_patient_notes_updated_at` - Notes timestamp
26. `update_updated_at_column` - Generic timestamp trigger

### Security/Permission Functions
27. `current_user_is_super_admin` - RLS policy function
28. `get_user_tenant` (2 overloads) - RLS policy function
29. `get_user_tenant_id` - RLS policy function
30. `is_super_admin` - RLS policy function
31. `is_super_admin_user` - RLS policy function
32. `is_tenant_admin` - RLS policy function
33. `user_has_patient_access` - RLS policy function
34. `user_has_permission` - RLS policy function
35. `user_has_tenant_access` (2 overloads) - RLS policy function
36. `user_is_super_admin` - RLS policy function

---

## Likely Unused Functions (Candidates for Removal)

### Category 1: Old/Superseded Functions (High Confidence)

**Old Simulation System (Pre-V2):**
1. `add_simulation_user` - Old simulation user system
2. `assign_users_to_simulation` - Old user assignment
3. `authenticate_simulation_user` - Old authentication
4. `create_simulation_subtenant` - Old tenant system
5. `delete_simulation_run` - Old run system
6. `delete_simulation_run_safe` - Old run system
7. `delete_simulation_users_for_tenant` - Old user system
8. `generate_simulation_id_sets` - Old ID generation
9. `get_simulation_label_data` - Old label system
10. `get_user_assigned_simulations` - Old assignment system
11. `instantiate_simulation_patients` - Old patient system
12. `join_simulation_lobby` - Old lobby system
13. `launch_run` - Replaced by launch_simulation
14. `launch_simulation_instance` - Old version
15. `record_simulation_activity` - Old activity tracking
16. `reset_simulation_instance` - Old reset
17. `start_simulation` - Old start system
18. `start_simulation_run` - Old run system
19. `stop_simulation_run` - Old run system

**Old Template System:**
20. `delete_patient_template` - Old template system
21. `delete_scenario_template` - Old scenario system

**Old Snapshot System:**
22. `create_simulation_snapshot` - Superseded by save_template_snapshot_v2
23. `create_snapshot` - May be old version

**Old Alert System:**
24. `create_alert_for_tenant` - Replaced by v2
25. `create_patient_alert_v2` - Replaced by v3
26. `create_alert_for_tenant_v2` - Replaced by v3

### Category 2: Debug Functions (Safe to Remove)

27. `debug_vitals_restoration` - Debug only
28. `debug_vitals_restoration_fixed` - Debug only
29. `debug_vitals_restoration_only` - Debug only
30. `test_tenant_assignment` - Test only

### Category 3: Cleanup/Maintenance Functions (Review)

**May be used by cron jobs:**
31. `cleanup_backup_audit_logs` - Scheduled cleanup?
32. `cleanup_expired_simulations` - Scheduled cleanup?
33. `cleanup_all_problem_simulations` - Manual cleanup
34. `cleanup_orphaned_users` - Manual cleanup
35. `mark_expired_backups` - Scheduled cleanup?

### Category 4: Super Admin Functions (Review Usage)

**May still be needed for admin panel:**
36. `acknowledge_alert_for_tenant` - Cross-tenant alert management
37. `assign_current_user_to_tenant` - Tenant switching
38. `assign_user_to_tenant` - User management
39. `confirm_user_email` - Email confirmation
40. `create_confirmed_user` - User creation
41. `create_medication_super_admin` - Cross-tenant meds
42. `create_patient_alert_v3` - Current alert creation
43. `create_patient_medication` - Med creation
44. `create_patient_note` - Note creation
45. `create_patient_vitals` - Vitals creation
46. `create_user_profile` - Profile creation
47. `delete_medication_super_admin` - Cross-tenant delete
48. `delete_simulation_tenant_safe` - Tenant cleanup
49. `delete_tenant_secure` - Tenant deletion
50. `duplicate_patient_to_tenant` - Patient duplication
51. `fetch_medications_for_tenant` - Cross-tenant fetch
52. `fix_user_role_mismatches` - Maintenance
53. `get_available_tenants_for_transfer` - Patient transfer
54. `get_backup_statistics` - Backup stats
55. `get_current_user_tenant_id` - Tenant context
56. `get_secure_alerts` - Alert fetching
57. `get_super_admin_tenant_context` - Context switching
58. `get_tenant_users` - User listing
59. `get_user_active_tenants` - Tenant listing
60. `get_user_current_tenant` - Current tenant
61. `get_user_role` - Role checking
62. `get_user_simulation_tenant_access` - Simulation access
63. `get_user_tenant_assignments` - Tenant assignments
64. `get_user_tenant_direct` - Direct tenant fetch
65. `get_user_tenant_ids` - Tenant IDs
66. `is_admin_user` - Admin check
67. `is_super_admin_direct` - Direct super admin check
68. `move_patient_to_tenant` (2 overloads) - Patient transfer
69. `refresh_user_tenant_cache` - Cache refresh
70. `remove_user_from_tenant` - Tenant removal
71. `set_super_admin_tenant_context` - Context switching
72. `update_medication_super_admin` - Cross-tenant update

### Category 5: Landing Page (Review)

73. `archive_landing_content_version` - Landing page management

### Category 6: Subdomain Validation

74. `validate_subdomain` - Subdomain check

### Category 7: Calculate Metrics

75. `calculate_simulation_metrics` - Metrics calculation

---

## Recommendation Strategy

### Phase 1: Safe Removal (Debug Functions)
Remove 4 debug/test functions immediately:
- `debug_vitals_restoration`
- `debug_vitals_restoration_fixed`  
- `debug_vitals_restoration_only`
- `test_tenant_assignment`

### Phase 2: Verify Old Simulation System (19 functions)
Check if old simulation system is completely replaced:
1. Search codebase for any references
2. Check Edge Functions
3. Check if any old simulations exist in database
4. If clean, remove all 19 old simulation functions

### Phase 3: Consolidate Alert Functions (3 functions)
If v3 is confirmed working, remove v1 and v2:
- `create_alert_for_tenant` (v1)
- `create_alert_for_tenant_v2` (v2)  
- `create_patient_alert_v2` (v2)

### Phase 4: Review Super Admin Functions
Test each function to see if it's actually used in admin panel.
Many may be unused or superseded.

### Phase 5: Scheduled Jobs
Identify if cleanup functions are scheduled:
- Check Supabase dashboard for cron jobs
- Check pg_cron schedules
- Document which are active

---

## Next Steps

1. **Verify Trigger Usage:**
   ```sql
   SELECT tgname, tgrelid::regclass, proname
   FROM pg_trigger t
   JOIN pg_proc p ON t.tgfoid = p.oid
   WHERE tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
   ORDER BY tgrelid::regclass;
   ```

2. **Verify RLS Policy Usage:**
   ```sql
   SELECT schemaname, tablename, policyname, qual
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

3. **Check Edge Functions:**
   Review `supabase/functions/` for any RPC calls

4. **Check Scheduled Jobs:**
   ```sql
   SELECT * FROM cron.job;
   ```

---

## Risk Assessment

**LOW RISK (Safe to Remove):**
- Debug functions (4)
- Old template system (2)

**MEDIUM RISK (Verify First):**
- Old simulation system (19)
- Old alert versions (3)
- Cleanup functions (5)

**HIGH RISK (Keep Unless Proven Unused):**
- Trigger functions (26)
- Security/RLS functions (10)
- Super admin functions (37)
- Active simulation functions (24)

---

## Summary

**Immediate Action (Low Risk):**
- Remove 4 debug functions

**Short Term (Verify & Remove):**
- Remove 19 old simulation functions (if verified unused)
- Remove 3 old alert versions (if v3 confirmed)
- Review 5 cleanup functions (check cron jobs)

**Long Term (Deep Analysis Required):**
- Review 37 super admin functions (usage unknown)
- Verify all trigger functions still needed
- Confirm RLS policy functions in use

**Total Potential Savings:**
- Conservative: 4-27 functions
- Aggressive: 4-60 functions (if old system confirmed unused)
- Very Aggressive: 4-100+ functions (requires extensive testing)

**Recommendation:** Start with Phase 1 (4 debug functions) today, then schedule Phase 2 for next session after verification.
