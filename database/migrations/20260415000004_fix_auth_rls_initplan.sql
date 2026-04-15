-- ============================================================================
-- FIX AUTH_RLS_INITPLAN (Supabase Performance Advisor)
-- ============================================================================
-- Bare auth.uid() / auth.role() calls in USING / WITH CHECK expressions are
-- re-evaluated for every row that the planner reads, instead of once per
-- statement.  Wrapping them in (SELECT auth.uid()) tells PostgreSQL to
-- evaluate the function once (init plan) and reuse the result.
--
-- Also replaces deprecated user_tenant_access VIEW references in four policies
-- (programs_tenant_isolation, program_announcements_view_program,
--  scheduled_simulations_view_program, user_programs_view_tenant was already
--  replaced by migration 003) with direct tenant_users subqueries.
--
-- Run order: 003 (consolidate_duplicate_rls_policies) MUST run first.
-- Migration 003 already creates its new policies with (SELECT auth.uid())
-- so this migration only targets pre-existing policies.
-- ============================================================================


-- ============================================================================
-- SECTION 1: SIMPLE TENANT ISOLATION (from migration 001)
-- Tables: device_assessments, patient_bbit_entries,
--         patient_intake_output_events, patient_neuro_assessments,
--         patient_newborn_assessments, lab_orders
-- Pattern: tenant_id IN (... tenant_users WHERE user_id = auth.uid() ...)
--          OR EXISTS (... user_profiles WHERE id = auth.uid() AND super_admin)
-- ============================================================================

ALTER POLICY device_assessments_tenant_isolation
  ON public.device_assessments
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY bbit_entries_tenant_isolation
  ON public.patient_bbit_entries
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY intake_output_events_tenant_isolation
  ON public.patient_intake_output_events
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY neuro_assessments_tenant_isolation
  ON public.patient_neuro_assessments
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY newborn_assessments_tenant_isolation
  ON public.patient_newborn_assessments
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY lab_orders_tenant_isolation
  ON public.lab_orders
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );


-- ============================================================================
-- SECTION 2: LAB PANELS (from migration 002)
-- ============================================================================

ALTER POLICY lab_panels_select
  ON public.lab_panels
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY lab_panels_insert
  ON public.lab_panels
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

ALTER POLICY lab_panels_update
  ON public.lab_panels
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

ALTER POLICY lab_panels_delete
  ON public.lab_panels
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );


-- ============================================================================
-- SECTION 3: LAB RESULTS (from migration 002)
-- ============================================================================

ALTER POLICY lab_results_select
  ON public.lab_results
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY lab_results_insert
  ON public.lab_results
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

ALTER POLICY lab_results_update
  ON public.lab_results
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (SELECT auth.uid())
          AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
      )
      OR (ack_by = (SELECT auth.uid()) AND ack_at IS NOT NULL)
    )
  );

ALTER POLICY lab_results_delete
  ON public.lab_results
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );


-- ============================================================================
-- SECTION 4: LAB ACK EVENTS (from migration 002)
-- ============================================================================

ALTER POLICY lab_ack_events_select
  ON public.lab_ack_events
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY lab_ack_events_insert
  ON public.lab_ack_events
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
    AND ack_by = (SELECT auth.uid())
  );


-- ============================================================================
-- SECTION 5: PATIENT WOUNDS (from migration 001)
-- NOTE: patient_wounds has no direct tenant_id; joins via patients table.
-- The pre-existing INSERT policy (patient_wounds_tenant_insert or similar)
-- is handled by the dynamic section at the end.
-- ============================================================================

