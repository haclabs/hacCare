-- ============================================================================
-- AUTO-GENERATED SIMULATION-ONLY STUDENT LOGINS
-- ============================================================================
-- Tracks throwaway "simulation-only" student accounts created via the
-- "auto-generate student" checkbox on Launch Simulation. Each account is
-- tied 1:1 to the simulation_active row it was created for, persists through
-- pause/resume/reset/complete, and is only removed (account + row) when the
-- owning active simulation is deleted — see delete_simulation() below.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.simulation_auto_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES public.simulation_active(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  student_number TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Plaintext initial password so an instructor can hand it to a student at a
  -- shared workstation. Accepted tradeoff: these are disposable, no-PII,
  -- simulation-scoped accounts (no access outside this simulation's tenant),
  -- the row is locked down by RLS to users with access to that tenant, and
  -- the account + row are hard-deleted together when the simulation is
  -- deleted. Do not reuse this pattern for real user accounts.
  temp_password TEXT NOT NULL,
  label TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_auto_students_simulation_id
  ON public.simulation_auto_students(simulation_id);

ALTER TABLE public.simulation_auto_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS simulation_auto_students_select ON public.simulation_auto_students;
CREATE POLICY simulation_auto_students_select
  ON public.simulation_auto_students
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.simulation_active sa
      JOIN public.tenant_users tu ON tu.tenant_id = sa.tenant_id
      WHERE sa.id = simulation_auto_students.simulation_id
        AND tu.user_id = auth.uid()
        AND tu.is_active = true
    )
  );

DROP POLICY IF EXISTS simulation_auto_students_insert ON public.simulation_auto_students;
CREATE POLICY simulation_auto_students_insert
  ON public.simulation_auto_students
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

GRANT SELECT, INSERT ON public.simulation_auto_students TO authenticated;

COMMENT ON TABLE public.simulation_auto_students IS
'Auto-generated simulation-only student logins created from Launch Simulation. Row (and the underlying auth.users account) is only removed when the owning simulation_active row is deleted, via delete_simulation().';

