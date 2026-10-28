-- Two more unused functions, orphaned once 20261028021622_drop_unused_functions removed their
-- callers. Neither is called by the app, an edge function, another function, an RLS policy, a view
-- or a trigger, and pg_depend lists no dependents. Both were SECURITY DEFINER.
--
-- ensure_user_profile(uuid, text) is the unused overload; the trigger overload ensure_user_profile()
-- stays.

DROP FUNCTION IF EXISTS public.ensure_user_profile(uuid, text);
DROP FUNCTION IF EXISTS public.generate_simulation_id_sets(uuid, integer, text[]);
