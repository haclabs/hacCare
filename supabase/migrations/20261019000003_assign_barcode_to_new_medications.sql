-- Never store a patient medication without a barcode.
--
-- Printed MAR labels need a stable barcode. Catalog picks carry the catalog's MZ code and the Add
-- Medication form generates a free-entry M-code, but anything else that inserts into
-- patient_medications (seed scripts, SQL, the QA seed button) could leave it NULL. Labels then fell
-- back to a code derived from the row id, which changes at every launch, so they never scanned:
-- 12 template medications were in that state (fixed by
-- database/fixes/20261019_assign_stable_barcodes_to_template_medications.sql).
--
-- The trigger assigns a free-entry code in the Add form's format ("M" + first letter of the name +
-- 5 digits) only when none is supplied. Launch, reset and snapshot restore pass the template's
-- barcode through, so assigned codes stay stable from then on.
--
-- Also drops create_medication_super_admin: unused by the app and it never set a barcode.

CREATE OR REPLACE FUNCTION public.assign_free_entry_medication_barcode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_prefix   text;
  v_code     text;
  v_attempts int := 0;
BEGIN
  IF NEW.barcode IS NOT NULL AND btrim(NEW.barcode) <> '' THEN
    RETURN NEW;
  END IF;

  v_prefix := 'M' || upper(coalesce(nullif(left(regexp_replace(coalesce(NEW.name, ''), '[^A-Za-z]', '', 'g'), 1), ''), 'X'));
  LOOP
    v_code := v_prefix || (10000 + floor(random() * 90000))::int::text;
    v_attempts := v_attempts + 1;
    EXIT WHEN v_attempts >= 5 OR NOT EXISTS (SELECT 1 FROM patient_medications WHERE barcode = v_code);
  END LOOP;

  NEW.barcode := v_code;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.assign_free_entry_medication_barcode() IS
  'BEFORE INSERT on patient_medications: assigns a free-entry M-code when no barcode is supplied, so printed labels stay scannable.';

DROP TRIGGER IF EXISTS trg_assign_free_entry_medication_barcode ON public.patient_medications;
CREATE TRIGGER trg_assign_free_entry_medication_barcode
  BEFORE INSERT ON public.patient_medications
  FOR EACH ROW EXECUTE FUNCTION public.assign_free_entry_medication_barcode();

DROP FUNCTION IF EXISTS public.create_medication_super_admin(uuid, text, text, text, text, date, date, text, text, text, text);
