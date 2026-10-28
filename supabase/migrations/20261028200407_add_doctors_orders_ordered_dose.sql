-- Medication orders: the dose the doctor ordered (e.g. "50 mg") is stored separately from the
-- linked MAR entry's dosage, which holds the label strength (e.g. "25 mg" per tablet) that BCMA
-- uses for tablet counting. Students compare the two to work out how much to give.
-- Snapshot, launch and reset copy doctors_orders rows column-by-column dynamically, so no
-- function changes are needed. NULL for ordinary orders.
ALTER TABLE public.doctors_orders
  ADD COLUMN IF NOT EXISTS ordered_dose text;

COMMENT ON COLUMN public.doctors_orders.ordered_dose IS
  'Medication orders only: dose as ordered (e.g. "50 mg"). The linked patient_medications.dosage is the label strength.';