ALTER POLICY patient_wounds_select
  ON public.patient_wounds
  USING (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = (SELECT auth.uid())
          AND tenant_users.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY patient_wounds_update
  ON public.patient_wounds
  USING (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = (SELECT auth.uid())
          AND tenant_users.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = (SELECT auth.uid())
          AND tenant_users.is_active = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

ALTER POLICY patient_wounds_delete
  ON public.patient_wounds
  USING (
    patient_id IN (
      SELECT patients.id FROM patients
      WHERE patients.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = (SELECT auth.uid())
          AND tenant_users.is_active = true
      )
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );


-- ============================================================================
-- SECTION 6: SIMULATION_ACTIVE (from migration 20260201000002_v2)
-- Complex multi-condition policies — all bare auth.uid() wrapped.
-- ============================================================================

ALTER POLICY active_select_instructor_programs
  ON public.simulation_active
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_active.tenant_id
        AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM simulation_participants sp
      WHERE sp.simulation_id = simulation_active.id
        AND sp.user_id = (SELECT auth.uid())
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'
      )
      AND (
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  );

ALTER POLICY active_insert_policy
  ON public.simulation_active
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'admin', 'instructor', 'coordinator')
    )
  );

ALTER POLICY active_update_policy
  ON public.simulation_active
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_active.tenant_id
        AND tu.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'
      )
      AND (
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'admin')
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'
      )
      AND (
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  );

ALTER POLICY active_delete_policy
  ON public.simulation_active
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_active.tenant_id
        AND tu.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'
      )
      AND (
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  );


-- ============================================================================
-- SECTION 7: SIMULATION_TEMPLATES remaining policies
-- (templates_select was already fixed in migration 003)
-- All policies below are bare auth.uid() — wrap each occurrence.
-- ============================================================================

-- DELETE: instructor-program-based access (same expression as SELECT version)
ALTER POLICY templates_delete_instructor_programs
  ON public.simulation_templates
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::user_role
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::user_role
      )
      AND (
        primary_categories IS NULL
        OR primary_categories = '{}'::text[]
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  );

-- UPDATE: instructor-program-based access (USING + WITH CHECK identical)
ALTER POLICY templates_update_instructor_programs
  ON public.simulation_templates
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::user_role
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::user_role
      )
      AND (
        primary_categories IS NULL
        OR primary_categories = '{}'::text[]
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'admin'::user_role
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid()) AND up.role = 'instructor'::user_role
      )
      AND (
        primary_categories IS NULL
        OR primary_categories = '{}'::text[]
        OR EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = (SELECT auth.uid())
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  );

-- DELETE: creator or admin (legacy simpler policy)
ALTER POLICY "templates_delete_policy"
  ON public.simulation_templates
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'admin'::user_role])
    )
  );

-- INSERT: admins and instructors can create templates
ALTER POLICY "templates_insert_policy"
  ON public.simulation_templates
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY[
          'super_admin'::user_role,
          'admin'::user_role,
          'instructor'::user_role
        ])
    )
  );

-- UPDATE: creator or admin (legacy simpler policy)
ALTER POLICY "templates_update_policy"
  ON public.simulation_templates
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'admin'::user_role])
    )
  );


-- ============================================================================
-- SECTION 8: DOCTORS_ORDERS, LAB_RESULT_REFS, WOUNDS, AVATAR_LOCATIONS,
--            DEVICES, SYSTEM_LOGS, USER_PROFILES, TENANTS
-- ============================================================================

-- doctors_orders: super_admin OR tenant_users (same for USING and WITH CHECK)
ALTER POLICY "doctors_orders_access"
  ON public.doctors_orders
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = (SELECT auth.uid())
        AND tenant_id = doctors_orders.tenant_id
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = (SELECT auth.uid())
        AND tenant_id = doctors_orders.tenant_id
        AND is_active = true
    )
  );

-- lab_result_refs: admins only (reference data, no tenant column)
ALTER POLICY "lab_result_refs_modify"
  ON public.lab_result_refs
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'super_admin')
    )
  );

-- wounds: super_admin OR tenant_users (hacmap ALL policy)
ALTER POLICY hacmap_wounds_access
  ON public.wounds
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
        AND user_profiles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = (SELECT auth.uid())
        AND tenant_users.tenant_id = wounds.tenant_id
        AND tenant_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
        AND user_profiles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = (SELECT auth.uid())
        AND tenant_users.tenant_id = wounds.tenant_id
        AND tenant_users.is_active = true
    )
  );

