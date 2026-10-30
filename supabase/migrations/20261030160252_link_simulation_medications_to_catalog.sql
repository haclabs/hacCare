-- Link free-entry medications in simulation templates and running simulations to the
-- medication catalog. Printed medication labels come from the catalog, so a free-entry
-- medication (random M?##### barcode) can't be scanned at the bedside.
--
-- Matches by medication name (never by UUID or barcode), only for rows with no catalog_id,
-- and only in simulation_template / simulation_active tenants. Each matched row takes the
-- catalog entry's barcode, as every catalog-linked medication already does.
-- Template and template-state snapshots are patched in place rather than re-saved, so any
-- other unsaved edits in the template tenants are not captured by this migration.

-- Potassium Chloride IV was deactivated but is ordered in a DKA template.
UPDATE medications_catalog SET is_active = true WHERE barcode = 'MZ018' AND NOT is_active;

INSERT INTO medications_catalog (barcode, name, generic_name, brand_name, formulation, strength, route, category, display_order, is_active)
VALUES
  ('MZ110', 'Amlodipine',              'Amlodipine besylate',              'Norvasc',            'tablet',          '5 mg',            'oral',          'scheduled', 110, true),
  ('MZ111', 'Azithromycin',            'Azithromycin',                     'Zithromax',          'IV solution',     '500 mg',          'intravenous',   'scheduled', 111, true),
  ('MZ112', 'Budesonide/Formoterol',   'Budesonide / Formoterol fumarate', 'Symbicort Turbuhaler', 'inhaler',       '200/6 mcg/inhalation', 'inhalation', 'scheduled', 112, true),
  ('MZ113', 'Cyanocobalamin',          'Cyanocobalamin (Vitamin B12)',     null,                 'injection',       '1000 mcg/mL',     'intramuscular', 'scheduled', 113, true),
  ('MZ114', 'Acetaminophen/Codeine',   'Acetaminophen / Codeine phosphate', 'Tylenol #3',        'tablet',          '300 mg/30 mg',    'oral',          'prn',       114, true)
ON CONFLICT (barcode) DO NOTHING;

CREATE TEMP TABLE med_catalog_map (name_key text PRIMARY KEY, barcode text NOT NULL) ON COMMIT DROP;
INSERT INTO med_catalog_map (name_key, barcode) VALUES
  ('cefazolin',                                   'MZ021'),
  ('beclomethasone (qvar) mdi',                   'MZ108'),
  ('insulin lispro (admelog)',                    'MZ089'),
  ('morphine sulfate iv every 4 hours prn',       'MZ007'),
  ('dextrose 5% 0.45% normal saline (d5 1/2ns)',  'MZ045'),
  ('0.9% sodium chloride',                        'MZ043'),
  ('potassium chloride',                          'MZ018'),
  ('amlodipine',                                  'MZ110'),
  ('azithromycin',                                'MZ111'),
  ('budesonide/formoterol (symbicort turbuhaler)', 'MZ112'),
  ('cyanocobalamin',                              'MZ113'),
  ('tylenol # 3',                                 'MZ114');

-- Live medication rows
UPDATE patient_medications m
SET catalog_id = c.id, barcode = c.barcode
FROM tenants t, med_catalog_map mp, medications_catalog c
WHERE t.id = m.tenant_id
  AND t.tenant_type IN ('simulation_template', 'simulation_active')
  AND m.catalog_id IS NULL
  AND mp.name_key = lower(btrim(m.name))
  AND c.barcode = mp.barcode;

-- Snapshot copies (used at launch and on reset)
CREATE FUNCTION pg_temp.link_snapshot_meds(p_snapshot jsonb) RETURNS jsonb
LANGUAGE sql AS $$
  SELECT jsonb_set(p_snapshot, '{patient_medications}', jsonb_agg(
           CASE WHEN e->>'catalog_id' IS NULL AND c.id IS NOT NULL
                THEN e || jsonb_build_object('catalog_id', c.id, 'barcode', c.barcode)
                ELSE e END
           ORDER BY ord))
  FROM jsonb_array_elements(p_snapshot->'patient_medications') WITH ORDINALITY x(e, ord)
  LEFT JOIN med_catalog_map mp ON mp.name_key = lower(btrim(e->>'name'))
  LEFT JOIN medications_catalog c ON c.barcode = mp.barcode
$$;

CREATE FUNCTION pg_temp.has_linkable_meds(p_snapshot jsonb) RETURNS boolean
LANGUAGE sql AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_snapshot->'patient_medications') e
    JOIN med_catalog_map mp ON mp.name_key = lower(btrim(e->>'name'))
    WHERE e->>'catalog_id' IS NULL)
$$;

UPDATE simulation_templates
SET snapshot_data = pg_temp.link_snapshot_meds(snapshot_data)
WHERE jsonb_typeof(snapshot_data->'patient_medications') = 'array'
  AND pg_temp.has_linkable_meds(snapshot_data);

UPDATE simulation_template_states
SET snapshot_data = pg_temp.link_snapshot_meds(snapshot_data)
WHERE jsonb_typeof(snapshot_data->'patient_medications') = 'array'
  AND pg_temp.has_linkable_meds(snapshot_data);

DO $$
DECLARE v_left int;
BEGIN
  SELECT count(*) INTO v_left
  FROM patient_medications m
  JOIN tenants t ON t.id = m.tenant_id AND t.tenant_type IN ('simulation_template', 'simulation_active')
  WHERE m.catalog_id IS NULL;
  IF v_left > 0 THEN
    RAISE EXCEPTION '% simulation medications are still not linked to the catalog', v_left;
  END IF;

  SELECT count(*) INTO v_left
  FROM (SELECT snapshot_data FROM simulation_templates UNION ALL SELECT snapshot_data FROM simulation_template_states) s
  WHERE jsonb_typeof(s.snapshot_data->'patient_medications') = 'array'
    AND pg_temp.has_linkable_meds(s.snapshot_data);
  IF v_left > 0 THEN
    RAISE EXCEPTION '% snapshots still hold unlinked medications', v_left;
  END IF;
END $$;
