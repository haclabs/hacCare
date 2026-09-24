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

-- ============================================================================
-- Medication catalog
-- ============================================================================
-- Copied from production 2026-09-23. Reference data only: drug names,
-- formulations and barcodes, no patient or user information. tenant_id is NULL
-- on every row in production too -- the catalog is global, not tenant-scoped.
--
-- Barcodes matter: BCMA scanning is keyed on them, so these must match
-- production or a scanned label will not resolve in a dev environment.

INSERT INTO public.medications_catalog
  (barcode, name, generic_name, formulation, strength, route, category, is_active, display_order, notes) VALUES
  ('MZ001', 'Metoprolol', 'Metoprolol', 'tablet', '25 mg', 'oral', 'scheduled', true, 1, NULL),
  ('MZ002', 'Lisinopril', 'Lisinopril', 'tablet', '10 mg', 'oral', 'scheduled', true, 2, NULL),
  ('MZ003', 'Furosemide', 'Furosemide', 'tablet', '40 mg', 'oral', 'scheduled', true, 3, NULL),
  ('MZ004', 'Atorvastatin', 'Atorvastatin', 'tablet', '20 mg', 'oral', 'scheduled', true, 4, NULL),
  ('MZ005', 'Aspirin', 'Acetylsalicylic Acid', 'tablet', '81 mg', 'oral', 'scheduled', true, 5, NULL),
  ('MZ006', 'Heparin', 'Heparin Sodium', 'injection', '5000 units/mL', 'subcutaneous', 'scheduled', true, 6, NULL),
  ('MZ007', 'Morphine Sulfate', 'Morphine', 'IV solution', '2 mg/mL', 'intravenous', 'prn', true, 7, NULL),
  ('MZ008', 'Ondansetron', 'Ondansetron HCl', 'IV solution', '4 mg/2 mL', 'intravenous', 'prn', true, 8, NULL),
  ('MZ009', 'Acetaminophen', 'Acetaminophen', 'tablet', '650 mg', 'oral', 'prn', true, 9, NULL),
  ('MZ010', 'Metformin', 'Metformin HCl', 'tablet', '500 mg', 'oral', 'diabetic', true, 10, NULL),
  ('MZ011', 'Regular Insulin', 'Insulin Human', 'injection', '100 units/mL', 'subcutaneous', 'diabetic', true, 11, NULL),
  ('MZ012', 'Vancomycin', 'Vancomycin HCl', 'IV solution', '500 mg/100 mL', 'intravenous', 'scheduled', true, 12, NULL),
  ('MZ013', 'Pantoprazole', 'Pantoprazole Sodium', 'tablet', '40 mg', 'oral', 'scheduled', true, 13, NULL),
  ('MZ014', 'Lorazepam', 'Lorazepam', 'tablet', '0.5 mg', 'oral', 'prn', true, 14, NULL),
  ('MZ015', 'Amoxicillin', 'Amoxicillin', 'capsule', '500 mg', 'oral', 'scheduled', true, 15, NULL),
  ('MZ016', 'Dextrose 5% in Water', NULL, 'IV solution', '250 mL', 'intravenous', 'continuous', false, 16, NULL),
  ('MZ017', 'Normal Saline 0.9%', 'Sodium Chloride', 'IV solution', '1000 mL', 'intravenous', 'continuous', false, 17, NULL),
  ('MZ018', 'Potassium Chloride', 'Potassium Chloride', 'IV solution', '20 mEq/100 mL', 'intravenous', 'scheduled', false, 18, NULL),
  ('MZ019', 'Warfarin', 'Warfarin Sodium', 'tablet', '5 mg', 'oral', 'scheduled', true, 19, NULL),
  ('MZ020', 'Dilaudid', 'Hydromorphone HCl', 'injection', '2 mg/mL', 'intramuscular', 'prn', true, 20, NULL),
  ('MZ047', 'Ampicillin', 'Ampicillin', 'IV solution', '55 mg', 'intravenous', 'scheduled', true, 47, NULL),
  ('MZ048', 'Vitamin D', 'Cholecalciferol', 'liquid', '400 IU', 'oral', 'scheduled', true, 48, NULL),
  ('MZ049', 'Normal Saline Drops', 'Sodium Chloride 0.9%', 'nasal drops', 'drops', 'nasal', 'prn', true, 49, NULL),
  ('MZ050', 'Breast Milk', NULL, 'bottle', 'mL', 'oral', 'scheduled', true, 50, NULL),
  ('MZ051', 'Formula', NULL, 'bottle', 'mL', 'oral', 'scheduled', true, 51, NULL),
  ('MZ052', 'Ceftriaxone', 'Ceftriaxone Sodium', 'IV solution', '221 mg', 'intravenous', 'scheduled', true, 52, NULL),
  ('MZ053', 'Vitamin K', 'Phytonadione', 'injection', '1 mg', 'intramuscular', 'unscheduled', true, 53, NULL),
  ('MZ054', 'Prenatal Vitamin', NULL, 'tablet', '1 tablet', 'oral', 'scheduled', true, 54, NULL),
  ('MZ055', 'Polyethylene Glycol', 'PEG 3350', 'powder', '17 g', 'oral', 'prn', true, 55, NULL),
  ('MZ056', 'Tinzaparin', 'Tinzaparin Sodium', 'injection', '20,000 units/mL', 'subcutaneous', 'scheduled', true, 56, NULL),
  ('MZ057', 'Acetaminophen', 'Acetaminophen', 'liquid', '10 mg/kg', 'oral', 'prn', true, 57, NULL),
  ('MZ058', 'Acetaminophen', 'Acetaminophen', 'tablet', '325 mg', 'oral', 'prn', true, 58, NULL),
  ('MZ059', 'Diclofenac', 'Diclofenac Sodium', 'tablet', '50 mg', 'oral', 'prn', true, 59, NULL),
  ('MZ060', 'Hydromorphone', 'Hydromorphone HCl', 'tablet', '1 mg', 'oral', 'prn', true, 60, NULL),
  ('MZ061', 'Hydromorphone', 'Hydromorphone HCl', 'tablet', '2 mg', 'oral', 'prn', true, 61, NULL),
  ('MZ062', 'Hydromorphone', 'Hydromorphone HCl', 'injection', '2 mg/mL', 'subcutaneous', 'prn', true, 62, NULL),
  ('MZ063', 'Hydromorphone', 'Hydromorphone HCl', 'IV solution', '2 mg/mL', 'intravenous', 'prn', true, 63, NULL),
  ('MZ064', 'Ondansetron', 'Ondansetron HCl', 'tablet', '4 mg', 'oral', 'prn', true, 64, NULL),
  ('MZ065', 'Ondansetron', 'Ondansetron HCl', 'injection', '4 mg/2 mL', 'subcutaneous', 'prn', true, 65, NULL),
  ('MZ066', 'Iron Sucrose', 'Iron Sucrose', 'pre-mixed mini-bag 250 mL', '300 mg', 'intravenous', 'scheduled', true, 66, NULL),
  ('MZ067', 'Oxytocin', 'Oxytocin', 'IV solution', '10 units/mL', 'intravenous', 'continuous', true, 67, NULL),
  ('MZ068', 'Ringers Lactate', 'Lactated Ringer''s Solution', 'IV solution', '1000 mL', 'intravenous', 'continuous', true, 68, NULL),
  ('MZ069', 'Atorvastatin', 'Atorvastatin Calcium', 'tablet', '40 mg', 'oral', 'scheduled', true, 69, NULL),
  ('MZ070', 'Calcium Carbonate', 'Calcium Carbonate', 'tablet', '500 mg', 'oral', 'scheduled', true, 70, NULL),
  ('MZ071', 'Diltiazem', 'Diltiazem HCl', 'tablet', '120 mg', 'oral', 'scheduled', true, 71, NULL),
  ('MZ072', 'Digitoxin', 'Digitoxin', 'tablet', '30 mg', 'oral', 'scheduled', true, 72, NULL),
  ('MZ073', 'Heparin', 'Heparin Sodium', 'injection', '10,000 units/mL', 'subcutaneous', 'scheduled', true, 73, NULL),
  ('MZ074', 'Insulin Degludec (Tresiba)', 'Insulin Degludec', 'insulin pen', 'units', 'subcutaneous', 'diabetic', true, 74, NULL),
  ('MZ075', 'Insulin Aspart (Trurapi Solostar)', 'Insulin Aspart', 'insulin pen', 'units', 'subcutaneous', 'diabetic', true, 75, NULL),
  ('MZ076', 'Multivitamin, Renal', NULL, 'tablet', '1 tablet', 'oral', 'scheduled', true, 76, NULL),
  ('MZ077', 'Multivitamin', NULL, 'tablet', '1 tablet', 'oral', 'scheduled', true, 77, NULL),
  ('MZ078', 'Sertraline', 'Sertraline HCl', 'capsule', '50 mg', 'oral', 'scheduled', true, 78, NULL),
  ('MZ079', 'Sennoside', 'Sennosides', 'tablet', '8.6 mg', 'oral', 'prn', true, 79, NULL),
  ('MZ080', 'Nicotine', 'Nicotine', 'patch', '14 mg', 'transdermal', 'scheduled', true, 80, NULL),
  ('MZ081', 'Dimenhydrinate', 'Dimenhydrinate', 'IV solution', '50 mg/mL', 'intravenous', 'prn', true, 81, NULL),
  ('MZ082', 'Dimenhydrinate', 'Dimenhydrinate', 'tablet', '50 mg', 'oral', 'prn', true, 82, NULL),
  ('MZ083', 'Lactulose', 'Lactulose', 'liquid', '15 mL', 'oral', 'prn', true, 83, NULL),
  ('MZ084', 'Acetaminophen', 'Acetaminophen', 'tablet', '500 mg', 'oral', 'prn', true, 84, NULL),
  ('MZ085', 'Hydromorphone SR', 'Hydromorphone HCl (extended-release)', 'capsule', '6 mg', 'oral', 'scheduled', true, 85, NULL),
  ('MZ086', 'Cefazolin', 'Cefazolin Sodium', 'vial or pre-mixed mini-bag 100 mL', '2 g', 'intravenous', 'scheduled', true, 86, NULL),
  ('MZ087', 'Furosemide', 'Furosemide', 'IV solution', '10 mg/mL', 'intravenous', 'scheduled', true, 87, NULL),
  ('MZ088', 'Ceftriaxone', 'Ceftriaxone Sodium', 'vial or pre-mixed mini-bag 100 mL', '1 g', 'intravenous', 'scheduled', true, 88, NULL),
  ('MZ089', 'Insulin Lispro (Ademelog)', 'Insulin Lispro', 'insulin pen', 'units', 'subcutaneous', 'diabetic', true, 89, NULL),
  ('MZ090', 'Digoxin', 'Digoxin', 'tablet', '0.25 mg', 'oral', 'scheduled', true, 90, NULL),
  ('MZ091', 'Furosemide', 'Furosemide', 'tablet', '20 mg', 'oral', 'scheduled', true, 91, NULL),
  ('MZ092', 'Perindopril', 'Perindopril Erbumine', 'tablet', '8 mg', 'oral', 'scheduled', true, 92, NULL),
  ('MZ093', 'Rivaroxaban', 'Rivaroxaban', 'tablet', '10 mg', 'oral', 'scheduled', true, 93, NULL),
  ('MZ094', 'Vitamin D', 'Cholecalciferol', 'tablet', '1000 IU', 'oral', 'scheduled', true, 94, NULL),
  ('MZ095', 'Hydromorphone SR', 'Hydromorphone HCl (extended-release)', 'capsule', '3 mg', 'oral', 'scheduled', true, 95, NULL),
  ('MZ096', 'Tramadol/Acetaminophen (Tramacet)', 'Tramadol HCl / Acetaminophen', 'tablet', '37.5/325 mg', 'oral', 'prn', true, 96, NULL),
  ('MZ097', 'Morphine', 'Morphine Sulfate', 'injection', '10 mg/mL', 'subcutaneous', 'prn', true, 97, NULL),
  ('MZ098', 'Quetiapine', 'Quetiapine Fumarate', 'tablet', '25 mg', 'oral', 'scheduled', true, 98, NULL),
  ('MZ099', 'Salbutamol', 'Salbutamol Sulfate (Albuterol)', 'inhaler', '100 mcg', 'inhalation', 'prn', true, 99, NULL),
  ('MZ100', 'Haloperidol', 'Haloperidol', 'injection', '5 mg/mL', 'subcutaneous', 'prn', true, 100, NULL),
  ('MZ101', 'Glycopyrrolate', 'Glycopyrrolate', 'injection', '0.2 mg/mL', 'subcutaneous', 'prn', true, 101, NULL),
  ('MZ102', 'Lorazepam', 'Lorazepam', 'tablet', '0.5 mg', 'sublingual', 'prn', true, 102, NULL),
  ('MZ103', 'Lorazepam', 'Lorazepam', 'tablet', '1 mg', 'sublingual', 'prn', true, 103, NULL),
  ('MZ104', 'Midazolam', 'Midazolam HCl', 'injection', '5 mg/mL', 'subcutaneous', 'prn', true, 104, NULL),
  ('MZ105', 'Lorazepam', 'Lorazepam', 'injection', '4 mg/mL', 'subcutaneous', 'prn', true, 105, NULL),
  ('MZ030', '1% Hydrocortisone cream', '1% Hydrocortisone', 'cream', 'UCP 1%', 'topical', 'scheduled', true, NULL, NULL),
  ('MZ038', 'Acyclovir cream', 'Acyclovir cream', 'cream', '5%', 'topical', 'scheduled', true, NULL, NULL),
  ('MZ028', 'Advair', 'salmeterol', 'inhaler', '200 doses', 'inhalation', 'scheduled', true, NULL, NULL),
  ('MZ032', 'Amoxicillin', 'Amoxicillin', 'tablet', '500mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ022', 'Ampicillin', 'Ampicillin', 'IV solution', '1000mg', 'intravenous', 'scheduled', true, NULL, NULL),
  ('MZ021', 'Ancef', 'Cefazolin', 'IV solution', '1000mg', 'intravenous', 'scheduled', true, NULL, NULL),
  ('MZ046', 'Cefazolin 700 mg IVPB (Pediatric)', 'Cefazolin', 'IV solution', '700 mg in 50 mL NS (IVPB)', 'intravenous', 'scheduled', true, NULL, 'Weight-based pediatric dose (25 mg/kg for 28 kg). Dilute in 50 mL 0.9% NaCl, infuse over 30 min via secondary (piggyback) tubing. Assess IV site before and during infusion.'),
  ('MZ036', 'Cephalexin', 'Cephalexin', 'tablet', '500mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ045', 'Dextrose 5% in 0.45% Sodium Chloride (D5 ½ NS)', 'D5 half normal saline', 'IV solution', 'D5 0.45% NaCl / 1000 mL bag', 'intravenous', 'continuous', true, NULL, 'Pediatric maintenance fluid. Rate per order (e.g., 65 mL/hr). Strict I&O; monitor urine output (target ≥ 1 mL/kg/hr).'),
  ('MZ041', 'Dimenhydrinate', 'Dimenhydrinate', 'injection', '50mg/ml', 'intramuscular', 'scheduled', true, NULL, NULL),
  ('MZ026', 'Docusate Sodium', 'Docusate Sodium', 'tablet', '100mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ025', 'Eliquis', 'Apixaban', 'tablet', '5mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ044', 'Fleet Enema (Pediatric)', 'Sodium phosphate enema', 'suppository', '66 mL pediatric', 'rectal', 'stat', true, NULL, 'Pediatric (ages 5-11) sodium phosphate enema, 66 mL. One-time dose for constipation. Left lateral/Sims position; explain at developmental level; document result.'),
  ('MZ039', 'Gabapentin', 'Gabapentin', 'tablet', '100mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ034', 'Humolog', 'Humolog', 'injection', '100 units/ml', 'subcutaneous', 'diabetic', true, NULL, NULL),
  ('MZ035', 'Lantus', 'Lantus', 'injection', '100 units/ml', 'subcutaneous', 'diabetic', true, NULL, NULL),
  ('MZ033', 'Lovenox', 'Enoxaparin', 'injection', '300mg/3ml', 'subcutaneous', 'scheduled', true, NULL, NULL),
  ('MZ024', 'Metoprolol', 'Metoprolol', 'tablet', '50mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ106', 'Novolin NPH (Insulin Isophane)', 'Insulin NPH', 'injection', '100 units/mL', 'subcutaneous', 'diabetic', true, NULL, 'Intermediate-acting insulin. Cloudy — roll gently to mix. Check blood glucose before dose. Independent double check. Pediatric T1DM: dose per order (e.g. 6–8 u BID 08:00/21:00).'),
  ('MZ027', 'Novorapid', 'Novorapid', 'injection', '100 units/ml', 'subcutaneous', 'diabetic', true, NULL, NULL),
  ('MZ023', 'Pantoloc', 'Pantoprozole', 'IV solution', '1000mg', 'intravenous', 'scheduled', true, NULL, NULL),
  ('MZ037', 'Paracetamol', 'Paracetamol', 'tablet', '1000mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ042', 'Prednisone', NULL, 'tablet', '20mg', 'oral', 'scheduled', true, NULL, NULL),
  ('MZ108', 'Qvar (Beclomethasone) MDI', 'Beclomethasone dipropionate', 'inhaler', '40 mcg/inhalation', 'inhalation', 'scheduled', true, NULL, 'Inhaled corticosteroid controller. Give AFTER bronchodilator (Ventolin). Use spacer/AeroChamber in pediatrics; rinse mouth after. Dose per order (1–2 puffs BID).'),
  ('MZ040', 'Rocephin', 'Ceftriaxone', 'IV solution', '2 gram', 'intravenous', 'scheduled', true, NULL, NULL),
  ('MZ043', 'Sodium Chloride 0.9% (Normal Saline)', 'Normal Saline', 'IV solution', '0.9% / 1000 mL bag', 'intravenous', 'continuous', true, NULL, 'Isotonic maintenance/replacement fluid. Rate per order (e.g., 50 mL/hr, 65 mL/hr). Pediatric: verify pump programming, trace tubing, label tubing, assess IV site hourly.'),
  ('MZ029', 'Ventolin', 'salbutamol', 'inhaler', '200 doses', 'inhalation', 'scheduled', true, NULL, NULL),
  ('MZ107', 'Vitamin K (Phytonadione) Neonatal', 'Phytonadione', 'injection', '1 mg/0.5 mL (neonatal)', 'intramuscular', 'stat', false, NULL, 'Newborn prophylaxis within 6 h of birth. IM vastus lateralis. Dose per order: 1 mg if ≥ 1500 g; 0.5 mg if < 1500 g. Parental consent/teaching.'),
  ('MZ031', 'Zofran', 'ondansetron', 'injection', '2mg/ml', 'subcutaneous', 'scheduled', true, NULL, NULL)
