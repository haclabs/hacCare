-- Migration: Create kb_walkthroughs table for embedded Scribe walkthroughs
-- Date: 2026-08-31
--
-- Global (non-tenant-scoped) Knowledge Base content: super_admin-managed list
-- of embedded Scribe (scribehow.com) walkthrough links shown in the
-- Documentation / Knowledge Base tab. Everyone authenticated can read active
-- entries; only super_admin can create/update/delete.

CREATE TABLE IF NOT EXISTS public.kb_walkthroughs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scribe_url text NOT NULL,
  category text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_walkthroughs_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT kb_walkthroughs_url_not_empty CHECK (btrim(scribe_url) <> '')
);

CREATE INDEX IF NOT EXISTS idx_kb_walkthroughs_active_order
  ON public.kb_walkthroughs (is_active, display_order);

ALTER TABLE public.kb_walkthroughs ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active walkthroughs
CREATE POLICY kb_walkthroughs_select ON public.kb_walkthroughs
  FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));

-- Only super_admin can create, update, or delete
CREATE POLICY kb_walkthroughs_insert ON public.kb_walkthroughs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));

CREATE POLICY kb_walkthroughs_update ON public.kb_walkthroughs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));

CREATE POLICY kb_walkthroughs_delete ON public.kb_walkthroughs
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));

-- Reuses the existing generic updated_at trigger function
CREATE TRIGGER update_kb_walkthroughs_updated_at
  BEFORE UPDATE ON public.kb_walkthroughs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
