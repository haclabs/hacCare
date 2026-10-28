# Active Supabase Functions

**Last Updated:** October 28, 2026

Every function in the `public` schema of the live database, grouped by who calls it. Use this before
dropping anything: a function that isn't called from `src/` may still be used by another function, an
RLS policy, a trigger, an event trigger or an edge function.

## How this was built

- **App calls:** every `supabase.rpc('...')` in `src/` (including calls split across lines), excluding tests.
- **Live database:** `pg_proc` for the `public` schema, checked for references from other function
  bodies, RLS policies (all schemas, including storage), views, triggers (including on `auth` tables) and
  event triggers.
- **Edge functions:** `rpc(...)` calls in `supabase/functions/`.

Regenerate it the same way after adding or dropping functions. To list functions:

```sql
SELECT p.proname, p.prosecdef AS security_definer,
       p.prosrc LIKE '%-- access guard%' AS guarded
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
ORDER BY 1;
```

**Totals:** 104 functions: 40 called by the app, 2 by edge functions, 2 event triggers, 26 trigger functions, 34 internal helpers, 0 unreferenced.

**Flags:** `definer` = `SECURITY DEFINER` (bypasses RLS, so it must check its caller); `guarded` = its
first statement is a `PERFORM public.assert_*(...)  -- access guard` line.
`supabase/tests/verify_rls_isolation.sql` (FAIL 14) fails if a listed RPC loses its guard.

---

## 1. Called by the app (40)

### Simulation lifecycle

| Function | Flags | Purpose | Called from |
|---|---|---|---|
| `launch_simulation` | definer · guarded | Launch a template as a new simulation (lands as Ready to Start) | `src/services/simulation/simulationLifecycleService.ts` |
| `start_simulation` | definer · guarded | Start button: shift chart times to now, start the clock | `src/services/simulation/simulationLifecycleService.ts` |
| `complete_simulation` | definer · guarded | Complete: save the debrief to simulation_history | `src/services/simulation/simulationLifecycleService.ts` |
| `reset_simulation_for_next_session` | definer · guarded | Reset for the next group (keeps barcodes) | `src/services/simulation/simulationLifecycleService.ts` |
| `reset_simulation_with_template_updates` | definer · guarded | View Changes & Sync: reset with updated template data | `src/services/simulation/simulationLifecycleService.ts` |
| `delete_simulation` | definer · guarded | Delete an active simulation (and its auto-generated logins) | `src/services/simulation/simulationLifecycleService.ts` |
| `compare_simulation_template_patients` | definer · guarded | Template Updated: compare patient lists | `src/services/simulation/templateService.ts` |
| `compare_simulation_vs_template` | definer · guarded | Template Updated: detailed diff | `src/services/simulation/templateService.ts` |
| `get_user_simulation_assignments` | definer | Simulation portal: the caller's running simulations | `src/features/simulation/components/SimulationPortal.tsx` |

### Simulation templates & named states

| Function | Flags | Purpose | Called from |
|---|---|---|---|
| `create_simulation_template` | definer · guarded | Create a simulation template (and its tenant) | `src/features/simulation/services/templateImportService.ts`<br>`src/services/simulation/templateService.ts` |
| `delete_simulation_template` | definer · guarded | Delete a simulation template | `src/services/simulation/templateService.ts` |
| `save_template_snapshot_v2` | definer · guarded | Save & Exit / Snapshot: capture template data | `src/services/simulation/templateService.ts` |
| `save_template_state` | definer · guarded | Save a named state (e.g. Week 2) | `src/services/simulation/templateService.ts` |
| `load_template_state` | definer · guarded | Load a named state into the template editor | `src/services/simulation/templateService.ts` |
| `update_template_state_snapshot` | definer · guarded | Update an existing named state | `src/services/simulation/templateService.ts` |

### Patient Library

| Function | Flags | Purpose | Called from |
|---|---|---|---|
| `create_patient_template` | definer · guarded | Create a Patient Library template | `src/services/simulation/patientTemplateService.ts` |
| `delete_patient_template` | definer · guarded | Delete a Patient Library template | `src/services/simulation/patientTemplateService.ts` |
| `save_patient_template_snapshot` | definer · guarded | Snapshot a Patient Library template | `src/services/simulation/patientTemplateService.ts` |
| `add_patient_template_to_simulation_template` | definer · guarded | Add Patient from Library (one-time copy) | `src/services/simulation/patientTemplateService.ts` |

### Tenants & institutions

