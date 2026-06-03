-- Migration: Create medications_catalog table + patch patient_medications
-- Date: 2026-05-28
-- Branch: feature/medication-catalog-qr
--
-- Purpose:
--   Introduce a stable medication catalog so physical QR-code labels can be
--   printed once per semester and reused across all simulation resets/relaunches.
--
-- Schema additions:
--   1. medications_catalog     — master list of drugs with stable MZ-series barcodes
--   2. patient_medications.catalog_id  — FK to catalog (nullable; free-entry = NULL)
--   3. patient_medications.barcode     — pre-resolved barcode string (populated from
--                                        catalog on insert, or hash-generated for free-entry)
--
-- Catalog tiers:
--   tenant_id IS NULL  → global entries (MZ001–MZ020); managed by super_admin only
--   tenant_id IS NOT NULL → institution-specific additions; managed by admin/coordinator
--
-- RLS summary:
--   SELECT  — all authenticated users (see everything: global + own-tenant additions)
--   INSERT / UPDATE / DELETE:
--     • super_admin: unrestricted (global + any tenant entry)
--     • admin / coordinator: own-tenant entries only (tenant_id must match current tenant)
--
-- patient_medications changes:
--   • catalog_id (nullable FK)
--   • barcode (nullable TEXT) — stable if catalog-linked, hash-based if free-entry
--
-- Next steps after this migration runs:
--   • Migration 20260528000001 — add qrcode npm dep + swap BarcodeGenerator rendering
--   • Migration 20260528000002 — catalog picker in AddMedicationForm / EditMedicationForm
--   • Migration 20260528000003 — update launch/reset SQL functions to copy catalog_id+barcode

-- ============================================================================
-- 1. medications_catalog table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.medications_catalog (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          REFERENCES public.tenants(id) ON DELETE CASCADE,
                                -- NULL = global; non-null = institution addition
  barcode         TEXT          NOT NULL,
  name            TEXT          NOT NULL,
  generic_name    TEXT,
  formulation     TEXT          NOT NULL, -- e.g. 'tablet', 'capsule', 'IV solution', 'injection'
  strength        TEXT          NOT NULL, -- e.g. '25mg', '10mg/mL', '5000 units/mL'
  route           TEXT          NOT NULL,
  category        TEXT          NOT NULL DEFAULT 'scheduled',
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  display_order   INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by      UUID          REFERENCES auth.users(id),

  CONSTRAINT medications_catalog_barcode_unique UNIQUE (barcode),
  CONSTRAINT medications_catalog_route_check CHECK (route = ANY (ARRAY[
    'oral', 'intravenous', 'intramuscular', 'subcutaneous',
    'topical', 'inhalation', 'rectal', 'sublingual', 'nasal', 'transdermal'
  ])),
  CONSTRAINT medications_catalog_category_check CHECK (category = ANY (ARRAY[
    'scheduled', 'unscheduled', 'prn', 'continuous', 'diabetic', 'stat'
  ]))
);

CREATE INDEX IF NOT EXISTS idx_medications_catalog_tenant_id
  ON public.medications_catalog (tenant_id);

CREATE INDEX IF NOT EXISTS idx_medications_catalog_barcode
  ON public.medications_catalog (barcode);

CREATE INDEX IF NOT EXISTS idx_medications_catalog_name
  ON public.medications_catalog (name);

-- ============================================================================
-- 2. RLS policies for medications_catalog
-- ============================================================================

