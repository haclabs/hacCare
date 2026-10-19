-- Standardise medications_catalog names to "Generic (Brand)".
--
-- Instructors asked for brand names on labels, e.g. "Insulin Lispro (Admelog)". Label templates
-- now print a trailing "(Brand)" on its own smaller line (splitMedicationName in
-- src/services/operations/bulkLabelService.ts), so the brand no longer gets cut off.
--
-- This supersedes the brand handling in 20261019000000_clean_up_medication_catalog_labels.sql,
-- which reduced insulins to the generic name and moved the brand into notes; that brand prefix
-- is removed from notes again here. Brand-only names (Lantus, Ancef, ...) gain their generic name,
-- and two typos are fixed (Humolog → Humalog, generic Pantoprozole → Pantoprazole).
--
-- Data-only. Each UPDATE is keyed on the stable barcode and only applies while the name still
-- holds the value it had after 20261019000000, so re-running is a no-op and later admin edits
-- are left alone. Barcodes are unchanged; existing patient medications keep their copied names.

-- Restore brands removed by 20261019000000 (and drop the "Brand: …" notes prefix it added)
UPDATE public.medications_catalog
  SET name = 'Insulin Degludec (Tresiba)', notes = NULLIF(regexp_replace(notes, '^Brand: [^.]*\.\s*', ''), '')
  WHERE barcode = 'MZ074' AND name = 'Insulin Degludec';
UPDATE public.medications_catalog
  SET name = 'Insulin Aspart (Trurapi Solostar)', notes = NULLIF(regexp_replace(notes, '^Brand: [^.]*\.\s*', ''), '')
  WHERE barcode = 'MZ075' AND name = 'Insulin Aspart';
UPDATE public.medications_catalog
  SET name = 'Insulin Lispro (Admelog)', notes = NULLIF(regexp_replace(notes, '^Brand: [^.]*\.\s*', ''), '')
  WHERE barcode = 'MZ089' AND name = 'Insulin Lispro';
UPDATE public.medications_catalog
  SET name = 'Insulin NPH (Novolin ge NPH)', notes = NULLIF(regexp_replace(notes, '^Brand: [^.]*\.\s*', ''), '')
  WHERE barcode = 'MZ106' AND name = 'Insulin NPH';
UPDATE public.medications_catalog
  SET name = 'Beclomethasone (Qvar)', notes = NULLIF(regexp_replace(notes, '^Brand: [^.]*\.\s*', ''), '')
  WHERE barcode = 'MZ108' AND name = 'Beclomethasone';
UPDATE public.medications_catalog
  SET name = 'Tramadol/Acetaminophen (Tramacet)'
  WHERE barcode = 'MZ096' AND name = 'Tramacet';
UPDATE public.medications_catalog
  SET name = 'Sodium Phosphate (Fleet Pediatric)'
  WHERE barcode = 'MZ044' AND name = 'Fleet Pediatric';

-- Brand-only names → "Generic (Brand)"
UPDATE public.medications_catalog SET name = 'Hydromorphone (Dilaudid)'
  WHERE barcode = 'MZ020' AND name = 'Dilaudid';
UPDATE public.medications_catalog SET name = 'Cefazolin (Ancef)'
  WHERE barcode = 'MZ021' AND name = 'Ancef';
UPDATE public.medications_catalog SET name = 'Pantoprazole (Pantoloc)', generic_name = 'Pantoprazole'
  WHERE barcode = 'MZ023' AND name = 'Pantoloc';
UPDATE public.medications_catalog SET name = 'Apixaban (Eliquis)'
  WHERE barcode = 'MZ025' AND name = 'Eliquis';
UPDATE public.medications_catalog SET name = 'Insulin Aspart (NovoRapid)', generic_name = 'Insulin Aspart'
  WHERE barcode = 'MZ027' AND name = 'Novorapid';
UPDATE public.medications_catalog
  SET name = 'Fluticasone/Salmeterol (Advair)', generic_name = 'Fluticasone propionate / Salmeterol'
  WHERE barcode = 'MZ028' AND name = 'Advair';
UPDATE public.medications_catalog SET name = 'Salbutamol (Ventolin)', generic_name = 'Salbutamol'
  WHERE barcode = 'MZ029' AND name = 'Ventolin';
UPDATE public.medications_catalog SET name = 'Ondansetron (Zofran)', generic_name = 'Ondansetron'
  WHERE barcode = 'MZ031' AND name = 'Zofran';
UPDATE public.medications_catalog SET name = 'Enoxaparin (Lovenox)'
  WHERE barcode = 'MZ033' AND name = 'Lovenox';
UPDATE public.medications_catalog SET name = 'Insulin Lispro (Humalog)', generic_name = 'Insulin Lispro'
  WHERE barcode = 'MZ034' AND name = 'Humolog';
UPDATE public.medications_catalog SET name = 'Insulin Glargine (Lantus)', generic_name = 'Insulin Glargine'
  WHERE barcode = 'MZ035' AND name = 'Lantus';
UPDATE public.medications_catalog SET name = 'Ceftriaxone (Rocephin)', strength = '2 g'
  WHERE barcode = 'MZ040' AND name = 'Rocephin' AND strength = '2 gram';
