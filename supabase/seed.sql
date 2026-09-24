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

-- GoTrue scans these columns into Go `string`, not `*string`, so a NULL makes
-- login fail with "Database error querying schema" -- which looks like a
-- connection problem and is not. They must be empty strings, never NULL.
UPDATE auth.users SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE email LIKE '%@local.test';

-- Email sign-in also needs an identity row per user; inserting into auth.users
-- alone is not enough on current GoTrue.
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
SELECT u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email,
                          'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.email LIKE '%@local.test'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );

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

-- ============================================================================
-- Clinical content for the simulation patient
-- ============================================================================
-- Enough for the chart, the MAR and the debrief to look like a real session
-- rather than an empty shell. Mary Sims (PT-SIM-001) is admitted with
-- community-acquired pneumonia, so the medications, orders and labs below hang
-- together clinically.
--
-- Rows carrying `student_name` are what the debrief pipeline reports as student
-- work; rows without it are template baseline. That distinction is the whole
-- basis of the debrief, so both kinds are seeded.

-- Medications -----------------------------------------------------------------
INSERT INTO public.patient_medications
  (id, patient_id, tenant_id, name, dosage, frequency, route, start_date,
   prescribed_by, next_due, status, category, admin_times) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001',
   '44444444-4444-4444-4444-444444444444', 'Ceftriaxone', '1 g', 'Once daily', 'IV',
   '2026-09-20', 'Dr. Patel', now() + interval '4 hours', 'Active', 'scheduled',
   '["08:00"]'::jsonb),
  ('a1000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001',
   '44444444-4444-4444-4444-444444444444', 'Azithromycin', '500 mg', 'Once daily', 'PO',
   '2026-09-20', 'Dr. Patel', now() + interval '6 hours', 'Active', 'scheduled',
   '["10:00"]'::jsonb),
  ('a1000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001',
   '44444444-4444-4444-4444-444444444444', 'Acetaminophen', '650 mg', 'Every 6 hours PRN', 'PO',
   '2026-09-20', 'Dr. Patel', now() + interval '2 hours', 'Active', 'prn',
   '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- One administration recorded by the student, so the debrief has something.
INSERT INTO public.medication_administrations
  (patient_id, tenant_id, medication_id, medication_name, dosage, route,
   administered_by, administered_by_id, student_name, status, timestamp) VALUES
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'a1000000-0000-0000-0000-000000000001', 'Ceftriaxone', '1 g', 'IV',
   'Stu Student', 'c0000000-0000-0000-0000-000000000001', 'Stu Student',
   'completed', now() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- Vitals ----------------------------------------------------------------------
-- The first is template baseline (no student_name); the second is student work.
-- The third deliberately omits blood pressure, which is the partial-entry case
-- the schema supports and the reason bloodPressure is all-or-nothing.
INSERT INTO public.patient_vitals
  (patient_id, tenant_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
   heart_rate, respiratory_rate, oxygen_saturation, oxygen_delivery, oxygen_flow_rate,
   recorded_at, student_name) VALUES
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   38.9, 104, 62, 112, 26, 91, 'Nasal Prongs', '1L-15L', now() - interval '8 hours', NULL),
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   38.2, 110, 68, 98, 22, 94, 'Nasal Prongs', '1L-15L', now() - interval '3 hours', 'Stu Student'),
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   37.6, NULL, NULL, 88, 18, 96, 'Room Air', 'N/A', now() - interval '1 hour', 'Stu Student')
ON CONFLICT DO NOTHING;

-- Doctor's orders --------------------------------------------------------------
INSERT INTO public.doctors_orders
  (patient_id, tenant_id, order_text, ordering_doctor, order_type, notes,
   is_acknowledged, created_by, order_date, order_time) VALUES
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'Continue IV antibiotics; reassess oxygen requirement in AM', 'Dr. Patel', 'Direct',
   'Wean oxygen as tolerated, target SpO2 92-96%', false,
   'b0000000-0000-0000-0000-000000000001', CURRENT_DATE, '07:30'),
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'Chest physiotherapy twice daily', 'Dr. Patel', 'Verbal Order', NULL, true,
   'b0000000-0000-0000-0000-000000000001', CURRENT_DATE, '08:15')
ON CONFLICT DO NOTHING;

-- Nursing notes ----------------------------------------------------------------
INSERT INTO public.patient_notes
  (patient_id, tenant_id, note_type, content, nurse_name, priority, student_name) VALUES
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'assessment', 'Productive cough, rust-coloured sputum. Crackles right base. Tolerating nasal prongs.',
   'Stu Student', 'medium', 'Stu Student'),
  ('aa000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'progress', 'Temperature trending down after antibiotics. Ambulated to chair with one assist.',
   'Stu Student', 'low', 'Stu Student')
ON CONFLICT DO NOTHING;

-- Labs -------------------------------------------------------------------------
INSERT INTO public.lab_panels
  (id, tenant_id, patient_id, panel_time, source, status, ack_required, notes) VALUES
  ('b1000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'aa000000-0000-0000-0000-000000000001', now() - interval '10 hours',
   'Admission bloodwork', 'new', true, 'Drawn on admission')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_results
  (tenant_id, patient_id, panel_id, category, test_code, test_name,
   value, units, ref_low, ref_high, ref_operator, flag, entered_at) VALUES
  ('44444444-4444-4444-4444-444444444444', 'aa000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 'hematology', 'WBC', 'White Blood Cells',
   17.4, 'x10^9/L', 4.0, 11.0, 'between', 'critical_high', now() - interval '9 hours'),
  ('44444444-4444-4444-4444-444444444444', 'aa000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 'hematology', 'HGB', 'Hemoglobin',
   118, 'g/L', 120, 160, 'between', 'abnormal_low', now() - interval '9 hours'),
  ('44444444-4444-4444-4444-444444444444', 'aa000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 'chemistry', 'CRP', 'C-Reactive Protein',
   148, 'mg/L', 0, 5, 'between', 'critical_high', now() - interval '9 hours'),
  ('44444444-4444-4444-4444-444444444444', 'aa000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 'chemistry', 'NA', 'Sodium',
   136, 'mmol/L', 135, 145, 'between', 'normal', now() - interval '9 hours')
ON CONFLICT DO NOTHING;

SELECT 'Clinical seed data loaded' AS status;