-- avatar_locations: same pattern as wounds
ALTER POLICY hacmap_avatar_locations_access
  ON public.avatar_locations
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
        AND user_profiles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = (SELECT auth.uid())
        AND tenant_users.tenant_id = avatar_locations.tenant_id
        AND tenant_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
        AND user_profiles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = (SELECT auth.uid())
        AND tenant_users.tenant_id = avatar_locations.tenant_id
        AND tenant_users.is_active = true
    )
  );

-- devices: same pattern as wounds / avatar_locations
ALTER POLICY hacmap_devices_access
  ON public.devices
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
        AND user_profiles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = (SELECT auth.uid())
        AND tenant_users.tenant_id = devices.tenant_id
        AND tenant_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
        AND user_profiles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = (SELECT auth.uid())
        AND tenant_users.tenant_id = devices.tenant_id
        AND tenant_users.is_active = true
    )
  );

-- system_logs: super_admin only
ALTER POLICY "super_admin_view_system_logs"
  ON public.system_logs
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
    )
  );

ALTER POLICY "super_admin_delete_system_logs"
  ON public.system_logs
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'::user_role
    )
  );

-- user_profiles: own row or super_admin can delete
ALTER POLICY user_profiles_delete
  ON public.user_profiles
  USING (
    (id = (SELECT auth.uid())) OR current_user_is_super_admin()
  );

-- tenants: super_admin bypass (ALL policy)
ALTER POLICY tenants_super_admin_access
  ON public.tenants
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'::user_role
    )
  );


-- ============================================================================
-- SECTION 9: STUDENT_ROSTER, USER_PROGRAMS_MANAGEMENT
-- ============================================================================

ALTER POLICY student_roster_management
  ON public.student_roster
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY[
          'super_admin'::user_role,
          'coordinator'::user_role,
          'admin'::user_role,
          'instructor'::user_role
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY[
          'super_admin'::user_role,
          'coordinator'::user_role,
          'admin'::user_role,
          'instructor'::user_role
        ])
    )
  );

ALTER POLICY student_roster_view_program
  ON public.student_roster
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.tenant_id IN (
        SELECT tenant_users.tenant_id FROM tenant_users
        WHERE tenant_users.user_id = (SELECT auth.uid())
          AND tenant_users.is_active = true
      )
    )
  );

-- user_programs_management (ALL policy — USING + WITH CHECK)
ALTER POLICY user_programs_management
  ON public.user_programs
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = ANY(ARRAY['super_admin'::user_role, 'coordinator'::user_role])
    )
  );


-- ============================================================================
-- SECTION 10: PROGRAMS / PROGRAM_ANNOUNCEMENTS / SCHEDULED_SIMULATIONS
-- These reference user_tenant_access VIEW which is being phased out.
-- Replace with direct tenant_users query + wrap auth.uid().
-- ============================================================================

-- programs_management (ALL policy)
ALTER POLICY programs_management
  ON public.programs
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
    )
  );

-- programs_tenant_isolation: replace user_tenant_access view → tenant_users
DROP POLICY IF EXISTS programs_tenant_isolation ON public.programs;
CREATE POLICY programs_tenant_isolation
  ON public.programs
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = (SELECT auth.uid()) AND is_active = true
    )
  );

-- program_announcements_management (ALL policy)
ALTER POLICY program_announcements_management
  ON public.program_announcements
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'instructor', 'admin')
    )
  );

-- program_announcements_view_program: replace user_tenant_access view
DROP POLICY IF EXISTS program_announcements_view_program ON public.program_announcements;
CREATE POLICY program_announcements_view_program
  ON public.program_announcements
  FOR SELECT TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = (SELECT auth.uid()) AND is_active = true
      )
    )
  );

