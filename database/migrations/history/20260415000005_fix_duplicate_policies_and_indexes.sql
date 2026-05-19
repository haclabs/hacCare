-- ============================================================================
-- FIX DUPLICATE POLICIES AND DUPLICATE INDEXES (Supabase Performance Advisor)
-- ============================================================================
-- Addresses:
--   1. multiple_permissive_policies — drops legacy/redundant policies where
--      a better ALL / consolidated policy already covers the same command+role.
--   2. duplicate_index — drops the weaker duplicate index from each pair,
--      keeping the canonical name used in queries and comments.
--
-- Run order: 003 → 004 → 005
-- ============================================================================


-- ============================================================================
-- SECTION 1: AVATAR_LOCATIONS — drop 4 legacy JWT-claim policies
-- ============================================================================
-- hacmap_avatar_locations_access (ALL, tenant_users join) already covers all
-- operations.  The sel/ins/upd/del_*_tenant policies use
-- current_setting('request.jwt.claims') which is not set by the application.

DROP POLICY IF EXISTS sel_avatar_locations_tenant ON public.avatar_locations;
DROP POLICY IF EXISTS ins_avatar_locations_tenant ON public.avatar_locations;
DROP POLICY IF EXISTS upd_avatar_locations_tenant ON public.avatar_locations;
DROP POLICY IF EXISTS del_avatar_locations_tenant ON public.avatar_locations;


-- ============================================================================
-- SECTION 2: DEVICES — drop 4 legacy JWT-claim policies
-- ============================================================================

DROP POLICY IF EXISTS sel_devices_tenant ON public.devices;
DROP POLICY IF EXISTS ins_devices_tenant ON public.devices;
DROP POLICY IF EXISTS upd_devices_tenant ON public.devices;
DROP POLICY IF EXISTS del_devices_tenant ON public.devices;


-- ============================================================================
-- SECTION 3: WOUNDS — drop 4 legacy JWT-claim policies
-- ============================================================================
-- hacmap_wounds_access (ALL) is the authoritative policy after migration 004.

DROP POLICY IF EXISTS sel_wounds_tenant ON public.wounds;
DROP POLICY IF EXISTS ins_wounds_tenant ON public.wounds;
DROP POLICY IF EXISTS upd_wounds_tenant ON public.wounds;
DROP POLICY IF EXISTS del_wounds_tenant ON public.wounds;


-- ============================================================================
-- SECTION 4: MEDICATION_ADMINISTRATIONS — drop broken tenant_isolation policy
-- ============================================================================
-- medication_administrations_tenant_isolation uses
--   current_setting('app.current_tenant_id', TRUE)
-- which is never set by the application — the policy always evaluates to NULL
-- (deny).  medication_administrations_secure_access (ALL, tenant_users join)
-- is the working policy and stays.
-- NOTE: migration 003 has a comment "kept policies" — this one-line drop
-- is the only change needed for this table.

DROP POLICY IF EXISTS medication_administrations_tenant_isolation
  ON public.medication_administrations;


-- ============================================================================
-- SECTION 5: PATIENT_ALERTS — drop deprecated ALL policy
-- ============================================================================
-- patient_alerts_access uses deprecated helper functions
-- current_user_is_super_admin() and user_has_patient_access() which are not
-- maintained.  The four patient_alerts_consolidated_* policies
-- (select/insert/update/delete) already provide correct tenant isolation via
-- the tenant_users subquery and remain in place.

DROP POLICY IF EXISTS patient_alerts_access ON public.patient_alerts;


-- ============================================================================
-- SECTION 6: SIMULATION_TABLE_CONFIG — drop redundant SELECT policy
-- ============================================================================
-- config_modify_policy (ALL, super_admin) covers SELECT in addition to writes.
-- config_select_policy (SELECT, USING true) is redundant and excessively
-- permissive (any authenticated user can read the config table).
-- After dropping, only super_admins can read/write config rows.

DROP POLICY IF EXISTS config_select_policy ON public.simulation_table_config;


-- ============================================================================
-- SECTION 7: DUPLICATE INDEXES
-- ============================================================================
-- For each pair keep the index whose name is referenced in comments/queries
-- and drop the exact duplicate (same columns, same table, same predicate).

-- user_tenant_cache: keep idx_user_tenant_cache_tenant_id (the canonical name)
DROP INDEX IF EXISTS public.idx_user_tenant_cache_tenant;

-- patient_notes: keep patient_notes_patient_id_idx and patient_notes_tenant_id_idx
DROP INDEX IF EXISTS public.idx_patient_notes_patient_id;
DROP INDEX IF EXISTS public.idx_patient_notes_tenant_id;

-- patient_wounds: keep patient_wounds_patient_id_idx
DROP INDEX IF EXISTS public.idx_patient_wounds_patient_id;

-- simulation_participants: keep idx_simulation_participants_simulation_id
--   and idx_simulation_participants_user_id
DROP INDEX IF EXISTS public.idx_simulation_participants_simulation;
DROP INDEX IF EXISTS public.idx_simulation_participants_user;

-- tenant_users: keep idx_user_tenant_active
DROP INDEX IF EXISTS public.idx_tenant_users_user_active;


-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- Confirm no remaining duplicate permissive policies:
-- SELECT tablename, cmd, roles, array_agg(policyname ORDER BY policyname), COUNT(*)
-- FROM   pg_policies
-- WHERE  schemaname = 'public' AND permissive = 'PERMISSIVE'
-- GROUP  BY tablename, cmd, roles
-- HAVING COUNT(*) > 1
-- ORDER  BY tablename, cmd;
-- Expected: 0 rows (all previously-problematic tables consolidated)
--
-- Confirm indexes were dropped:
-- SELECT indexname FROM pg_indexes
-- WHERE  schemaname = 'public'
--   AND  indexname IN (
--     'idx_user_tenant_cache_tenant',
--     'idx_patient_notes_patient_id',
--     'idx_patient_notes_tenant_id',
--     'idx_patient_wounds_patient_id',
--     'idx_simulation_participants_simulation',
--     'idx_simulation_participants_user',
--     'idx_tenant_users_user_active'
--   );
-- Expected: 0 rows
