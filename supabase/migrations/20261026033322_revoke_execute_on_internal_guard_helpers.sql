-- These helpers are only ever called from inside other SECURITY DEFINER functions,
-- which run as the function owner, so signed-in users never need EXECUTE on them.
-- Revoking removes them from the PostgREST RPC surface (and clears Supabase advisor
-- warning 0029 for each). Helpers referenced by RLS policies are NOT listed here:
-- policies are evaluated as the querying role and need EXECUTE.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND (p.proname LIKE 'assert\_%' OR p.proname IN ('resolve_owner_institution', 'user_institution_ids'))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
