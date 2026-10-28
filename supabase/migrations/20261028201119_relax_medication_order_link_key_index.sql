-- reset_simulation_with_template_updates matches medications by patient + name + dosage + route.
-- When a template medication order's strength is edited, the reset inserts the new version (same
-- order_link_key) before step 3B deletes the old one, and when a patient has two identical
-- medications the refresh UPDATE stamps the key on both. A unique index rejects both cases
-- (the INSERT failure is swallowed and the medication disappears from the simulation), so the
-- medication side keeps a plain lookup index. doctors_orders stays unique: resets delete and
-- re-insert orders wholesale from the snapshot.
DROP INDEX IF EXISTS public.patient_medications_order_link_key_uniq;

CREATE INDEX IF NOT EXISTS patient_medications_order_link_key_idx
  ON public.patient_medications (tenant_id, order_link_key)
  WHERE order_link_key IS NOT NULL;
