-- Timed doctors' orders: an instructor can hold an order back from students until N minutes after
-- the simulation is started (simulation_active.starts_at, set by Play, cleared by reset).
--
-- NULL / 0 = visible immediately, so every existing order keeps its current behaviour.
--
-- The column needs no snapshot/reset wiring: save_template_snapshot_v2 captures rows with
-- to_jsonb(t.*) and restore_snapshot_to_tenant copies any key that exists as a column, so the delay
-- travels template -> simulation. Reset nulls starts_at, so the countdown restarts on the next Play.

ALTER TABLE public.doctors_orders
  ADD COLUMN IF NOT EXISTS release_after_minutes integer;

ALTER TABLE public.doctors_orders
  DROP CONSTRAINT IF EXISTS doctors_orders_release_after_minutes_check;

ALTER TABLE public.doctors_orders
  ADD CONSTRAINT doctors_orders_release_after_minutes_check
  CHECK (release_after_minutes IS NULL OR release_after_minutes BETWEEN 0 AND 1440);

COMMENT ON COLUMN public.doctors_orders.release_after_minutes IS
  'Minutes after simulation_active.starts_at before students can see this order. NULL/0 = immediately. Staff roles always see it.';

-- SECURITY DEFINER so the check can read simulation_active and user_profiles regardless of the
-- caller's own RLS on those tables (students cannot always select their simulation_active row).
CREATE OR REPLACE FUNCTION public.doctors_order_is_released(
  p_tenant_id uuid,
  p_release_after_minutes integer
) RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT
    COALESCE(p_release_after_minutes, 0) <= 0
    -- Staff always see held orders (they author and run the scenario).
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.is_active = true
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
    -- Only simulation tenants hold orders back; templates and production show everything.
    OR NOT EXISTS (
      SELECT 1 FROM public.simulation_active sa WHERE sa.tenant_id = p_tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM public.simulation_active sa
      WHERE sa.tenant_id = p_tenant_id
        AND sa.starts_at IS NOT NULL
        AND sa.starts_at + make_interval(mins => p_release_after_minutes) <= now()
    );
$$;

ALTER FUNCTION public.doctors_order_is_released(uuid, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.doctors_order_is_released(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doctors_order_is_released(uuid, integer) TO authenticated, service_role;

-- RESTRICTIVE: ANDed with the existing permissive doctors_orders_access (tenant membership), so it
-- can only narrow what a user sees, never widen it.
DROP POLICY IF EXISTS doctors_orders_hide_unreleased ON public.doctors_orders;

CREATE POLICY doctors_orders_hide_unreleased
  ON public.doctors_orders
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.doctors_order_is_released(tenant_id, release_after_minutes));
