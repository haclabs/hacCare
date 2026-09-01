-- ============================================================================
-- RE-APPLY: SECURITY DEFINER Functions Executable by anon/PUBLIC
-- ============================================================================
-- Supabase Security Advisor was still flagging "Public Can Execute SECURITY
-- DEFINER Function" for many functions as of 2026-09-01, despite this class
-- of issue already having been fixed once in
-- database/migrations/history/20260427000002_fix_anon_rpc_exposure.sql.
--
-- Root cause of the regression: `CREATE OR REPLACE FUNCTION` only preserves
-- existing GRANT/REVOKE privileges when the function's signature (arg types)
-- is unchanged. Every migration since that only changed a function's
-- parameters (added one, changed a type, etc.) created a new function object
-- under the hood, which reset back to Postgres's default of EXECUTE granted
-- to PUBLIC (including the unauthenticated `anon` role) — silently
-- re-exposing it at /rest/v1/rpc/<name> with no auth token required.
--
-- This migration is a blanket, idempotent re-application of the original
-- fix. Safe to run repeatedly: REVOKE on a grant that doesn't exist is a
-- no-op, and this only touches EXECUTE privileges, never table data.
-- ============================================================================

-- Prevent any future function (new or replaced-with-changed-signature) from
-- auto-exposing to anon/PUBLIC again.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Close the current exposure on every existing function in one shot.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Restore authenticated access to everything the app actually calls via
-- supabase.rpc() — the browser client always sends a JWT (authenticated
-- role), never anon, for any of these RPC calls.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFY (run manually after applying, in the Supabase SQL editor)
-- ============================================================================
-- Confirm no function in the public schema still grants execute to anon/PUBLIC:
--   SELECT p.proname, p.proacl
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND (p.proacl::text LIKE '%anon%' OR p.proacl IS NULL);
-- (proacl IS NULL means "default privileges apply", which after this
-- migration means PUBLIC/anon have no grant — but re-run this migration
-- after any future signature change just in case.)