-- scheduled_simulations_management (ALL policy)
ALTER POLICY scheduled_simulations_management
  ON public.scheduled_simulations
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator', 'admin', 'instructor')
    )
  );

-- scheduled_simulations_view_program: replace user_tenant_access view
DROP POLICY IF EXISTS scheduled_simulations_view_program ON public.scheduled_simulations;
CREATE POLICY scheduled_simulations_view_program
  ON public.scheduled_simulations
  FOR SELECT TO authenticated
  USING (
    program_id IN (
      SELECT p.id FROM programs p
      WHERE p.tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = (SELECT auth.uid()) AND is_active = true
      )
    )
  );


-- ============================================================================
-- SECTION 11: DYNAMIC FIX — remaining tables with unknown policy names
-- ============================================================================
-- Targets tables where policies were defined outside tracked migrations.
-- Uses regexp_replace to substitute bare auth.uid() → (SELECT auth.uid()).
-- Only runs on policies in the listed tables that actually contain auth.uid().
-- Safe to run multiple times: the Supabase advisor accepts any depth of
-- SELECT nesting once auth.uid() is no longer the outermost call.
-- ============================================================================

DO $$
DECLARE
  r           RECORD;
  v_new_using TEXT;
  v_new_check TEXT;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd,
           qual        AS using_expr,
           with_check  AS check_expr
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  tablename = ANY(ARRAY[
             'bowel_records',
             'patient_admission_records',
             'patient_advanced_directives',
             'patient_notes',
             'patient_medications',
             'patient_vitals',
             'patient_wounds',
             'simulation_activity_log',
             'simulation_history',
             'simulation_participants',
             'simulation_table_config',
             'contact_submissions'
           ])
      AND (qual       ~ E'auth\\.uid\\(\\)'
        OR with_check ~ E'auth\\.uid\\(\\)')
  LOOP
    v_new_using := regexp_replace(
      COALESCE(r.using_expr, ''),
      E'auth\\.uid\\(\\)',
      '(SELECT auth.uid())',
      'g'
    );
    v_new_check := regexp_replace(
      COALESCE(r.check_expr, ''),
      E'auth\\.uid\\(\\)',
      '(SELECT auth.uid())',
      'g'
    );

    RAISE NOTICE 'auth_rls_initplan: fixing % on %', r.policyname, r.tablename;

    IF r.using_expr IS NOT NULL AND r.check_expr IS NOT NULL THEN
      EXECUTE 'ALTER POLICY ' || quote_ident(r.policyname)
           || ' ON public.' || quote_ident(r.tablename)
           || ' USING (' || v_new_using || ')'
           || ' WITH CHECK (' || v_new_check || ')';
    ELSIF r.using_expr IS NOT NULL THEN
      EXECUTE 'ALTER POLICY ' || quote_ident(r.policyname)
           || ' ON public.' || quote_ident(r.tablename)
           || ' USING (' || v_new_using || ')';
    ELSE
      -- INSERT policies have only WITH CHECK
      EXECUTE 'ALTER POLICY ' || quote_ident(r.policyname)
           || ' ON public.' || quote_ident(r.tablename)
           || ' WITH CHECK (' || v_new_check || ')';
    END IF;
  END LOOP;
END$$;


-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- Confirm no remaining bare auth.uid() calls in USING expressions:
-- SELECT tablename, policyname, cmd,
--        qual       ~ E'auth\\.uid\\(\\)'        AS using_has_uid,
--        with_check ~ E'auth\\.uid\\(\\)'        AS check_has_uid,
--        qual       ~ E'\\(SELECT auth\\.uid'    AS using_wrapped,
--        with_check ~ E'\\(SELECT auth\\.uid'    AS check_wrapped
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
--   AND (qual ~ E'auth\\.uid\\(\\)' OR with_check ~ E'auth\\.uid\\(\\)')
-- ORDER  BY tablename, policyname;
-- Expected: all rows have using_wrapped = true (or the uid is in a nested SELECT)
