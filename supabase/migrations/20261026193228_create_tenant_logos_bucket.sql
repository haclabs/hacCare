-- Storage bucket for institution logos (Tenant Management → tenant settings → logo).
-- fileUploadService.ts uploads to `tenant-logos` but the bucket was never created.
--
-- Reads are public: the logo is rendered via getPublicUrl() wherever the tenant is shown.
-- Writes are super_admin only, matching the tenants UPDATE policy — saving the uploaded
-- URL into tenants.settings is a tenant update, which only super admins can perform.
-- SVG is deliberately excluded: an SVG in a public bucket can carry script.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-logos',
  'tenant-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS tenant_logos_super_admin_insert ON storage.objects;
CREATE POLICY tenant_logos_super_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-logos' AND public.caller_has_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS tenant_logos_super_admin_update ON storage.objects;
CREATE POLICY tenant_logos_super_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'tenant-logos' AND public.caller_has_role(ARRAY['super_admin']))
  WITH CHECK (bucket_id = 'tenant-logos' AND public.caller_has_role(ARRAY['super_admin']));

DROP POLICY IF EXISTS tenant_logos_super_admin_delete ON storage.objects;
CREATE POLICY tenant_logos_super_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-logos' AND public.caller_has_role(ARRAY['super_admin']));
