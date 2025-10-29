-- ===========================================================================
-- SIMULATION SYSTEM V2.0 - ROW LEVEL SECURITY POLICIES
-- ===========================================================================
-- Purpose: Secure access control for simulation system
-- Run after: 002_create_new_simulation_schema.sql
-- ===========================================================================

-- ============================================================================
-- STEP 1: ENABLE RLS ON ALL SIMULATION TABLES
-- ============================================================================

ALTER TABLE simulation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_active ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: SIMULATION TEMPLATES POLICIES
-- ============================================================================

-- View templates: Admins and Super Admins only
CREATE POLICY "templates_select_policy" ON simulation_templates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Create templates: Admins and Super Admins only
CREATE POLICY "templates_insert_policy" ON simulation_templates
FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Update templates: Creator, Admins, or Super Admins
CREATE POLICY "templates_update_policy" ON simulation_templates
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (
      user_profiles.role IN ('admin', 'super_admin')
      OR (user_profiles.role = 'admin' AND simulation_templates.created_by = auth.uid())
    )
  )
);

-- Delete templates: Creator, Admins, or Super Admins
CREATE POLICY "templates_delete_policy" ON simulation_templates
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (
      user_profiles.role IN ('admin', 'super_admin')
      OR (user_profiles.role = 'admin' AND simulation_templates.created_by = auth.uid())
    )
  )
);

-- ============================================================================
-- STEP 3: ACTIVE SIMULATIONS POLICIES
-- ============================================================================

-- View active simulations: Admins, Super Admins, and assigned participants
CREATE POLICY "active_select_policy" ON simulation_active
FOR SELECT USING (
  -- Admins and Super Admins can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
  OR
  -- Participants can see their assigned simulations
  EXISTS (
    SELECT 1 FROM simulation_participants
    WHERE simulation_participants.simulation_id = simulation_active.id
    AND simulation_participants.user_id = auth.uid()
  )
);

-- Create simulations: Admins and Super Admins only
CREATE POLICY "active_insert_policy" ON simulation_active
FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Update simulations: Admins, Super Admins, or instructors
CREATE POLICY "active_update_policy" ON simulation_active
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
  OR
  -- Instructors can update their assigned simulations
  EXISTS (
    SELECT 1 FROM simulation_participants
    WHERE simulation_participants.simulation_id = simulation_active.id
    AND simulation_participants.user_id = auth.uid()
    AND simulation_participants.role = 'instructor'
  )
);

-- Delete simulations: Admins and Super Admins only
CREATE POLICY "active_delete_policy" ON simulation_active
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- STEP 4: SIMULATION PARTICIPANTS POLICIES
-- ============================================================================

-- View participants: Admins, Super Admins, and users can see their own records
CREATE POLICY "participants_select_policy" ON simulation_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
  OR
  -- Users can see their own participation records
  user_id = auth.uid()
);

-- Add participants: Admins and Super Admins only
CREATE POLICY "participants_insert_policy" ON simulation_participants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Update participants: Admins and Super Admins only
CREATE POLICY "participants_update_policy" ON simulation_participants
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Remove participants: Admins and Super Admins only
CREATE POLICY "participants_delete_policy" ON simulation_participants
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- STEP 5: SIMULATION HISTORY POLICIES
-- ============================================================================

-- View history: Admins, Super Admins, and participants who were in that simulation
CREATE POLICY "history_select_policy" ON simulation_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
  OR
  -- Users who participated can view their simulation history
  (participants::jsonb ? auth.uid()::text)
);

-- Create history: System only (through functions)
CREATE POLICY "history_insert_policy" ON simulation_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Update history: Admins and Super Admins only (for debrief data)
CREATE POLICY "history_update_policy" ON simulation_history
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Delete history: Super Admins only
CREATE POLICY "history_delete_policy" ON simulation_history
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);

-- ============================================================================
-- STEP 6: ACTIVITY LOG POLICIES
-- ============================================================================

-- View activity: Admins, Super Admins, and participants in that simulation
CREATE POLICY "activity_select_policy" ON simulation_activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
  OR
  -- Participants can see activity in their simulation
  EXISTS (
    SELECT 1 FROM simulation_participants
    WHERE simulation_participants.simulation_id = simulation_activity_log.simulation_id
    AND simulation_participants.user_id = auth.uid()
  )
);

-- Create activity: Any participant in the simulation
CREATE POLICY "activity_insert_policy" ON simulation_activity_log
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM simulation_participants
    WHERE simulation_participants.simulation_id = simulation_activity_log.simulation_id
    AND simulation_participants.user_id = auth.uid()
  )
);

-- No update or delete on activity log (immutable audit trail)

