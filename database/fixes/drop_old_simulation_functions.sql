-- Drop Old Simulation System Functions
-- Date: November 30, 2025
-- Related PR: feature/security-performance-fixes
--
-- Context: Removed old simulation architecture (engine/, controllers/, types/)
-- These 17 functions were part of that old system and are no longer used.
--
-- KEEP (Still Used):
-- - reset_run (used by useSimulation.ts)
-- - create_snapshot (used by useSimulation.ts)
--
-- WARNING: This is a DESTRUCTIVE operation. Backup your database first!
-- Test in staging before running in production.

BEGIN;

-- ============================================================
-- Category 1: Old User Management (4 functions)
-- ============================================================

DROP FUNCTION IF EXISTS public.add_simulation_user(
  p_simulation_id uuid,
  p_user_id uuid,
  p_role text
) CASCADE;

DROP FUNCTION IF EXISTS public.authenticate_simulation_user(
  p_simulation_id uuid,
  p_user_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.delete_simulation_users_for_tenant(
  p_tenant_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.assign_users_to_simulation(
  p_simulation_id uuid,
  p_user_ids uuid[]
) CASCADE;

-- ============================================================
-- Category 2: Old Run System (4 functions)
-- ============================================================

DROP FUNCTION IF EXISTS public.delete_simulation_run(
  p_run_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.delete_simulation_run_safe(
  p_run_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.start_simulation_run(
  p_run_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.stop_simulation_run(
  p_run_id uuid
) CASCADE;

-- ============================================================
-- Category 3: Old Tenant System (2 functions)
-- ============================================================

DROP FUNCTION IF EXISTS public.create_simulation_subtenant(
  p_parent_tenant_id uuid,
  p_simulation_id uuid,
  p_name text
) CASCADE;

DROP FUNCTION IF EXISTS public.delete_simulation_tenant_safe(
  p_tenant_id uuid
) CASCADE;

-- ============================================================
-- Category 4: Old Instance System (3 functions)
-- ============================================================

DROP FUNCTION IF EXISTS public.launch_simulation_instance(
  p_snapshot_id uuid,
  p_user_id uuid,
  p_tenant_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.reset_simulation_instance(
  p_instance_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.instantiate_simulation_patients(
  p_instance_id uuid,
  p_snapshot_data jsonb
) CASCADE;

-- ============================================================
-- Category 5: Old Activity/Lobby (4 functions)
-- ============================================================

DROP FUNCTION IF EXISTS public.record_simulation_activity(
  p_instance_id uuid,
  p_user_id uuid,
  p_activity_type text,
  p_activity_data jsonb
) CASCADE;

DROP FUNCTION IF EXISTS public.join_simulation_lobby(
  p_simulation_id uuid,
  p_user_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.start_simulation(
  p_simulation_id uuid,
  p_user_id uuid
) CASCADE;

DROP FUNCTION IF EXISTS public.get_user_assigned_simulations(
  p_user_id uuid
) CASCADE;

-- ============================================================
-- Category 6: Old Label System (2 functions)
-- ============================================================

DROP FUNCTION IF EXISTS public.generate_simulation_id_sets(
  p_simulation_id uuid,
  p_count integer
) CASCADE;

DROP FUNCTION IF EXISTS public.get_simulation_label_data(
  p_simulation_id uuid
) CASCADE;

COMMIT;

-- ============================================================
-- Verification Query
-- ============================================================
-- Run this after the drop to verify functions are gone:
--
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
--   AND routine_name IN (
--     'add_simulation_user',
--     'authenticate_simulation_user', 
--     'delete_simulation_users_for_tenant',
--     'assign_users_to_simulation',
--     'delete_simulation_run',
--     'delete_simulation_run_safe',
--     'start_simulation_run',
--     'stop_simulation_run',
--     'create_simulation_subtenant',
--     'delete_simulation_tenant_safe',
--     'launch_simulation_instance',
--     'reset_simulation_instance',
--     'instantiate_simulation_patients',
--     'record_simulation_activity',
--     'join_simulation_lobby',
--     'start_simulation',
--     'get_user_assigned_simulations',
--     'generate_simulation_id_sets',
--     'get_simulation_label_data'
--   );
--
-- Expected result: 0 rows (all functions dropped)

-- ============================================================
-- Rollback Plan (if needed)
-- ============================================================
-- These functions were part of the old simulation architecture.
-- The source code has been removed from the repository.
-- To restore, you would need to:
-- 1. Revert the git commit that removed src/simulation/engine/
-- 2. Revert the git commit that removed src/simulation/controllers/
-- 3. Revert the git commit that removed src/simulation/types/
-- 4. Recreate the functions from the old codebase
--
-- However, since these functions were unused, restoration should not be necessary.
