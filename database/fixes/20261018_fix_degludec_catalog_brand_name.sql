-- Applied to hacCare Canada (ydmbinljlpzcbleupjaa) on 2026-10-18.
-- Brand name had been entered in generic_name, so catalog labels printed "Insulin Degludec" without "(Tresiba)".
UPDATE medications_catalog
SET name = 'Insulin Degludec (Tresiba)', generic_name = 'Insulin Degludec'
WHERE id = '4019532f-fd41-4583-ad07-f8f8bf246be9'
  AND name = 'Insulin Degludec'
  AND generic_name = '(Tresiba)';
