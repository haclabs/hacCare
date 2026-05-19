-- ============================================================================
-- Drop bulk_create_students function — feature removed April 27 2026
-- ============================================================================
-- Reason: The function wrote directly to auth.users using raw SQL INSERT,
-- which is unsupported in hosted Supabase (the Auth API gateway must be used
-- for user creation). The feature was never production-ready.
--
-- Additionally, the function had an overly broad SECURITY DEFINER grant that
-- allowed any authenticated user to invoke it via /rest/v1/rpc.
--
-- Student creation is now handled manually via AddStudentModal (single user)
-- combined with the Supabase Auth dashboard for bulk needs.
-- ============================================================================

DROP FUNCTION IF EXISTS public.bulk_create_students(uuid, jsonb);
