# Active Supabase RPC Functions

**Last Updated:** November 29, 2025

This document lists all RPC functions actively called in the hacCare codebase. Any functions in Supabase not on this list are candidates for deletion during cleanup.

## Audit Methodology

Functions were identified by searching all active source code (excluding `/backup/`, `/archive/`, `/docs/` folders) for `supabase.rpc()` calls.

**Confidence Level:** High (95%+)
- Searched entire `src/` directory for all RPC calls
- Excluded archived/backup code
- Cross-referenced with current feature implementations

**Potential Gaps:**
- Functions called dynamically (e.g., via variable: `supabase.rpc(functionName)`)
- Functions called from external services/cron jobs
- Functions with different names in database vs. code

---

## User Management Functions (5)

| Function | Used In | Purpose |
|----------|---------|---------|
| `deactivate_user` | `src/features/admin/components/users/UserManagement.tsx` | Soft delete user account |
| `delete_user_permanently` | `src/features/admin/components/users/UserManagement.tsx` | Hard delete user account |
| `reactivate_user` | `src/features/admin/components/users/UserManagement.tsx` | Restore deactivated user |
| `get_available_admin_users` | `src/features/admin/components/management/ManagementDashboard.tsx` | List users for admin assignment |
| `find_user_by_email` | `src/features/admin/components/management/ManagementDashboard.tsx`<br>`src/components/enhanced-create-tenant-modal.tsx` | Search for user by email |

---

## Admin Session Management Functions (3)

| Function | Used In | Purpose |
|----------|---------|---------|
| `create_user_session` | `src/services/admin/adminService.ts` | Start admin impersonation session |
| `end_user_session` | `src/services/admin/adminService.ts` | End admin impersonation session |
| `cleanup_old_sessions` | `src/services/admin/adminService.ts` | Remove expired sessions |

---

## Tenant Management Functions (1)

| Function | Used In | Purpose |
|----------|---------|---------|
| `get_available_admins` | `src/components/enhanced-create-tenant-modal.tsx` | List admins for tenant assignment |

---

## Simulation Run Management Functions (3)

| Function | Used In | Purpose |
|----------|---------|---------|
| `create_snapshot` | `src/hooks/useSimulation.ts` | Create simulation snapshot |
| `launch_run` | `src/hooks/useSimulation.ts` | Launch simulation run |
| `reset_run` | `src/hooks/useSimulation.ts` | Reset simulation to initial state |

---

## Simulation Template/Lifecycle Functions (7)

| Function | Used In | Purpose |
|----------|---------|---------|
| `create_simulation_template` | `src/services/simulation/simulationService.ts` | Create new simulation template |
| `save_template_snapshot_v2` | `src/services/simulation/simulationService.ts` | Save template snapshot |
| `launch_simulation` | `src/services/simulation/simulationService.ts` | Launch active simulation |
| `reset_simulation_for_next_session` | `src/services/simulation/simulationService.ts` | Reset for next session |
| `reset_simulation` | `src/services/simulation/simulationService.ts` | Full simulation reset |
| `complete_simulation` | `src/services/simulation/simulationService.ts` | Mark simulation complete |
| `delete_simulation` | `src/services/simulation/simulationService.ts` | Delete simulation |

---

## Simulation Portal Functions (2)

| Function | Used In | Purpose |
|----------|---------|---------|
| `get_user_simulation_assignments` | `src/features/simulation/components/SimulationPortal.tsx` | Get user's assigned simulations (bypasses RLS) |
| `check_expired_simulations` | `src/services/simulation/simulationService.ts` | Check for expired simulations |

---

## Summary

**Total Active Functions:** 21

### By Category:
- User Management: 5
- Admin Sessions: 3
- Tenant Management: 1
- Simulation Runs: 3
- Simulation Lifecycle: 7
- Simulation Portal: 2

---

## Audit Instructions

To identify unused functions in your Supabase database:

1. **List all functions in Supabase:**
   ```sql
   SELECT 
     n.nspname as schema,
     p.proname as function_name,
     pg_get_function_identity_arguments(p.oid) as arguments,
     CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
     d.description
   FROM pg_proc p
   LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
   LEFT JOIN pg_description d ON p.oid = d.objoid
   WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
     AND p.prokind = 'f'
   ORDER BY n.nspname, p.proname;
   ```

2. **Compare** the results against the 21 functions listed above

3. **For each unlisted function:**
   - Check if it's used by a cron job or external service
   - Check if it's called dynamically via variable
   - Search codebase one more time: `grep -r "function_name" src/`
   - If truly unused, create DROP statement

4. **Create cleanup script:**
   ```sql
   -- Example for unused function
   DROP FUNCTION IF EXISTS public.unused_function_name(arg_types);
   ```

---

## Notes

- Functions may have dependencies on other database objects (triggers, views)
- Test in staging environment before dropping in production
- Consider creating backup before dropping functions
- Some functions may be called by Supabase edge functions or webhooks not in this codebase