| Function | Flags | Purpose | Called from |
|---|---|---|---|
| `ensure_tenant_access` | definer | Grant the caller access to a template/simulation tenant | `src/contexts/TenantContext.tsx`<br>`src/features/simulation/components/PatientTemplateLabelsModal.tsx`<br>`src/features/simulation/hooks/useActiveSimulations.ts` |
| `get_tenant_users` | definer · guarded | List users of a tenant | `src/features/simulation/components/LaunchSimulationModal.tsx`<br>`src/services/admin/tenantService.ts` |
| `get_tenant_by_subdomain_public` | definer | Resolve a tenant from its subdomain (before login) | `src/services/admin/tenantService.ts` |
| `get_user_current_tenant` | definer · guarded | The caller's current tenant | `src/services/admin/tenantService.ts`<br>`src/services/operations/bulkLabelService.ts` |
| `get_user_institutions` | definer · guarded | The caller's institutions | `src/services/admin/userInstitutionService.ts` |
| `set_super_admin_tenant_context` | definer | Super admin tenant switching | `src/services/admin/superAdminTenantService.ts` |

### Programs

| Function | Flags | Purpose | Called from |
|---|---|---|---|
| `create_program_tenant` | definer · guarded | Create a program workspace tenant | `src/services/admin/programService.ts` |
| `get_user_program_codes` | definer · guarded | The caller's program codes (filtering) | `src/services/admin/programService.ts` |
| `get_user_program_tenants` | definer · guarded | The caller's program workspaces | `src/services/admin/programService.ts` |
| `user_has_program_access` | definer · guarded | Check program access | `src/services/admin/programService.ts` |
| `add_student_to_roster_admin` | definer · guarded | Add a student to a program roster | `src/services/admin/programService.ts` |

### Users

| Function | Flags | Purpose | Called from |
|---|---|---|---|
| `find_user_by_email` | definer · guarded | Look up a user by email | `src/features/admin/components/management/ManagementDashboard.tsx` |
| `get_available_admin_users` | definer · guarded | Users eligible as tenant admins | `src/features/admin/components/management/ManagementDashboard.tsx` |
| `confirm_user_email` | definer · guarded | Confirm a user's email (admin) | `src/features/admin/components/users/UserForm.tsx` |
| `deactivate_user` | definer · guarded | Soft-delete a user | `src/features/admin/components/users/UserManagement.tsx` |
| `reactivate_user` | definer · guarded | Restore a deactivated user | `src/features/admin/components/users/UserManagement.tsx` |
| `delete_user_permanently` | definer · guarded | Hard-delete a user | `src/features/admin/components/users/UserManagement.tsx` |
| `reassign_user_tenant` | definer | Move a user to another tenant | `src/features/admin/components/users/UserForm.tsx` |
| `update_user_profile_admin` | definer · guarded | Update profile/role (admin screens, auto-generated students) | `src/features/admin/components/users/UserForm.tsx`<br>`src/services/simulation/autoStudentService.ts` |
| `get_user_auth_status` | definer · guarded | Auth status for user management | `src/services/admin/userAuthStatusService.ts` |
| `mark_welcome_seen` | definer | Dismiss the welcome modal | `src/hooks/useWelcomeModal.ts` |

**Definer RPCs without an access-guard line (6).** How each one checks its caller:

| Function | Caller check |
|---|---|
| `get_tenant_by_subdomain_public` | None, by design: runs before login (`anon` can execute) |
| `get_user_simulation_assignments`, `mark_welcome_seen` | Signed in, and only the caller's own data |
| `ensure_tenant_access` | Acts for `auth.uid()` |
| `reassign_user_tenant`, `set_super_admin_tenant_context` | Super admin only |

`confirm_user_email` and `delete_user_permanently` were on this list until `20261028020953`: their
`role != 'super_admin'` check let a signed-in caller with no `user_profiles` row through.

### Called by the app but missing from the database

None. `resetSimulation()` and `checkExpiredSimulations()` called the dropped `reset_simulation` and
`check_expired_simulations`; nothing called them, and they were removed on 2026-10-28.

---

## 2. Called by edge functions (2)

| Function | Edge function |
|---|---|
| `caller_can_administer_user` | `supabase/functions/admin-update-user-email` (also used by RLS policies) |
| `cleanup_old_user_sessions` | `supabase/functions/cleanup-old-sessions` |

## 3. Event triggers (2)

| Function | Event trigger |
|---|---|
| `enable_rls_on_new_tables` | `enable_rls_on_table_creation` |
| `rls_auto_enable` | `ensure_rls` |

## 4. Trigger functions (26)

All attached to a table trigger: `assign_free_entry_medication_barcode`, `auto_set_tenant_id`, `auto_tag_simulation_from_template`, `ensure_user_profile`, `protect_medication_identifiers`, `protect_patient_identifiers`, `protect_super_admin_role`, `set_alert_tenant_id`, `set_medication_admin_tenant_id`, `set_updated_at`, `set_wound_assessment_tenant_id`, `set_wound_treatment_tenant_id`, `stamp_simulation_ready_at`, `sync_simulation_tenant_name`, `trigger_create_program_tenant`, `trigger_refresh_user_tenant_cache`, `update_contact_submissions_updated_at`, `update_handover_notes_updated_at`, `update_lab_panel_status`, `update_lab_updated_at`, `update_medication_administrations_updated_at`, `update_patient_intake_output_events_updated_at`, `update_patient_notes_updated_at`, `update_programs_updated_at`, `update_student_roster_updated_at`, `update_updated_at_column`.


