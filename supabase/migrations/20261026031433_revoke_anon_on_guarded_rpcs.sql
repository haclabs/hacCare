-- Defence in depth for 20261026031253_guard_privileged_rpcs: nothing calls these
-- before login, so the anon role (anon key, no session) should not reach them at all.
-- Targets every SECURITY DEFINER function carrying the "-- access guard" marker.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef
      AND p.prosrc LIKE '%-- access guard%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;