-- ============================================================================
-- STEP 7: SIMULATION DATA ACCESS POLICIES (PATIENTS, MEDS, ETC)
-- ============================================================================

-- Students can access simulation tenant data if they're assigned to that simulation
-- This extends existing patient/medication/vitals policies

-- Helper function to check if user has access to simulation tenant
CREATE OR REPLACE FUNCTION has_simulation_tenant_access(check_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM simulation_active sa
    JOIN simulation_participants sp ON sp.simulation_id = sa.id
    WHERE sa.tenant_id = check_tenant_id
    AND sp.user_id = auth.uid()
    AND sa.status = 'running'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update patients policy to include simulation access
-- Note: This assumes you have existing RLS policies on patients table
-- We're adding simulation access to the SELECT policy

-- First, drop and recreate the patients select policy to include simulation access
-- WARNING: Adjust policy name if different in your schema
DROP POLICY IF EXISTS "patients_select_policy" ON patients;

CREATE POLICY "patients_select_policy" ON patients
FOR SELECT USING (
  -- Regular tenant access (existing logic via user_tenant_access)
  EXISTS (
    SELECT 1 FROM user_tenant_access uta
    JOIN user_profiles up ON up.id = uta.user_id
    WHERE uta.user_id = auth.uid()
    AND uta.is_active = true
    AND (
      uta.tenant_id = patients.tenant_id
      OR up.role = 'super_admin'
    )
  )
  OR
  -- Simulation tenant access (new logic)
  has_simulation_tenant_access(patients.tenant_id)
);

-- ============================================================================
-- OPTIONAL: Apply similar logic to other data tables if they exist
-- Uncomment and modify as needed for your specific schema
-- ============================================================================

-- Example: Medications (if table exists)
-- DROP POLICY IF EXISTS "medications_select_policy" ON medications;
-- CREATE POLICY "medications_select_policy" ON medications
-- FOR SELECT USING (
--   EXISTS (
--     SELECT 1 FROM user_tenant_access uta
--     JOIN user_profiles up ON up.id = uta.user_id
--     WHERE uta.user_id = auth.uid()
--     AND uta.is_active = true
--     AND (
--       uta.tenant_id = medications.tenant_id
--       OR up.role = 'super_admin'
--     )
--   )
--   OR
--   has_simulation_tenant_access(medications.tenant_id)
-- );

-- Patient Medications
DROP POLICY IF EXISTS "patient_medications_select_policy" ON patient_medications;
CREATE POLICY "patient_medications_select_policy" ON patient_medications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM patients p
    JOIN user_tenant_access uta ON uta.tenant_id = p.tenant_id
    JOIN user_profiles up ON up.id = uta.user_id
    WHERE uta.user_id = auth.uid()
    AND uta.is_active = true
    AND p.id = patient_medications.patient_id
    AND (
      uta.tenant_id = p.tenant_id
      OR up.role = 'super_admin'
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_medications.patient_id
    AND has_simulation_tenant_access(p.tenant_id)
  )
);

-- Patient Vitals
DROP POLICY IF EXISTS "patient_vitals_select_policy" ON patient_vitals;
CREATE POLICY "patient_vitals_select_policy" ON patient_vitals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM patients p
    JOIN user_tenant_access uta ON uta.tenant_id = p.tenant_id
    JOIN user_profiles up ON up.id = uta.user_id
    WHERE uta.user_id = auth.uid()
    AND uta.is_active = true
    AND p.id = patient_vitals.patient_id
    AND (
      uta.tenant_id = p.tenant_id
      OR up.role = 'super_admin'
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_vitals.patient_id
    AND has_simulation_tenant_access(p.tenant_id)
  )
);

-- Add INSERT/UPDATE policies for simulation participants
-- Students can modify data in their assigned simulation tenants
CREATE POLICY "patients_simulation_insert_policy" ON patients
FOR INSERT WITH CHECK (
  has_simulation_tenant_access(tenant_id)
);

CREATE POLICY "patients_simulation_update_policy" ON patients
FOR UPDATE USING (
  has_simulation_tenant_access(tenant_id)
);

-- ============================================================================
-- NOTE: Apply similar INSERT/UPDATE policies to other tables used in simulations
-- For each table (medications, vitals, notes, assessments, etc.), add:
-- 1. A policy allowing INSERT if has_simulation_tenant_access(tenant_id)
-- 2. A policy allowing UPDATE if has_simulation_tenant_access(tenant_id)
-- ============================================================================

-- RLS policies complete
-- Next step: Run 004_create_simulation_functions.sql

COMMENT ON FUNCTION has_simulation_tenant_access IS 'Check if current user has access to simulation tenant data';
