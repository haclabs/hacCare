-- ============================================================================
-- SECURITY: Restrict bulk_create_students to service_role only
-- ============================================================================
-- Finding: H-3 (Adversarial Security Audit, April 26 2026)
--
-- The function was previously GRANTed to the `authenticated` role, meaning any
-- logged-in user (including nurse/student roles) could call it directly to
-- batch-create auth.users rows, bypassing Supabase Auth APIs and rate limits.
--
-- Fix: Revoke from authenticated, grant only to service_role.
-- Callers must go through a server-side path (edge function with auth check)
-- rather than calling supabase.rpc() directly from the browser client.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.bulk_create_students FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_create_students TO service_role;
