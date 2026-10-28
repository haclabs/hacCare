-- Medication doctors' orders: a doctors_orders row can create its own MAR entry, and the MAR / BCMA
-- show the order text (dose, hold parameters, instructions) next to that medication.
--
-- The two rows share an order_link_key rather than a foreign key. Launch, template snapshots and
-- both reset functions regenerate every id, and restore_snapshot_to_tenant rewrites any *_id
-- column only when the referenced row happened to be restored first. A plain uuid named *_key is
-- copied verbatim, so the pair stays matched through launch, reset_simulation_for_next_session
-- (medications kept, orders re-inserted from the snapshot) and template states. The key repeats
-- across tenants by design; it is only ever looked up together with tenant_id.
-- NULL on both tables = an ordinary order / medication, so all existing rows are unaffected.

ALTER TABLE public.doctors_orders
  ADD COLUMN IF NOT EXISTS order_link_key uuid;

ALTER TABLE public.patient_medications
  ADD COLUMN IF NOT EXISTS order_link_key uuid;

COMMENT ON COLUMN public.doctors_orders.order_link_key IS
  'Set on medication orders: the same value is on the patient_medications row this order created. Not a FK so it survives snapshot/launch/reset id regeneration.';
COMMENT ON COLUMN public.patient_medications.order_link_key IS
  'Set when this MAR entry was created from a medication doctors order: matches doctors_orders.order_link_key in the same tenant.';

CREATE UNIQUE INDEX IF NOT EXISTS doctors_orders_order_link_key_uniq
  ON public.doctors_orders (tenant_id, order_link_key)
  WHERE order_link_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patient_medications_order_link_key_uniq
  ON public.patient_medications (tenant_id, order_link_key)
  WHERE order_link_key IS NOT NULL;

-- reset_simulation_with_template_updates is the only function that copies medications with an
-- explicit column list: it inserts template medications that are new to the simulation and
-- refreshes a few columns on existing ones. Edit the live definition in place (as
-- 20261026200056 did) so the access guard and everything else stay exactly as deployed, adding
-- order_link_key to that INSERT and to the refresh UPDATE.
DO $$
DECLARE
  v_def text;
  v_columns text;
  v_values text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.reset_simulation_with_template_updates(uuid, uuid)'::regprocedure);

  v_columns := regexp_replace(
    v_def,
    'catalog_id, barcode, sliding_scale, release_after_minutes\r?\n(\s*)\) VALUES \(',
    E'catalog_id, barcode, sliding_scale, release_after_minutes, order_link_key\n\\1) VALUES ('
  );
  v_values := regexp_replace(
    v_columns,
    '(\(v_template_med->>''release_after_minutes''\)::integer)\r?\n(\s*)\);',
    E'\\1,\n\\2  NULLIF(v_template_med->>''order_link_key'', '''')::uuid\n\\2);'
  );
  v_new := regexp_replace(
    v_values,
    '(release_after_minutes = \(v_template_med->>''release_after_minutes''\)::integer)(\r?\n\s*WHERE tenant_id = v_tenant_id)',
    E'\\1,\n               order_link_key = NULLIF(v_template_med->>''order_link_key'', '''')::uuid\\2'
  );

  IF v_def ~ 'order_link_key'
     OR v_columns = v_def OR v_values = v_columns OR v_new = v_values
     OR v_new !~ 'PERFORM public\.assert_' THEN
    RAISE EXCEPTION 'reset_simulation_with_template_updates: unexpected definition, order_link_key not added cleanly';
  END IF;

  EXECUTE v_new;
END $$;
