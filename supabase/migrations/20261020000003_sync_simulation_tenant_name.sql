-- Keep a simulation's tenant name in step when the simulation is renamed.
--
-- launch_simulation names the tenant 'sim_active_<name>_<epoch>', but only
-- super admins may update `tenants`, so an instructor renaming a simulation
-- from the Active Simulations card could only change simulation_active.name.
-- This trigger runs as the definer so the tenant follows. Who may rename is
-- still decided by simulation_active's own UPDATE policy.
--
-- The subdomain is left alone: nothing routes by it, and changing it would
-- only risk the unique_subdomain constraint.

CREATE OR REPLACE FUNCTION public.sync_simulation_tenant_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suffix text;
BEGIN
  SELECT substring(t.name FROM '_([0-9]+(\.[0-9]+)?)$')
    INTO v_suffix
    FROM tenants t
   WHERE t.id = NEW.tenant_id;

  UPDATE tenants
     SET name = 'sim_active_' || NEW.name || COALESCE('_' || v_suffix, ''),
         updated_at = now()
   WHERE id = NEW.tenant_id
     AND tenant_type = 'simulation_active';

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_simulation_tenant_name() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_sync_simulation_tenant_name ON public.simulation_active;

CREATE TRIGGER trigger_sync_simulation_tenant_name
  AFTER UPDATE OF name ON public.simulation_active
  FOR EACH ROW
  WHEN (NEW.name IS DISTINCT FROM OLD.name)
  EXECUTE FUNCTION public.sync_simulation_tenant_name();