ALTER TABLE public.medications_catalog ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the full catalog (global + their tenant's additions)
CREATE POLICY catalog_read_all
  ON public.medications_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- super_admin: full write access — global entries (tenant_id IS NULL) AND any tenant entry
CREATE POLICY catalog_super_admin_write
  ON public.medications_catalog
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- admin / coordinator: write access to their own institution entries only
-- (they cannot create or modify global entries where tenant_id IS NULL)
CREATE POLICY catalog_admin_write
  ON public.medications_catalog
  FOR ALL
  TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- ============================================================================
-- 3. Add catalog_id + barcode columns to patient_medications
-- ============================================================================

ALTER TABLE public.patient_medications
  ADD COLUMN IF NOT EXISTS catalog_id UUID REFERENCES public.medications_catalog(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS barcode    TEXT;

CREATE INDEX IF NOT EXISTS idx_patient_medications_catalog_id
  ON public.patient_medications (catalog_id);

CREATE INDEX IF NOT EXISTS idx_patient_medications_barcode
  ON public.patient_medications (barcode);

-- ============================================================================
-- 4. Seed global catalog — 20 core medications (MZ001–MZ020)
--    Only inserted if the catalog is empty (idempotent on re-run)
-- ============================================================================

INSERT INTO public.medications_catalog
  (barcode, name, generic_name, formulation, strength, route, category, display_order)
SELECT barcode, name, generic_name, formulation, strength, route, category, display_order
FROM (VALUES
  ('MZ001', 'Metoprolol Tartrate',    'Metoprolol',         'tablet',      '25 mg',           'oral',          'scheduled',   1),
  ('MZ002', 'Lisinopril',             'Lisinopril',         'tablet',      '10 mg',           'oral',          'scheduled',   2),
  ('MZ003', 'Furosemide',             'Furosemide',         'tablet',      '40 mg',           'oral',          'scheduled',   3),
  ('MZ004', 'Atorvastatin',           'Atorvastatin',       'tablet',      '20 mg',           'oral',          'scheduled',   4),
  ('MZ005', 'Aspirin',                'Acetylsalicylic Acid','tablet',     '81 mg',           'oral',          'scheduled',   5),
  ('MZ006', 'Heparin',                'Heparin Sodium',     'injection',   '5000 units/mL',   'subcutaneous',  'scheduled',   6),
  ('MZ007', 'Morphine Sulfate',       'Morphine',           'IV solution', '2 mg/mL',         'intravenous',   'prn',         7),
  ('MZ008', 'Ondansetron',            'Ondansetron HCl',    'IV solution', '4 mg/2 mL',       'intravenous',   'prn',         8),
  ('MZ009', 'Acetaminophen',          'Acetaminophen',      'tablet',      '500 mg',          'oral',          'prn',         9),
  ('MZ010', 'Metformin',              'Metformin HCl',      'tablet',      '500 mg',          'oral',          'diabetic',   10),
  ('MZ011', 'Regular Insulin',        'Insulin Human',      'injection',   '100 units/mL',    'subcutaneous',  'diabetic',   11),
  ('MZ012', 'Vancomycin',             'Vancomycin HCl',     'IV solution', '500 mg/100 mL',   'intravenous',   'scheduled',  12),
  ('MZ013', 'Pantoprazole',           'Pantoprazole Sodium','tablet',      '40 mg',           'oral',          'scheduled',  13),
  ('MZ014', 'Lorazepam',              'Lorazepam',          'tablet',      '0.5 mg',          'oral',          'prn',        14),
  ('MZ015', 'Amoxicillin',            'Amoxicillin',        'capsule',     '500 mg',          'oral',          'scheduled',  15),
  ('MZ016', 'Dextrose 5% in Water',   NULL,                 'IV solution', '250 mL',          'intravenous',   'continuous', 16),
  ('MZ017', 'Normal Saline 0.9%',     'Sodium Chloride',    'IV solution', '1000 mL',         'intravenous',   'continuous', 17),
  ('MZ018', 'Potassium Chloride',     'Potassium Chloride', 'IV solution', '20 mEq/100 mL',   'intravenous',   'scheduled',  18),
  ('MZ019', 'Warfarin',               'Warfarin Sodium',    'tablet',      '5 mg',            'oral',          'scheduled',  19),
  ('MZ020', 'Hydromorphone',          'Hydromorphone HCl',  'IV solution', '0.2 mg/mL',       'intravenous',   'prn',        20)
) AS t(barcode, name, generic_name, formulation, strength, route, category, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.medications_catalog LIMIT 1);

-- ============================================================================
-- 5. Comments
-- ============================================================================

COMMENT ON TABLE public.medications_catalog IS
  'Master medication catalog. tenant_id IS NULL = global starter pack (super_admin managed). '
  'tenant_id non-null = institution-specific additions (admin/coordinator managed). '
  'Barcodes are MZ-series (MZ001–MZ020 global, MZ021+ institution additions). '
  'patient_medications.catalog_id links to this table; barcode is copied on insert '
  'and preserved through simulation launch/reset so physical QR labels are reusable.';

COMMENT ON COLUMN public.medications_catalog.tenant_id IS
  'NULL = global entry managed only by super_admin. Non-null = institution addition.';

COMMENT ON COLUMN public.medications_catalog.barcode IS
  'Stable QR barcode string printed on physical medication labels (e.g. MZ003). '
  'Must be globally unique. MZ001–MZ020 reserved for global pack.';

COMMENT ON COLUMN public.patient_medications.catalog_id IS
  'FK to medications_catalog. NULL for free-entry medications.';

COMMENT ON COLUMN public.patient_medications.barcode IS
  'Pre-resolved barcode string. Populated from catalog.barcode for catalog entries, '
  'or hash-generated (M{initial}{5digits}) for free-entry medications. '
  'Copied through simulation launch and reset so physical labels remain valid.';
