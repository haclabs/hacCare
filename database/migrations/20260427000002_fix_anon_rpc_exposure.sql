-- ============================================================================
-- FIX: SECURITY DEFINER Functions Executable by anon Role
-- ============================================================================
-- Supabase Security Advisor lint 0028 — ~249 warnings
--
-- Root cause: PostgreSQL grants EXECUTE to PUBLIC (includes anon) by default
-- on every function. No migration ever ran REVOKE before granting to
-- authenticated, so every function in the public schema is reachable at
-- /rest/v1/rpc/<name> without any authentication token.
--
-- Fix has two parts:
--   1. Blanket REVOKE from anon on all existing functions — immediate fix
--   2. ALTER DEFAULT PRIVILEGES — prevents future functions auto-exposing
--
-- Safe because:
--   - The browser client sends a JWT → authenticated role, not anon
--   - All GRANT EXECUTE TO authenticated remain untouched
--   - Trigger/cron functions never called via PostgREST (not affected)
--   - No legitimate use case for unauthenticated callers on any of these
-- ============================================================================

-- ============================================================================
-- PART 1: Prevent future functions from auto-exposing to anon
-- ============================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- ============================================================================
-- PART 2: Blanket-revoke anon from all existing public functions
-- ============================================================================
-- This closes the unauthenticated /rest/v1/rpc/ attack surface for all
-- existing functions in one statement. Does NOT affect authenticated grants.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- ============================================================================
-- PART 3: Restore authenticated access to all functions
-- ============================================================================
-- Part 2 revoked PUBLIC (which may have been the only grant on some functions).
-- Re-grant authenticated to everything so no API function breaks.
-- Then Part 4 revokes the legacy helpers that should not be API-callable.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- PART 4: Revoke authenticated from legacy internal-only helper functions
-- ============================================================================
-- These functions are:
--   - Not called via supabase.rpc() anywhere in the TypeScript codebase
--   - Only referenced in supabase.ts auto-generated types (discovery artifact)
--   - Used only as internal RLS policy helpers or fully superseded
-- Revoking authenticated removes them from the /rest/v1/rpc/ surface entirely.

-- Legacy RLS/permission helpers — superseded by direct tenant_users subqueries
-- in all policies since the April 2026 migration series
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_tenant_access() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_tenant_access(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_is_super_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_patient_access(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_is_super_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_direct(uuid) FROM authenticated;

-- Internal-only utility functions — not part of the public API surface
REVOKE EXECUTE ON FUNCTION public.cleanup_old_user_sessions() FROM authenticated;
-- Note: prune_system_logs() not yet deployed to live DB — no REVOKE needed.

-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- Confirm anon has no execute grants in public schema:
--   SELECT proname, proacl
--   FROM pg_proc
--   JOIN pg_namespace n ON n.oid = pronamespace
--   WHERE n.nspname = 'public'
--     AND proacl::text LIKE '%anon%'
--   ORDER BY proname;
-- Expected: 0 rows
--
-- Confirm active API functions still have authenticated:
--   SELECT proname FROM pg_proc
--   JOIN pg_namespace n ON n.oid = pronamespace
--   WHERE n.nspname = 'public'
--     AND proname = 'launch_simulation'
--     AND proacl::text LIKE '%authenticated%';
-- Expected: 1 row