## 5. Internal helpers (34)

Not called by the app directly, but used by other functions or RLS policies. Do not drop.

| Function | Used by |
|---|---|
| `assert_caller_has_role` | functions: `assert_caller_is_staff`, `confirm_user_email`, `delete_user_permanently`, `find_user_by_email` +3 more |
| `assert_caller_is_staff` | functions: `create_patient_template`, `create_simulation_template` |
| `assert_can_administer_user` | functions: `add_student_to_roster_admin`, `assert_can_update_user_profile`, `deactivate_user`, `reactivate_user` |
| `assert_can_manage_institution_programs` | functions: `create_program_tenant` |
| `assert_can_manage_patient_template` | functions: `add_patient_template_to_simulation_template`, `delete_patient_template`, `save_patient_template_snapshot` |
| `assert_can_manage_program` | functions: `add_student_to_roster_admin` |
| `assert_can_manage_simulation` | functions: `compare_simulation_template_patients`, `compare_simulation_vs_template`, `complete_simulation`, `delete_simulation` +3 more |
| `assert_can_manage_simulation_template` | functions: `add_patient_template_to_simulation_template`, `delete_simulation_template`, `launch_simulation`, `load_template_state` +3 more |
| `assert_can_update_user_profile` | functions: `update_user_profile_admin` |
| `assert_can_view_tenant_users` | functions: `get_tenant_users` |
| `assert_self_or_admin` | functions: `get_user_current_tenant`, `get_user_program_codes`, `get_user_program_tenants`, `user_has_program_access` |
| `caller_has_role` | RLS policies; functions: `assert_caller_has_role`, `assert_can_manage_institution_programs`, `assert_can_manage_patient_template`, `assert_can_manage_program` +6 more |
| `caller_in_institution` | RLS policies; functions: `assert_can_manage_institution_programs`, `assert_can_manage_patient_template`, `assert_can_manage_simulation`, `assert_can_manage_simulation_template` +4 more |
| `caller_in_institution_strict` | RLS policies; functions: `assert_can_manage_program`, `caller_can_administer_user`, `caller_may_administer_tenant` |
| `caller_is_service_context` | functions: `assert_caller_has_role`, `assert_can_manage_institution_programs`, `assert_can_manage_patient_template`, `assert_can_manage_program` +6 more |
| `caller_is_simulation_participant` | RLS policies |
| `caller_may_administer_tenant` | RLS policies |
| `caller_profile_role` | RLS policies |
| `caller_program_ids` | RLS policies |
| `caller_runs_template` | RLS policies |
| `caller_tenant_comember_ids` | RLS policies |
| `caller_tenant_ids` | RLS policies |
| `current_user_is_super_admin` | RLS policies; functions: `set_super_admin_tenant_context` |
| `doctors_order_is_released` | RLS policies |
| `institution_of_tenant` | RLS policies; functions: `assert_can_manage_institution_programs`, `assert_can_view_tenant_users`, `caller_may_administer_tenant`, `resolve_owner_institution` +2 more |
| `program_institution` | RLS policies; functions: `assert_can_manage_program` |
| `refresh_user_tenant_cache` | functions: `trigger_refresh_user_tenant_cache` |
| `resolve_owner_institution` | functions: `create_patient_template`, `create_simulation_template` |
| `restore_snapshot_to_tenant` | functions: `add_patient_template_to_simulation_template`, `launch_simulation`, `load_template_state`, `reset_simulation_for_next_session` +2 more |
| `shift_snapshot_timestamps` | functions: `launch_simulation`, `reset_simulation_for_next_session`, `reset_simulation_with_template_updates` |
| `simulation_owner_institution` | RLS policies |
| `template_owner_institution` | RLS policies; functions: `assert_can_manage_simulation`, `simulation_owner_institution`, `user_institution_ids`, `user_may_join_tenant` |
| `user_institution_ids` | functions: `caller_can_administer_user`, `get_user_institutions` |
| `user_may_join_tenant` | functions: `ensure_tenant_access` |

## 6. Unreferenced (0)

On 2026-10-28 two migrations dropped 51 functions that nothing referenced:

- `20261028021622_drop_unused_functions` (49): pre-guard role checks such as `is_super_admin*` and
  `user_has_*`, old session tracking, sub-tenant simulations, old admin/medication helpers, and six
  trigger functions no trigger used. The migration lists each one by group.
- `20261028021923_drop_orphaned_helper_functions` (2): `generate_simulation_id_sets` and the unused
  `ensure_user_profile(uuid, text)` overload, orphaned once their callers were gone.

The RLS isolation checks in `supabase/tests/verify_rls_isolation.sql` all passed afterwards.

If a function ends up here again, search `src/`, `supabase/functions/`, `scripts/` and `database/`
(a name built at runtime wouldn't show up in this scan), check `pg_depend`, then drop it in a
migration in `supabase/migrations/` with `DROP FUNCTION IF EXISTS public.<name>(<arg types>);`
and no `CASCADE`.
