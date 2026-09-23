-- Migration: Fix ambiguous "tenant_id" column reference in auto_set_tenant_id()
-- Date: 2026-08-18
--
-- Bug: auto_set_tenant_id() is a BEFORE INSERT trigger attached to patients,
-- patient_vitals, patient_notes, patient_advanced_directives, patient_alerts,
-- patient_medications, medication_administrations, patient_admission_records,
-- bowel_records, diabetic_records, devices, wounds, avatar_locations, and
-- lab_orders. Its fallback lookup used a bare "tenant_id" column reference:
--
--   SELECT tenant_id INTO NEW.tenant_id FROM tenant_users WHERE ...
--
-- Because NEW is a row of a table that itself has a tenant_id column, the
-- bare "tenant_id" is ambiguous between NEW's own field and tenant_users.tenant_id
-- (Postgres error 42702, detail: "It could refer to either a PL/pgSQL variable
-- or a table column."). This only fires when an INSERT into one of these
-- tables omits tenant_id explicitly (the IF NEW.tenant_id IS NOT NULL guard
-- skips it otherwise) — e.g. during launch_simulation's restore of records
-- whose snapshot payload happens to omit tenant_id, surfacing as a 400 from
-- the launch_simulation RPC.
--
-- Fix: qualify the source column with a table alias.

CREATE OR REPLACE FUNCTION public.auto_set_tenant_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If tenant_id is already set (e.g., from RPC function), don't override it
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Otherwise, try to get it from tenant_users (avoid user_profiles for now due to cache)
  SELECT tu.tenant_id INTO NEW.tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
  AND tu.is_active = true
  LIMIT 1;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_set_tenant_id() IS
  'BEFORE INSERT trigger — auto-populates tenant_id from the current user''s active tenant_users row when not explicitly provided. Fixed 2026-08-18: qualified bare tenant_id reference that was ambiguous against NEW''s own tenant_id column (42702).';
