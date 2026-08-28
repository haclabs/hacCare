-- One-time data fix: restore catalog_id/barcode on patient_medications rows that
-- were silently unlinked from the catalog by a frontend bug.
--
-- Root cause: fetchPatientMedications() dropped catalog_id/barcode when mapping
-- DB rows back into the app's Medication objects. Any catalog-linked medication
-- that was then opened in "Edit Medication" and saved (even with no changes)
-- had EditMedicationForm generate a brand-new random barcode and null out
-- catalog_id, overwriting the correct values in the database.
--
-- This script is READ-ONLY until you explicitly run the UPDATE at the bottom.
-- Run the SELECT first and review the results before running the UPDATE.

-- ============================================================================
-- STEP 0 (read-only, run first): sanity-check counts before the strict query
-- below. If STEP 1 returns zero rows, run these to see why — either there's
-- genuinely nothing to fix (no medication was ever Edit+Saved while the bug
-- was live, so the DB was never touched), or the strict match conditions in
-- STEP 1 are too narrow for your data.
-- ============================================================================

-- 0a. How many template medications are currently catalog-linked vs not, at all?
SELECT
  t.tenant_type,
  count(*) FILTER (WHERE pm.catalog_id IS NOT NULL) AS linked,
  count(*) FILTER (WHERE pm.catalog_id IS NULL)     AS unlinked,
  count(*)                                          AS total
FROM patient_medications pm
JOIN tenants t ON t.id = pm.tenant_id
WHERE t.tenant_type IN ('simulation_template', 'simulation_active', 'production')
GROUP BY t.tenant_type;

-- 0b. Of the unlinked ones, how many barcodes actually match the free-entry
-- generator pattern (M + letter + 5 digits)? Loosen the regex anchors in case
-- of stray whitespace.
SELECT
  pm.id, pm.tenant_id, t.tenant_type, pm.name, pm.barcode, pm.catalog_id
FROM patient_medications pm
JOIN tenants t ON t.id = pm.tenant_id
WHERE pm.catalog_id IS NULL
ORDER BY t.tenant_type, pm.name;

-- 0c. For any unlinked row above, does a catalog entry with the same name
-- exist at all (regardless of is_active / exact-match-count restrictions)?
SELECT
  pm.id, pm.name AS pm_name, pm.barcode, pm.tenant_id,
  mc.id AS mc_id, mc.name AS mc_name, mc.barcode AS mc_barcode, mc.is_active, mc.tenant_id AS mc_tenant_id
FROM patient_medications pm
LEFT JOIN medications_catalog mc ON lower(trim(mc.name)) = lower(trim(pm.name))
WHERE pm.catalog_id IS NULL
ORDER BY pm.name;

-- ============================================================================
-- STEP 1 (read-only): find likely-corrupted rows
-- Broadened after live data review (Aug 28, 2026): most unlinked template
-- medications have barcode = NULL outright (legacy rows created before the
-- catalog feature existed), not the edit-form hash pattern originally assumed
-- — so no longer requiring a barcode-format match, just an unambiguous name
-- match against an ACTIVE catalog entry. Also switched the patients join to
-- LEFT JOIN so a row isn't silently hidden if its patient lookup doesn't
-- resolve for any reason.
-- A row is a candidate if:
--   - catalog_id IS NULL (currently unlinked)
--   - its name exactly matches exactly ONE active catalog entry visible to its
--     tenant (global entry, or an institution-specific entry for that tenant)
-- ============================================================================
SELECT
  pm.id            AS medication_id,
  pm.tenant_id,
  t.tenant_type,
  p.first_name,
  p.last_name,
  pm.name          AS med_name,
  pm.dosage,
  pm.route,
  pm.barcode       AS current_barcode,
  mc.id            AS matched_catalog_id,
  mc.barcode       AS catalog_barcode
FROM patient_medications pm
JOIN tenants t ON t.id = pm.tenant_id
LEFT JOIN patients p ON p.id = pm.patient_id
JOIN medications_catalog mc
  ON lower(mc.name) = lower(pm.name)
 AND mc.is_active = true
 AND (mc.tenant_id IS NULL OR mc.tenant_id = pm.tenant_id)
WHERE pm.catalog_id IS NULL
  -- only exactly one catalog match by name, to avoid ambiguous rewrites
  AND (
    SELECT count(*) FROM medications_catalog mc2
    WHERE lower(mc2.name) = lower(pm.name)
      AND mc2.is_active = true
      AND (mc2.tenant_id IS NULL OR mc2.tenant_id = pm.tenant_id)
  ) = 1
ORDER BY t.tenant_type, p.last_name, pm.name;

-- ============================================================================
-- STEP 2 (destructive — review STEP 1 output first): restore the link
-- Uncomment and run once you've confirmed the candidate list above looks right.
-- ============================================================================
-- BEGIN;
--
-- UPDATE patient_medications pm
-- SET catalog_id = mc.id,
--     barcode = mc.barcode
-- FROM medications_catalog mc
-- WHERE lower(mc.name) = lower(pm.name)
--   AND mc.is_active = true
--   AND (mc.tenant_id IS NULL OR mc.tenant_id = pm.tenant_id)
--   AND pm.catalog_id IS NULL
--   AND (
--     SELECT count(*) FROM medications_catalog mc2
--     WHERE lower(mc2.name) = lower(pm.name)
--       AND mc2.is_active = true
--       AND (mc2.tenant_id IS NULL OR mc2.tenant_id = pm.tenant_id)
--   ) = 1;
--
-- COMMIT;

-- ============================================================================
-- STEP 3 (read-only, run after STEP 2): verify every catalog-linked row's
-- barcode now matches its catalog entry's barcode exactly.
-- Should return zero rows — any row returned means barcode drifted from
-- catalog and needs a look.
-- ============================================================================
-- SELECT pm.id, pm.name, pm.barcode AS pm_barcode, mc.barcode AS catalog_barcode
-- FROM patient_medications pm
-- JOIN medications_catalog mc ON mc.id = pm.catalog_id
-- WHERE pm.barcode IS DISTINCT FROM mc.barcode;
