-- Give every template medication a stable barcode (applied 2026-10-19).
--
-- 12 medications in the Robert Hutchins and Maria Alvarez patient templates and in
-- "WALKTHROUGH — DKA Faculty Training" (copied from Maria Alvarez) were inserted on 2026-08-28
-- without a barcode, bypassing the Add Medication form. Labels then fell back to a code derived
-- from the row id, which changes at every launch, so printed labels could not scan.
--
-- Catalog drugs are linked to their catalog entry (catalog barcode); true custom drugs get a fixed
-- free-entry M-code. Rows are matched on name + dosage + route so every copy (live rows, patient
-- template / simulation template / template state snapshots) gets the same barcode. Only rows
-- with an empty barcode are touched. Migration 20261019000003 stops new medications being saved
-- without one.

DO $$
BEGIN
  CREATE TEMP TABLE med_barcode_map (name text, dosage text, route text, barcode text, catalog_id uuid) ON COMMIT DROP;
  INSERT INTO med_barcode_map VALUES
    ('Ondansetron',                    '4mg',                        'IV',        'MZ008',   'cd88a106-755f-4d32-8f61-a697b507a142'),
    ('Regular Insulin',                'Per protocol',               'IV',        'MZ011',   '7c4bd55e-3763-483f-bec5-b6d2bd34a301'),
    ('Ceftriaxone',                    '1g',                         'IV',        'MZ088',   'df427efa-028e-46b9-ab82-70bcece7eeb8'),
    ('Prednisone',                     '40mg',                       'PO',        'MZ042',   'bde8a429-f34f-4c99-8570-cf7ae4a883f6'),
    ('0.9% Sodium Chloride',           '1000mL bolus then 250mL/hr', 'IV',        'MS87187', NULL),
    ('Potassium Chloride',             '20mEq',                      'IV',        'MP52301', NULL),
    ('Azithromycin',                   '500mg',                      'PO',        'MA25766', NULL),
    ('Albuterol-Ipratropium (DuoNeb)', '3mL',                        'Nebulizer', 'MA37780', NULL);

  UPDATE patient_medications pm
  SET barcode = m.barcode, catalog_id = m.catalog_id
  FROM med_barcode_map m
  WHERE coalesce(pm.barcode, '') = ''
    AND pm.name = m.name AND pm.dosage = m.dosage AND pm.route = m.route;

  UPDATE patient_templates t SET snapshot_data = jsonb_set(t.snapshot_data, '{patient_medications}', (
      SELECT jsonb_agg(CASE WHEN coalesce(e->>'barcode', '') = '' AND m.barcode IS NOT NULL
                            THEN e || jsonb_build_object('barcode', m.barcode, 'catalog_id', m.catalog_id)
                            ELSE e END ORDER BY i)
      FROM jsonb_array_elements(t.snapshot_data->'patient_medications') WITH ORDINALITY a(e, i)
      LEFT JOIN med_barcode_map m ON m.name = e->>'name' AND m.dosage = e->>'dosage' AND m.route = e->>'route'))
  WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(t.snapshot_data->'patient_medications', '[]'::jsonb)) e
                WHERE coalesce(e->>'barcode', '') = '');

  UPDATE simulation_templates t SET snapshot_data = jsonb_set(t.snapshot_data, '{patient_medications}', (
      SELECT jsonb_agg(CASE WHEN coalesce(e->>'barcode', '') = '' AND m.barcode IS NOT NULL
                            THEN e || jsonb_build_object('barcode', m.barcode, 'catalog_id', m.catalog_id)
                            ELSE e END ORDER BY i)
      FROM jsonb_array_elements(t.snapshot_data->'patient_medications') WITH ORDINALITY a(e, i)
      LEFT JOIN med_barcode_map m ON m.name = e->>'name' AND m.dosage = e->>'dosage' AND m.route = e->>'route'))
  WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(t.snapshot_data->'patient_medications', '[]'::jsonb)) e
                WHERE coalesce(e->>'barcode', '') = '');

  UPDATE simulation_template_states t SET snapshot_data = jsonb_set(t.snapshot_data, '{patient_medications}', (
      SELECT jsonb_agg(CASE WHEN coalesce(e->>'barcode', '') = '' AND m.barcode IS NOT NULL
                            THEN e || jsonb_build_object('barcode', m.barcode, 'catalog_id', m.catalog_id)
                            ELSE e END ORDER BY i)
      FROM jsonb_array_elements(t.snapshot_data->'patient_medications') WITH ORDINALITY a(e, i)
      LEFT JOIN med_barcode_map m ON m.name = e->>'name' AND m.dosage = e->>'dosage' AND m.route = e->>'route'))
  WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(t.snapshot_data->'patient_medications', '[]'::jsonb)) e
                WHERE coalesce(e->>'barcode', '') = '');
END $$;
