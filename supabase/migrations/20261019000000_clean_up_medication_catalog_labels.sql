-- Clean up medications_catalog entries that print badly on barcode labels.
--
-- Catalog labels (2.625" x 1" and 1.75" x 0.5" vial) print NAME, then STRENGTH large, then
-- FORMULATION small. Names over ~18 characters are cut off with an ellipsis, and many entries
-- repeated the strength or formulation inside the name, or stored one patient's calculated dose
-- as the strength.
--
-- Data-only. Each UPDATE is keyed on the stable barcode and only applies if the changed fields
-- still hold the values seen in production on 2026-10-19, so entries an admin has edited since
-- are left alone and re-running is a no-op.
--
-- patient_medications copies name/dosage/route at insert, so existing patient medications and
-- their MAR labels are unchanged. Barcodes are unchanged, so printed labels keep scanning.
-- Brand names removed from the name are kept in notes.

-- 1. Names that were cut off on labels or repeated the strength/formulation
UPDATE public.medications_catalog SET name = 'D5 0.45% NaCl', strength = '1000 mL', generic_name = 'Dextrose 5% / Sodium Chloride 0.45%'
  WHERE barcode = 'MZ045' AND name IS NOT DISTINCT FROM 'Dextrose 5% in 0.45% Sodium Chloride (D5 ½ NS)' AND strength IS NOT DISTINCT FROM 'D5 0.45% NaCl / 1000 mL bag' AND generic_name IS NOT DISTINCT FROM 'D5 half normal saline';
UPDATE public.medications_catalog SET name = 'Normal Saline', strength = '1000 mL', generic_name = 'Sodium Chloride 0.9%'
  WHERE barcode = 'MZ043' AND name IS NOT DISTINCT FROM 'Sodium Chloride 0.9% (Normal Saline)' AND strength IS NOT DISTINCT FROM '0.9% / 1000 mL bag' AND generic_name IS NOT DISTINCT FROM 'Normal Saline';
UPDATE public.medications_catalog SET name = 'Cefazolin', strength = '700 mg/50 mL', formulation = 'mini-bag'
  WHERE barcode = 'MZ046' AND name IS NOT DISTINCT FROM 'Cefazolin 700 mg IVPB (Pediatric)' AND strength IS NOT DISTINCT FROM '700 mg in 50 mL NS (IVPB)' AND formulation IS NOT DISTINCT FROM 'IV solution';
UPDATE public.medications_catalog SET name = 'Insulin Degludec', strength = '100 units/mL', notes = 'Brand: Tresiba.' || COALESCE(' ' || notes, '')
  WHERE barcode = 'MZ074' AND name IS NOT DISTINCT FROM 'Insulin Degludec (Tresiba)' AND strength IS NOT DISTINCT FROM '100 units / mL';
UPDATE public.medications_catalog SET name = 'Insulin Aspart', strength = '100 units/mL', notes = 'Brand: Trurapi Solostar.' || COALESCE(' ' || notes, '')
  WHERE barcode = 'MZ075' AND name IS NOT DISTINCT FROM 'Insulin Aspart (Trurapi Solostar)' AND strength IS NOT DISTINCT FROM 'units';
UPDATE public.medications_catalog SET name = 'Insulin Lispro', strength = '100 units/mL', notes = 'Brand: Admelog.' || COALESCE(' ' || notes, '')
  WHERE barcode = 'MZ089' AND name IS NOT DISTINCT FROM 'Insulin Lispro (Admelog)' AND strength IS NOT DISTINCT FROM 'units';
UPDATE public.medications_catalog SET name = 'Insulin NPH', notes = 'Brand: Novolin ge NPH (insulin isophane).' || COALESCE(' ' || notes, '')
  WHERE barcode = 'MZ106' AND name IS NOT DISTINCT FROM 'Novolin NPH (Insulin Isophane)';
UPDATE public.medications_catalog SET name = 'Tramacet'
  WHERE barcode = 'MZ096' AND name IS NOT DISTINCT FROM 'Tramadol/Acetaminophen (Tramacet)';
UPDATE public.medications_catalog SET name = 'Beclomethasone', strength = '40 mcg/puff', notes = 'Brand: Qvar MDI.' || COALESCE(' ' || notes, '')
  WHERE barcode = 'MZ108' AND name IS NOT DISTINCT FROM 'Qvar (Beclomethasone) MDI' AND strength IS NOT DISTINCT FROM '40 mcg/inhalation';
UPDATE public.medications_catalog SET name = 'Hydrocortisone', strength = '1%', generic_name = 'Hydrocortisone'
  WHERE barcode = 'MZ030' AND name IS NOT DISTINCT FROM '1% Hydrocortisone cream' AND strength IS NOT DISTINCT FROM 'UCP 1%' AND generic_name IS NOT DISTINCT FROM '1% Hydrocortisone';
UPDATE public.medications_catalog SET name = 'Acyclovir'
  WHERE barcode = 'MZ038' AND name IS NOT DISTINCT FROM 'Acyclovir cream';
