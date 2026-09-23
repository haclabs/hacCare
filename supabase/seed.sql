-- ============================================================================
-- Seed data for local development
-- ============================================================================
-- Applied by `supabase start` and `supabase db reset`. Runs as postgres, so
-- RLS is bypassed here -- that is the point: it builds the fixture that
-- supabase/tests/verify_rls_isolation.sql then reads back *as a student*.
--
-- The shape mirrors a real deployment closely enough to exercise every branch
-- of user_may_join_tenant():
--
--   Institution A ---- Program PN ---- Template tenant --- Simulation tenant
--        |                                  (template)        (sim, launched)
--        +-- instructor (assigned to PN)                       |
--        +-- super_admin                                       +-- student
--   Institution B (unrelated -- the "foreign tenant" the student must not reach)
--        +-- nurse
--
-- Two deliberate choices:
--
--   * The instructor is NOT in tenant_users for the simulation tenant.
--     launch_simulation only enrols participants, which is exactly why the
--     permissive self-enrolment policy existed. Seeding the instructor in
--     would hide that gap.
--   * Exactly ONE user has role 'student'. The verification script picks its
--     subject with `WHERE role = 'student' ... LIMIT 1`, so a second student
--     would make which assertions run non-deterministic.
--
-- DO NOT include production data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Populate user_tenant_cache before anything touches tenant_users
-- ----------------------------------------------------------------------------
-- The baseline is a pg_dump, which emits materialized views WITH NO DATA. The
-- statement-level trigger tenant_users_cache_refresh calls
-- REFRESH MATERIALIZED VIEW CONCURRENTLY, and Postgres rejects that on a view
-- that has never been populated ("CONCURRENTLY cannot be used when the
-- materialized view is not populated"). One plain refresh clears that for good.
-- Production is unaffected -- the view is populated there.
REFRESH MATERIALIZED VIEW public.user_tenant_cache;

-- ----------------------------------------------------------------------------
-- Auth users (user_profiles.id is FK -> auth.users.id ON DELETE CASCADE)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'superadmin@local.test', crypt('password123', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'instructor@local.test', crypt('password123', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'student@local.test', crypt('password123', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'nurse-b@local.test', crypt('password123', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Tenants
-- ----------------------------------------------------------------------------
INSERT INTO public.tenants (id, name, subdomain, tenant_type, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Institution A', 'institution-a', 'institution', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Institution B', 'institution-b', 'institution', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'PN Template Tenant', 'pn-template', 'simulation_template', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'PN Sim Session 1', 'pn-sim-1', 'simulation_active', 'active')
ON CONFLICT (id) DO NOTHING;

UPDATE public.tenants SET parent_tenant_id = '11111111-1111-1111-1111-111111111111'
WHERE id IN ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');

-- ----------------------------------------------------------------------------
-- Profiles
-- ----------------------------------------------------------------------------
INSERT INTO public.user_profiles (id, email, first_name, last_name, role, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'superadmin@local.test', 'Sam',  'Admin',      'super_admin', true),
  ('b0000000-0000-0000-0000-000000000001', 'instructor@local.test', 'Ivy',  'Instructor', 'instructor',  true),
  ('c0000000-0000-0000-0000-000000000001', 'student@local.test',    'Stu',  'Student',    'student',     true),
  ('d0000000-0000-0000-0000-000000000001', 'nurse-b@local.test',    'Nina', 'Nurse',      'nurse',       true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Program + instructor assignment
-- ----------------------------------------------------------------------------
INSERT INTO public.programs (id, tenant_id, code, name, is_active, created_by) VALUES
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'PN', 'Practical Nursing', true, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_programs (user_id, program_id, assigned_by) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Template + launched simulation
-- ----------------------------------------------------------------------------
INSERT INTO public.simulation_templates
  (id, name, tenant_id, status, snapshot_version, created_by, primary_categories) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'PN Week 1', '33333333-3333-3333-3333-333333333333',
   'ready', 1, 'b0000000-0000-0000-0000-000000000001', ARRAY['PN'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.simulation_active
  (id, template_id, name, tenant_id, status, duration_minutes,
   template_snapshot_version, created_by, primary_categories) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
   'PN Week 1 - Session 1', '44444444-4444-4444-4444-444444444444', 'running', 120,
   1, 'b0000000-0000-0000-0000-000000000001', ARRAY['PN'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.simulation_participants (simulation_id, user_id, role, granted_by) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'student', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Memberships
-- ----------------------------------------------------------------------------
-- NOTE: the instructor is intentionally absent from the simulation tenant.
INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'super_admin', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000001', 'instructor',  true),
  ('22222222-2222-2222-2222-222222222222', 'd0000000-0000-0000-0000-000000000001', 'nurse',       true),
  ('44444444-4444-4444-4444-444444444444', 'c0000000-0000-0000-0000-000000000001', 'student',     true)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Clinical data: one patient the student may see, one they must not
-- ----------------------------------------------------------------------------
INSERT INTO public.patients
  (id, patient_id, first_name, last_name, date_of_birth, gender, room_number, bed_number,
   admission_date, condition, diagnosis, blood_type, emergency_contact_name,
   emergency_contact_relationship, emergency_contact_phone, tenant_id) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'PT-SIM-001', 'Mary', 'Sims', '1948-03-11', 'Female',
   '101', 'A', '2026-09-20', 'Stable', 'Community-acquired pneumonia', 'O+',
   'John Sims', 'Spouse', '555-0101', '44444444-4444-4444-4444-444444444444'),
  ('bb000000-0000-0000-0000-000000000001', 'PT-INSTB-001', 'Peter', 'Other', '1955-07-02', 'Male',
   '202', 'B', '2026-09-19', 'Stable', 'Post-operative day 2', 'A-',
   'Jane Other', 'Daughter', '555-0202', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.handover_notes
  (patient_id, created_by, situation, background, assessment, recommendations,
   shift, priority, created_by_name, created_by_role) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Febrile overnight', 'Admitted with CAP', 'Responding to antibiotics',
   'Continue IV antibiotics, reassess in AM', 'night', 'medium', 'Ivy Instructor', 'instructor'),
  ('bb000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Pain controlled', 'POD 2 laparotomy', 'Wound clean and dry',
   'Mobilise as tolerated', 'day', 'low', 'Sam Admin', 'super_admin')
ON CONFLICT DO NOTHING;

SELECT 'Seed data loaded successfully' AS status;
