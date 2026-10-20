-- Optional patient photo, shown instead of the illustrated avatar.
--
-- Stored on the row as a small data URL (the browser crops and re-encodes uploads to a 256x256
-- JPEG, ~15-30 KB) rather than in Storage. Patient rows are copied between tenants by
-- save_template_snapshot_v2 / restore_snapshot_to_tenant (launch, reset, template sync, Patient
-- Library), which copy every column, so the photo travels with the patient without needing
-- cross-tenant Storage policies. It is covered by the existing patients RLS.
--
-- The CHECK keeps the column to raster images of a bounded size; avatar_id is kept as the fallback.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS photo_data text;

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_photo_data_check;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_photo_data_check
  CHECK (
    photo_data IS NULL
    OR (photo_data ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' AND length(photo_data) <= 200000)
  );

COMMENT ON COLUMN public.patients.photo_data IS
  'Optional patient photo as a data:image/(jpeg|png|webp);base64 URL, max 200000 chars. Shown instead of avatar_id when set.';
