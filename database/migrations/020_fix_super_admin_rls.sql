-- =====================================================
-- FIX: Super Admin RLS Access to All Tenants
-- =====================================================
-- PROBLEM: Super admins can't access patients in simulation
-- template tenants because RLS policy requires them to be
-- in tenant_users OR user_tenant_access
-- 
-- SOLUTION: Check super_admin role FIRST, before checking
-- tenant assignments
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "patients_select_policy" ON patients;

-- Create new policy with super_admin check FIRST
CREATE POLICY "patients_select_policy" ON patients
FOR SELECT USING (
  -- ✅ FIRST: Super admins can access ALL patients in ALL tenants
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Regular tenant access via tenant_users
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patients.tenant_id
    AND is_active = true
  )
  OR
  -- Simulation tenant access (if function exists)
  has_simulation_tenant_access(patients.tenant_id)
);

-- Same fix for INSERT - Drop ALL possible insert policy names
DROP POLICY IF EXISTS "patients_simulation_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON patients;

CREATE POLICY "patients_insert_policy" ON patients
FOR INSERT WITH CHECK (
  -- Super admins can insert anywhere
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Regular users can insert in their assigned tenants
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patients.tenant_id
    AND is_active = true
  )
);

-- Same fix for UPDATE
DROP POLICY IF EXISTS "patients_simulation_update_policy" ON patients;

CREATE POLICY "patients_update_policy" ON patients
FOR UPDATE USING (
  -- Super admins can update anywhere
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Regular users can update in their assigned tenants
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patients.tenant_id
    AND is_active = true
  )
);

-- Same fix for DELETE
DROP POLICY IF EXISTS "patients_delete_policy" ON patients;

CREATE POLICY "patients_delete_policy" ON patients
FOR DELETE USING (
  -- Super admins can delete anywhere
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  -- Regular users can delete in their assigned tenants
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patients.tenant_id
    AND is_active = true
  )
);

-- =====================================================
-- Apply same fix to patient_medications
-- =====================================================

DROP POLICY IF EXISTS "patient_medications_select" ON patient_medications;
DROP POLICY IF EXISTS "medications_select_policy" ON patient_medications;

CREATE POLICY "patient_medications_select" ON patient_medications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patient_medications.tenant_id
    AND is_active = true
  )
);

CREATE POLICY "patient_medications_insert" ON patient_medications
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patient_medications.tenant_id
    AND is_active = true
  )
);

CREATE POLICY "patient_medications_update" ON patient_medications
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patient_medications.tenant_id
    AND is_active = true
  )
);

CREATE POLICY "patient_medications_delete" ON patient_medications
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = patient_medications.tenant_id
    AND is_active = true
  )
);

-- =====================================================
-- Apply same fix to other patient-related tables
-- =====================================================

-- Patient Vitals
DROP POLICY IF EXISTS "patient_vitals_access" ON patient_vitals;

CREATE POLICY "patient_vitals_select" ON patient_vitals
FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true)
  OR
  EXISTS (
    SELECT 1 FROM patients p
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id
    WHERE p.id = patient_vitals.patient_id
    AND tu.user_id = auth.uid()
    AND tu.is_active = true
  )
);

CREATE POLICY "patient_vitals_insert" ON patient_vitals
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true)
  OR
  EXISTS (
    SELECT 1 FROM patients p
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id
    WHERE p.id = patient_vitals.patient_id
    AND tu.user_id = auth.uid()
    AND tu.is_active = true
  )
);

CREATE POLICY "patient_vitals_update" ON patient_vitals
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true)
  OR
  EXISTS (
    SELECT 1 FROM patients p
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id
    WHERE p.id = patient_vitals.patient_id
    AND tu.user_id = auth.uid()
    AND tu.is_active = true
  )
);

CREATE POLICY "patient_vitals_delete" ON patient_vitals
FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true)
  OR
  EXISTS (
    SELECT 1 FROM patients p
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id
    WHERE p.id = patient_vitals.patient_id
    AND tu.user_id = auth.uid()
    AND tu.is_active = true
  )
);

-- Patient Notes
DROP POLICY IF EXISTS "patient_notes_access" ON patient_notes;

CREATE POLICY "patient_notes_all" ON patient_notes
FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true)
  OR
  EXISTS (
    SELECT 1 FROM patients p
    JOIN tenant_users tu ON tu.tenant_id = p.tenant_id
    WHERE p.id = patient_notes.patient_id
    AND tu.user_id = auth.uid()
    AND tu.is_active = true
  )
);

COMMENT ON POLICY "patients_select_policy" ON patients IS 
'Super admins can access all patients. Regular users can only access patients in their assigned tenants.';