-- ============================================================================
-- REDEPLOY delete_simulation() — also removes auto-generated student accounts
-- ============================================================================
-- ⚠️ The live database runs its own compiled copy of this function — editing
-- database/functions/delete_simulation.sql locally does NOT update it.
-- This CREATE OR REPLACE is what actually ships the change.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_simulation(
  p_simulation_id uuid,
  p_archive_to_history boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_simulation_tenant_id uuid;
  v_simulation_name text;
  v_template_id uuid;
  v_deleted_patients integer := 0;
  v_deleted_medications integer := 0;
  v_child_tenant_id uuid;
  v_deleted_auto_students integer := 0;
BEGIN
  -- Get simulation details before deletion
  SELECT tenant_id, name, template_id
  INTO v_simulation_tenant_id, v_simulation_name, v_template_id
  FROM simulation_active
  WHERE id = p_simulation_id;

  IF v_simulation_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- Delete auto-generated student accounts tied to this simulation FIRST
  -- (before anything cascades simulation_auto_students away). Deleting
  -- auth.users cascades to user_profiles, tenant_users, student_roster,
  -- and simulation_participants for that account automatically.
  WITH deleted_users AS (
    DELETE FROM auth.users
    WHERE id IN (
      SELECT user_id FROM simulation_auto_students WHERE simulation_id = p_simulation_id
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_auto_students FROM deleted_users;

  -- Archive to history if requested (only if simulation actually started)
  IF p_archive_to_history THEN
    -- Check if simulation has started (starts_at is not null)
    IF EXISTS (
      SELECT 1 FROM simulation_active 
      WHERE id = p_simulation_id AND starts_at IS NOT NULL
    ) THEN
      -- Check if not already archived
      IF NOT EXISTS (SELECT 1 FROM simulation_history WHERE simulation_id = p_simulation_id) THEN
        INSERT INTO simulation_history (
          id, simulation_id, tenant_id, template_id, name, duration_minutes,
          started_at, ended_at, created_by, completed_at, status,
          primary_categories, sub_categories
        )
        SELECT 
          gen_random_uuid(), -- New history record ID
          id,                -- simulation_id reference
          tenant_id, 
          template_id, 
          name, 
          duration_minutes,
          COALESCE(starts_at, NOW()), -- Use starts_at or NOW() as fallback
          ends_at,           -- Can be NULL
          created_by, 
          NOW(),             -- completed_at
          status,
          primary_categories, 
          sub_categories
        FROM simulation_active
        WHERE id = p_simulation_id;
      END IF;
    ELSE
      RAISE NOTICE 'Simulation % has not started yet (starts_at is NULL) - skipping history archive', p_simulation_id;
    END IF;
  END IF;

  -- Count what we're about to delete
  SELECT COUNT(*) INTO v_deleted_patients
  FROM patients WHERE tenant_id = v_simulation_tenant_id;

  SELECT COUNT(*) INTO v_deleted_medications
  FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;

  -- Delete all tenant-related data to avoid foreign key conflicts
  -- Order matters: delete children before parents
  -- Use PERFORM with EXCEPTION handling to skip tables that don't exist
  
  BEGIN
    DELETE FROM patient_alerts WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
  END;
  
  BEGIN
    DELETE FROM patient_notes WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_vitals WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM wound_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM device_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_images WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM medication_administrations WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  -- Delete patients last (they're referenced by other tables)
  DELETE FROM patients WHERE tenant_id = v_simulation_tenant_id;
  
  -- Delete simulation participants
  DELETE FROM simulation_participants WHERE simulation_id = p_simulation_id;
  
  -- Delete tenant users
  DELETE FROM tenant_users WHERE tenant_id = v_simulation_tenant_id;

  -- ⚠️ Delete any child tenants BEFORE deleting the parent simulation tenant
  -- This prevents foreign key violations on parent_tenant_id
  FOR v_child_tenant_id IN 
    SELECT id FROM tenants WHERE parent_tenant_id = v_simulation_tenant_id
  LOOP
    RAISE NOTICE 'Deleting child tenant data for: %', v_child_tenant_id;
    
    -- Delete ALL data from child tenant first (same order as parent)
    BEGIN DELETE FROM patient_alerts WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_notes WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_vitals WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_medications WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_assessments WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM device_assessments WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_images WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM medication_administrations WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_results WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_panels WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_orders WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM doctors_orders WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_bbit_entries WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM bowel_records WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wounds WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM devices WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM avatar_locations WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- Delete patients from child tenant
    DELETE FROM patients WHERE tenant_id = v_child_tenant_id;
    
    -- Delete child tenant users
    DELETE FROM tenant_users WHERE tenant_id = v_child_tenant_id;
    
    -- Delete the child tenant
    DELETE FROM tenants WHERE id = v_child_tenant_id;
  END LOOP;

  -- Now safe to delete the simulation tenant
  DELETE FROM tenants WHERE id = v_simulation_tenant_id;

  -- Delete the simulation_active record
  DELETE FROM simulation_active WHERE id = p_simulation_id;

  RAISE NOTICE 'Deleted simulation % (%) with tenant % - removed % patients, % medications, % auto-generated student account(s)',
    p_simulation_id, v_simulation_name, v_simulation_tenant_id,
    v_deleted_patients, v_deleted_medications, v_deleted_auto_students;

  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'simulation_name', v_simulation_name,
    'tenant_id', v_simulation_tenant_id,
    'archived', p_archive_to_history,
    'deleted_patients', v_deleted_patients,
    'deleted_medications', v_deleted_medications,
    'deleted_auto_students', v_deleted_auto_students
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_simulation TO authenticated;

COMMENT ON FUNCTION public.delete_simulation IS 
'Deletes an active simulation and its associated tenant. 
Also deletes any auto-generated simulation-only student accounts tied to it (simulation_auto_students).
Handles child tenants (program tenants) before deleting parent.
Optionally archives to simulation_history before deletion.
Uses SECURITY DEFINER to bypass RLS for complete cleanup.';
