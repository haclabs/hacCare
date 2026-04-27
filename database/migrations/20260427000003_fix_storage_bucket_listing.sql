-- ============================================================================
-- FIX: Public Bucket Allows Listing (Supabase Security Advisor lint 0025)
-- ============================================================================
-- Three public buckets have broad SELECT policies on storage.objects that
-- allow any authenticated/anon user to enumerate (list) all files:
--   - patient-images  ("Authenticated users can view patient images")
--   - wound-photos    ("Authenticated users can view wound photos")
--   - tenant-logos    ("Allow public read access to tenant logos")
--
-- Root cause:
--   A SELECT policy on storage.objects enables both object URL access AND
--   file listing (GET /storage/v1/object/list/<bucket>). These policies are
--   broader than needed — listing all files leaks filenames/paths.
--
-- Fix:
--   Drop the broad SELECT policies. For PUBLIC buckets, getPublicUrl() and
--   direct object URL access are served by the Supabase CDN and do NOT require
--   a storage.objects SELECT policy. Removing the policy stops listing while
--   leaving all public URL access intact.
--
--   patient-images and wound-photos are legacy buckets no longer actively used
--   (new uploads use the patient_images database table + URLs). Their policies
--   are dropped but the buckets are left in place (no data destruction).
--
--   tenant-logos is actively used for org logo uploads (fileUploadService.ts).
--   Its getPublicUrl() calls work without this policy since the bucket is public.
-- ============================================================================

-- Drop broad SELECT policy: patient-images bucket
DROP POLICY IF EXISTS "Authenticated users can view patient images"
  ON storage.objects;

-- Drop broad SELECT policy: wound-photos bucket
DROP POLICY IF EXISTS "Authenticated users can view wound photos"
  ON storage.objects;

-- Drop broad SELECT policy: tenant-logos bucket
-- getPublicUrl() in fileUploadService.ts continues to work — CDN serves
-- public bucket objects without requiring a storage.objects SELECT policy.
DROP POLICY IF EXISTS "Allow public read access to tenant logos"
  ON storage.objects;

-- ============================================================================
-- NOTE: contact_submissions "Anyone can submit contact form" (lint 0024)
-- ============================================================================
-- This INSERT policy with WITH CHECK (true) is INTENTIONAL.
-- It is a public-facing contact form that must accept unauthenticated
-- submissions. Documented as accepted in migrations:
--   20260415000001_fix_rls_policy_always_true.sql
--   20260416000000_fix_rls_policy_always_true_remaining.sql
-- No change needed here.

-- ============================================================================
-- NOTE: user_tenant_cache (lint 0016)
-- ============================================================================
-- SELECT was already revoked by migration:
--   20260415000002_fix_materialized_view_api_exposure.sql
-- Lines: REVOKE SELECT ON public.user_tenant_cache FROM authenticated;
--        REVOKE SELECT ON public.user_tenant_cache FROM anon;
-- If the warning still shows, trigger a Security Advisor re-scan in dashboard.

-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- Confirm no broad listing policies remain on these buckets:
--   SELECT policyname, bucket_id, definition
--   FROM storage.policies
--   WHERE bucket_id IN ('patient-images', 'wound-photos', 'tenant-logos');
-- Expected: 0 rows (or only INSERT/UPDATE policies if any were created)
--
-- Confirm tenant logo public URLs still work by fetching a logo URL in the app.