UPDATE public.medications_catalog SET name = 'Fleet Pediatric', strength = '66 mL', formulation = 'enema'
  WHERE barcode = 'MZ044' AND name IS NOT DISTINCT FROM 'Fleet Enema (Pediatric)' AND strength IS NOT DISTINCT FROM '66 mL pediatric' AND formulation IS NOT DISTINCT FROM 'suppository';

-- 2. Strengths that were one patient's calculated dose, not a product strength
UPDATE public.medications_catalog SET strength = '250 mg'
  WHERE barcode = 'MZ052' AND strength IS NOT DISTINCT FROM '221 mg';
UPDATE public.medications_catalog SET strength = '250 mg'
  WHERE barcode = 'MZ047' AND strength IS NOT DISTINCT FROM '55 mg';
UPDATE public.medications_catalog SET strength = '160 mg/5 mL'
  WHERE barcode = 'MZ057' AND strength IS NOT DISTINCT FROM '10 mg/kg';

-- 3. Duplicates, placeholder strengths and over-long formulations
UPDATE public.medications_catalog SET is_active = false
  WHERE barcode = 'MZ032' AND is_active IS NOT DISTINCT FROM true;
UPDATE public.medications_catalog SET name = 'Saline Nasal', strength = '0.9%', formulation = 'drops'
  WHERE barcode = 'MZ049' AND name IS NOT DISTINCT FROM 'Normal Saline Drops' AND strength IS NOT DISTINCT FROM 'drops' AND formulation IS NOT DISTINCT FROM 'nasal drops';
UPDATE public.medications_catalog SET strength = 'per order'
  WHERE barcode = 'MZ050' AND strength IS NOT DISTINCT FROM 'mL';
UPDATE public.medications_catalog SET strength = 'per order'
  WHERE barcode = 'MZ051' AND strength IS NOT DISTINCT FROM 'mL';
UPDATE public.medications_catalog SET strength = '2 g/100 mL', formulation = 'mini-bag'
  WHERE barcode = 'MZ086' AND strength IS NOT DISTINCT FROM '2 g' AND formulation IS NOT DISTINCT FROM 'vial or pre-mixed mini-bag 100 mL';
UPDATE public.medications_catalog SET strength = '300 mg/250 mL', formulation = 'mini-bag'
  WHERE barcode = 'MZ066' AND strength IS NOT DISTINCT FROM '300 mg' AND formulation IS NOT DISTINCT FROM 'pre-mixed mini-bag 250 mL';

-- 4. Strength formatting: space between number and unit, mL casing, no spaces around "/"
UPDATE public.medications_catalog SET strength = '1000 mg'
  WHERE barcode = 'MZ021' AND strength IS NOT DISTINCT FROM '1000mg';
UPDATE public.medications_catalog SET strength = '1000 mg'
  WHERE barcode = 'MZ022' AND strength IS NOT DISTINCT FROM '1000mg';
UPDATE public.medications_catalog SET strength = '1000 mg'
  WHERE barcode = 'MZ023' AND strength IS NOT DISTINCT FROM '1000mg';
UPDATE public.medications_catalog SET strength = '50 mg'
  WHERE barcode = 'MZ024' AND strength IS NOT DISTINCT FROM '50mg';
UPDATE public.medications_catalog SET strength = '5 mg'
  WHERE barcode = 'MZ025' AND strength IS NOT DISTINCT FROM '5mg';
UPDATE public.medications_catalog SET strength = '100 mg'
  WHERE barcode = 'MZ026' AND strength IS NOT DISTINCT FROM '100mg';
UPDATE public.medications_catalog SET strength = '100 units/mL'
  WHERE barcode = 'MZ027' AND strength IS NOT DISTINCT FROM '100 units/ml';
UPDATE public.medications_catalog SET strength = '2 mg/mL'
  WHERE barcode = 'MZ031' AND strength IS NOT DISTINCT FROM '2mg/ml';
UPDATE public.medications_catalog SET strength = '300 mg/3 mL'
  WHERE barcode = 'MZ033' AND strength IS NOT DISTINCT FROM '300mg/3ml';
UPDATE public.medications_catalog SET strength = '100 units/mL'
  WHERE barcode = 'MZ034' AND strength IS NOT DISTINCT FROM '100 units/ml';
UPDATE public.medications_catalog SET strength = '100 units/mL'
  WHERE barcode = 'MZ035' AND strength IS NOT DISTINCT FROM '100 units/ml';
UPDATE public.medications_catalog SET strength = '500 mg'
  WHERE barcode = 'MZ036' AND strength IS NOT DISTINCT FROM '500mg';
UPDATE public.medications_catalog SET strength = '1000 mg'
  WHERE barcode = 'MZ037' AND strength IS NOT DISTINCT FROM '1000mg';
UPDATE public.medications_catalog SET strength = '100 mg'
  WHERE barcode = 'MZ039' AND strength IS NOT DISTINCT FROM '100mg';
UPDATE public.medications_catalog SET strength = '50 mg/mL'
  WHERE barcode = 'MZ041' AND strength IS NOT DISTINCT FROM '50mg/ml';
UPDATE public.medications_catalog SET strength = '20 mg'
  WHERE barcode = 'MZ042' AND strength IS NOT DISTINCT FROM '20mg';
