-- Migration: Bulk-add medications to the global medications_catalog
-- Date: 2026-09-13
--
-- Adds ~59 new catalog entries requested for the simulation program (NICU/med-surg
-- style formulary additions: antibiotics, insulins, opioids, antiemetics, etc).
--
-- Notes on decisions made while authoring this migration:
--   * Barcodes continue the MZ### sequence from the live catalog's current max
--     (MZ046 at authoring time) -> new entries are MZ047-MZ105. Uses ON CONFLICT
--     DO NOTHING on the barcode unique constraint so re-running this migration
--     (or running it after barcodes shifted) is a safe no-op instead of an error.
--   * Skipped rows that exactly duplicate an existing catalog entry (same name/
--     strength/route already present): Furosemide 40mg PO, Metoprolol 50mg PO,
--     Metoprolol 25mg PO, Metformin 500mg PO, Dextrose 5% in Water IV,
--     Acetylsalicylic Acid 81mg PO (already cataloged as "Aspirin"),
--     Dimenhydrinate 50mg/mL IM, Ondansetron 4mg/2mL IV.
--   * "hydromorphone 2mg/mL SC or IV" and "ondansetron 4mg/2mL SC or IV" were
--     split into one row per route (a single route CHECK constraint can't hold both).
--   * Brand names supplied in parentheses (Tresiba, Trurapi Solostar, Ademelog,
--     Tramacet) are kept in the `name` column alongside the generic name, per
--     request; `generic_name` holds the generic-only form for search.
--   * Lorazepam 0.5mg/1mg were listed as route "SC" + formulation "tablet" (not
--     clinically valid combination) -- confirmed with requester as sublingual (SL).
--   * "glycoside 30mg PO tablet" was confirmed with requester to mean Digitoxin.
--   * category is a best-effort clinical default (scheduled/prn/diabetic/etc) per
--     the existing CHECK constraint -- editable afterward via the Medication
--     Catalog admin screen if any of these guesses don't match the real MAR order.

INSERT INTO public.medications_catalog
  (barcode, name, generic_name, formulation, strength, route, category, display_order)
VALUES
  ('MZ047', 'Ampicillin',                                  'Ampicillin',                       'IV solution',                       '55 mg',            'intravenous',   'scheduled',  47),
  ('MZ048', 'Vitamin D',                                    'Cholecalciferol',                  'liquid',                            '400 IU',           'oral',          'scheduled',  48),
  ('MZ049', 'Normal Saline Drops',                          'Sodium Chloride 0.9%',             'nasal drops',                       'drops',            'nasal',         'prn',        49),
  ('MZ050', 'Breast Milk',                                  NULL,                               'bottle',                            'mL',               'oral',          'scheduled',  50),
  ('MZ051', 'Formula',                                      NULL,                               'bottle',                            'mL',               'oral',          'scheduled',  51),
  ('MZ052', 'Ceftriaxone',                                  'Ceftriaxone Sodium',               'IV solution',                       '221 mg',           'intravenous',   'scheduled',  52),
  ('MZ053', 'Vitamin K',                                    'Phytonadione',                     'injection',                         '1 mg',             'intramuscular', 'unscheduled',53),
  ('MZ054', 'Prenatal Vitamin',                              NULL,                               'tablet',                            '1 tablet',         'oral',          'scheduled',  54),
  ('MZ055', 'Polyethylene Glycol',                          'PEG 3350',                          'powder',                            '17 g',             'oral',          'prn',        55),
  ('MZ056', 'Tinzaparin',                                    'Tinzaparin Sodium',                'injection',                         '20,000 units/mL',  'subcutaneous',  'scheduled',  56),
  ('MZ057', 'Acetaminophen',                                'Acetaminophen',                    'liquid',                            '10 mg/kg',         'oral',          'prn',        57),
  ('MZ058', 'Acetaminophen',                                'Acetaminophen',                    'tablet',                            '325 mg',           'oral',          'prn',        58),
  ('MZ059', 'Diclofenac',                                   'Diclofenac Sodium',                'tablet',                            '50 mg',            'oral',          'prn',        59),
  ('MZ060', 'Hydromorphone',                                'Hydromorphone HCl',                'tablet',                            '1 mg',             'oral',          'prn',        60),
  ('MZ061', 'Hydromorphone',                                'Hydromorphone HCl',                'tablet',                            '2 mg',             'oral',          'prn',        61),
  ('MZ062', 'Hydromorphone',                                'Hydromorphone HCl',                'injection',                         '2 mg/mL',          'subcutaneous',  'prn',        62),
  ('MZ063', 'Hydromorphone',                                'Hydromorphone HCl',                'IV solution',                       '2 mg/mL',          'intravenous',   'prn',        63),
  ('MZ064', 'Ondansetron',                                  'Ondansetron HCl',                  'tablet',                            '4 mg',             'oral',          'prn',        64),
  ('MZ065', 'Ondansetron',                                  'Ondansetron HCl',                  'injection',                         '4 mg/2 mL',        'subcutaneous',  'prn',        65),
  ('MZ066', 'Iron Sucrose',                                 'Iron Sucrose',                     'pre-mixed mini-bag 250 mL',        '300 mg',           'intravenous',   'scheduled',  66),
  ('MZ067', 'Oxytocin',                                     'Oxytocin',                          'IV solution',                       '10 units/mL',      'intravenous',   'continuous', 67),
  ('MZ068', 'Ringers Lactate',                               'Lactated Ringer''s Solution',       'IV solution',                       '1000 mL',          'intravenous',   'continuous', 68),
  ('MZ069', 'Atorvastatin',                                 'Atorvastatin Calcium',             'tablet',                            '40 mg',            'oral',          'scheduled',  69),
  ('MZ070', 'Calcium Carbonate',                            'Calcium Carbonate',                 'tablet',                            '500 mg',           'oral',          'scheduled',  70),
  ('MZ071', 'Diltiazem',                                    'Diltiazem HCl',                     'tablet',                            '120 mg',           'oral',          'scheduled',  71),
  ('MZ072', 'Digitoxin',                                    'Digitoxin',                         'tablet',                            '30 mg',            'oral',          'scheduled',  72),
  ('MZ073', 'Heparin',                                      'Heparin Sodium',                    'injection',                         '10,000 units/mL',  'subcutaneous',  'scheduled',  73),
  ('MZ074', 'Insulin Degludec (Tresiba)',                   'Insulin Degludec',                  'insulin pen',                       'units',            'subcutaneous',  'diabetic',   74),
  ('MZ075', 'Insulin Aspart (Trurapi Solostar)',            'Insulin Aspart',                    'insulin pen',                       'units',            'subcutaneous',  'diabetic',   75),
  ('MZ076', 'Multivitamin, Renal',                           NULL,                               'tablet',                            '1 tablet',         'oral',          'scheduled',  76),
  ('MZ077', 'Multivitamin',                                  NULL,                               'tablet',                            '1 tablet',         'oral',          'scheduled',  77),
  ('MZ078', 'Sertraline',                                   'Sertraline HCl',                    'capsule',                           '50 mg',            'oral',          'scheduled',  78),
  ('MZ079', 'Sennoside',                                    'Sennosides',                        'tablet',                            '8.6 mg',           'oral',          'prn',        79),
  ('MZ080', 'Nicotine',                                     'Nicotine',                          'patch',                             '14 mg',            'transdermal',   'scheduled',  80),
  ('MZ081', 'Dimenhydrinate',                                'Dimenhydrinate',                    'IV solution',                       '50 mg/mL',         'intravenous',   'prn',        81),
  ('MZ082', 'Dimenhydrinate',                                'Dimenhydrinate',                    'tablet',                            '50 mg',            'oral',          'prn',        82),
  ('MZ083', 'Lactulose',                                    'Lactulose',                         'liquid',                            '15 mL',            'oral',          'prn',        83),
  ('MZ084', 'Acetaminophen',                                'Acetaminophen',                    'tablet',                            '500 mg',           'oral',          'prn',        84),
  ('MZ085', 'Hydromorphone SR',                             'Hydromorphone HCl (extended-release)','capsule',                        '6 mg',             'oral',          'scheduled',  85),
  ('MZ086', 'Cefazolin',                                    'Cefazolin Sodium',                  'vial or pre-mixed mini-bag 100 mL','2 g',              'intravenous',   'scheduled',  86),
  ('MZ087', 'Furosemide',                                   'Furosemide',                        'IV solution',                       '10 mg/mL',         'intravenous',   'scheduled',  87),
  ('MZ088', 'Ceftriaxone',                                  'Ceftriaxone Sodium',               'vial or pre-mixed mini-bag 100 mL','1 g',              'intravenous',   'scheduled',  88),
  ('MZ089', 'Insulin Lispro (Ademelog)',                    'Insulin Lispro',                    'insulin pen',                       'units',            'subcutaneous',  'diabetic',   89),
  ('MZ090', 'Digoxin',                                      'Digoxin',                           'tablet',                            '0.25 mg',          'oral',          'scheduled',  90),
  ('MZ091', 'Furosemide',                                   'Furosemide',                        'tablet',                            '20 mg',            'oral',          'scheduled',  91),
  ('MZ092', 'Perindopril',                                  'Perindopril Erbumine',              'tablet',                            '8 mg',             'oral',          'scheduled',  92),
  ('MZ093', 'Rivaroxaban',                                  'Rivaroxaban',                       'tablet',                            '10 mg',            'oral',          'scheduled',  93),
  ('MZ094', 'Vitamin D',                                    'Cholecalciferol',                  'tablet',                            '1000 IU',          'oral',          'scheduled',  94),
  ('MZ095', 'Hydromorphone SR',                             'Hydromorphone HCl (extended-release)','capsule',                        '3 mg',             'oral',          'scheduled',  95),
  ('MZ096', 'Tramadol/Acetaminophen (Tramacet)',            'Tramadol HCl / Acetaminophen',     'tablet',                            '37.5/325 mg',      'oral',          'prn',        96),
  ('MZ097', 'Morphine',                                     'Morphine Sulfate',                  'injection',                         '10 mg/mL',         'subcutaneous',  'prn',        97),
  ('MZ098', 'Quetiapine',                                   'Quetiapine Fumarate',               'tablet',                            '25 mg',            'oral',          'scheduled',  98),
  ('MZ099', 'Salbutamol',                                   'Salbutamol Sulfate (Albuterol)',   'inhaler',                           '100 mcg',          'inhalation',    'prn',        99),
  ('MZ100', 'Haloperidol',                                  'Haloperidol',                       'injection',                         '5 mg/mL',          'subcutaneous',  'prn',        100),
  ('MZ101', 'Glycopyrrolate',                                'Glycopyrrolate',                    'injection',                         '0.2 mg/mL',        'subcutaneous',  'prn',        101),
  ('MZ102', 'Lorazepam',                                    'Lorazepam',                         'tablet',                            '0.5 mg',           'sublingual',    'prn',        102),
  ('MZ103', 'Lorazepam',                                    'Lorazepam',                         'tablet',                            '1 mg',             'sublingual',    'prn',        103),
  ('MZ104', 'Midazolam',                                    'Midazolam HCl',                     'injection',                         '5 mg/mL',          'subcutaneous',  'prn',        104),
  ('MZ105', 'Lorazepam',                                    'Lorazepam',                         'injection',                         '4 mg/mL',          'subcutaneous',  'prn',        105)
ON CONFLICT ON CONSTRAINT medications_catalog_barcode_unique DO NOTHING;
