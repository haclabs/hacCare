-- Store a medication's brand in its own column instead of "Generic (Brand)" in the name.
--
-- 20261019000001 standardised catalog names to "Insulin Aspart (NovoRapid)" so labels could print
-- the brand on a second line, but that relied on instructors typing the brackets correctly. The
-- catalog admin form now has a separate optional Brand Name field.
--
-- Patient medications still receive the combined "Name (Brand)" when picked from the catalog
-- (catalogDisplayName in src/services/clinical/medicationService.ts), so the MAR, BCMA and label
-- templates are unchanged.
--
-- Data: splits a trailing "(…)" off the name into brand_name. On 2026-10-19 every catalog name
-- ending in brackets was a brand (19 entries). Re-runnable: a name is only split when brand_name
-- is empty or already equals the bracketed text (which also cleans up if 20261019000001 is
-- re-run after this migration and re-adds the brackets).

ALTER TABLE public.medications_catalog ADD COLUMN IF NOT EXISTS brand_name TEXT;

COMMENT ON COLUMN public.medications_catalog.brand_name IS
  'Optional brand, e.g. NovoRapid. Patient medications and labels show "name (brand_name)"; labels print the brand on its own line.';

UPDATE public.medications_catalog
  SET brand_name = substring(name from '\(([^()]+)\)$'),
      name       = btrim(substring(name from '^(.*[^ ]) *\([^()]+\)$'))
  WHERE name ~ '^.*[^ ] *\([^()]+\)$'
    AND (brand_name IS NULL OR brand_name = substring(name from '\(([^()]+)\)$'));
