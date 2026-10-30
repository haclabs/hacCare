-- Link free-entry medications in patient templates to the medication catalog, as
-- 20261030160252 did for simulation templates. Printed labels come from the catalog.
--
-- Matches by medication name (and route, where one name has several catalog forms),
-- only for rows with no catalog_id, only in patient_template tenants. Each matched row
-- takes the catalog entry's barcode. Snapshots are patched in place, not re-saved.

INSERT INTO medications_catalog (barcode, name, generic_name, brand_name, formulation, strength, route, category, display_order, is_active)
VALUES
  ('MZ115', 'Albuterol-Ipratropium', 'Salbutamol / Ipratropium bromide', 'DuoNeb',    'nebule', '2.5 mg/0.5 mg per 3 mL', 'inhalation', 'scheduled', 115, true),
  ('MZ116', 'Azithromycin',          'Azithromycin',                     'Zithromax', 'tablet', '500 mg',                 'oral',       'scheduled', 116, true)
ON CONFLICT (barcode) DO NOTHING;

-- route_key NULL = any route
CREATE TEMP TABLE med_catalog_map (name_key text NOT NULL, route_key text, barcode text NOT NULL) ON COMMIT DROP;
INSERT INTO med_catalog_map (name_key, route_key, barcode) VALUES
  ('amlodipine',                                   NULL,         'MZ110'),
  ('azithromycin',                                 'iv',         'MZ111'),
  ('azithromycin',                                 'po',         'MZ116'),
  ('azithromycin',                                 'oral',       'MZ116'),
  ('budesonide/formoterol (symbicort turbuhaler)', NULL,         'MZ112'),
  ('0.9% sodium chloride',                         NULL,         'MZ043'),
  ('potassium chloride',                           NULL,         'MZ018'),
  ('albuterol-ipratropium (duoneb)',               NULL,         'MZ115');

CREATE FUNCTION pg_temp.catalog_for(p_name text, p_route text) RETURNS medications_catalog
LANGUAGE sql STABLE AS $$
  SELECT c.* FROM med_catalog_map mp JOIN medications_catalog c ON c.barcode = mp.barcode
  WHERE mp.name_key = lower(btrim(p_name))
    AND (mp.route_key IS NULL OR mp.route_key = lower(btrim(p_route)))
  LIMIT 1
$$;

UPDATE patient_medications m
SET catalog_id = (pg_temp.catalog_for(m.name, m.route)).id,
    barcode    = (pg_temp.catalog_for(m.name, m.route)).barcode
FROM tenants t
WHERE t.id = m.tenant_id
  AND t.tenant_type = 'patient_template'
  AND m.catalog_id IS NULL
  AND (pg_temp.catalog_for(m.name, m.route)).id IS NOT NULL;

UPDATE patient_templates pt
SET snapshot_data = jsonb_set(pt.snapshot_data, '{patient_medications}', (
  SELECT jsonb_agg(
           CASE WHEN e->>'catalog_id' IS NULL AND c.id IS NOT NULL
                THEN e || jsonb_build_object('catalog_id', c.id, 'barcode', c.barcode)
                ELSE e END
           ORDER BY ord)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(pt.snapshot_data->'patient_medications') = 'array' THEN pt.snapshot_data->'patient_medications' ELSE '[]'::jsonb END) WITH ORDINALITY x(e, ord)
  LEFT JOIN LATERAL pg_temp.catalog_for(e->>'name', e->>'route') c ON true))
WHERE jsonb_typeof(pt.snapshot_data->'patient_medications') = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(pt.snapshot_data->'patient_medications') = 'array' THEN pt.snapshot_data->'patient_medications' ELSE '[]'::jsonb END) e
    WHERE e->>'catalog_id' IS NULL AND (pg_temp.catalog_for(e->>'name', e->>'route')).id IS NOT NULL);

DO $$
DECLARE v_left int;
BEGIN
  SELECT count(*) INTO v_left
  FROM patient_medications m
  JOIN tenants t ON t.id = m.tenant_id AND t.tenant_type = 'patient_template'
  WHERE m.catalog_id IS NULL;
  IF v_left > 0 THEN
    RAISE EXCEPTION '% patient template medications are still not linked to the catalog', v_left;
  END IF;

  SELECT count(*) INTO v_left
  FROM patient_templates pt, jsonb_array_elements(CASE WHEN jsonb_typeof(pt.snapshot_data->'patient_medications') = 'array' THEN pt.snapshot_data->'patient_medications' ELSE '[]'::jsonb END) e
  WHERE jsonb_typeof(pt.snapshot_data->'patient_medications') = 'array'
    AND e->>'catalog_id' IS NULL;
  IF v_left > 0 THEN
    RAISE EXCEPTION '% patient template snapshot medications are still not linked', v_left;
  END IF;
END $$;