ON CONFLICT (barcode) DO NOTHING;

-- ============================================================================
-- Patient library
-- ============================================================================
-- Mirrors what create_patient_template() builds: a tenant of type
-- 'patient_template' plus a patient_templates row pointing at it, with the
-- patient itself living inside that tenant. The RPC cannot be called from a
-- seed because it requires auth.uid(), so the same rows are written directly.
--
-- A different case from the simulation patient on purpose -- post-operative
-- rather than respiratory -- so the library is visibly a library and not a
-- copy of the running simulation.

INSERT INTO public.tenants (id, name, subdomain, tenant_type, is_simulation, status) VALUES
  ('55555555-5555-5555-5555-555555555555', 'Post-Op Hip (Patient Template)',
   'pt-postophip-seed0001', 'patient_template', true, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_templates
  (id, tenant_id, name, description, primary_categories, status, created_by) VALUES
  ('c1000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555',
   'Post-Op Hip', 'Day 1 following total hip arthroplasty. Pain management, mobility and DVT prophylaxis.',
   ARRAY['PN'], 'ready', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients
  (id, patient_id, first_name, last_name, date_of_birth, gender, room_number, bed_number,
   admission_date, condition, diagnosis, allergies, blood_type, emergency_contact_name,
   emergency_contact_relationship, emergency_contact_phone, tenant_id) VALUES
  ('aa000000-0000-0000-0000-000000000002', 'PT-LIB-001', 'Harold', 'Whitfield',
   '1951-11-04', 'Male', '—', '—', '2026-09-22', 'Stable',
   'Total hip arthroplasty, post-operative day 1', ARRAY['Codeine'], 'B+',
   'Margaret Whitfield', 'Spouse', '555-0303', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patient_medications
  (patient_id, tenant_id, name, dosage, frequency, route, start_date,
   prescribed_by, next_due, status, category, admin_times) VALUES
  ('aa000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555',
   'Enoxaparin', '40 mg', 'Once daily', 'subcutaneous', '2026-09-22',
   'Dr. Nguyen', now() + interval '8 hours', 'Active', 'scheduled', '["21:00"]'::jsonb),
  ('aa000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555',
   'Hydromorphone', '1 mg', 'Every 4 hours PRN', 'oral', '2026-09-22',
   'Dr. Nguyen', now() + interval '1 hour', 'Active', 'prn', '[]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.patient_vitals
  (patient_id, tenant_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
   heart_rate, respiratory_rate, oxygen_saturation, oxygen_delivery, oxygen_flow_rate, recorded_at)
VALUES
  ('aa000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555',
   36.8, 128, 74, 82, 16, 97, 'Room Air', 'N/A', now() - interval '6 hours')
ON CONFLICT DO NOTHING;

SELECT 'Medication catalog and patient library loaded' AS status;
