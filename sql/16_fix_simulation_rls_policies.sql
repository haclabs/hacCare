-- Fix RLS policies for simulation system
-- This ensures proper security while allowing admin access and simulation functionality

-- First, create RLS policies for simulation template tables
-- These should be accessible to admins/instructors for managing templates

-- 1. Scenario Templates - Accessible to tenant admins
DROP POLICY IF EXISTS "Tenant admins can manage scenario templates" ON scenario_templates;
CREATE POLICY "Tenant admins can manage scenario templates" ON scenario_templates
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'instructor')
  )
);

-- 2. Simulation Patient Templates - Accessible to tenant admins
DROP POLICY IF EXISTS "Tenant admins can manage patient templates" ON simulation_patient_templates;
CREATE POLICY "Tenant admins can manage patient templates" ON simulation_patient_templates
FOR ALL USING (
  scenario_template_id IN (
    SELECT st.id FROM scenario_templates st
    JOIN tenant_users tu ON tu.tenant_id = st.tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'instructor')
  )
);

-- 3. Simulation Vitals Templates - Accessible to tenant admins
DROP POLICY IF EXISTS "Tenant admins can manage vitals templates" ON simulation_vitals_templates;
CREATE POLICY "Tenant admins can manage vitals templates" ON simulation_vitals_templates
FOR ALL USING (
  patient_template_id IN (
    SELECT spt.id FROM simulation_patient_templates spt
    JOIN scenario_templates st ON st.id = spt.scenario_template_id
    JOIN tenant_users tu ON tu.tenant_id = st.tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'instructor')
  )
);

-- 4. Simulation Medications Templates - Accessible to tenant admins
DROP POLICY IF EXISTS "Tenant admins can manage medications templates" ON simulation_medications_templates;
CREATE POLICY "Tenant admins can manage medications templates" ON simulation_medications_templates
FOR ALL USING (
  patient_template_id IN (
    SELECT spt.id FROM simulation_patient_templates spt
    JOIN scenario_templates st ON st.id = spt.scenario_template_id
    JOIN tenant_users tu ON tu.tenant_id = st.tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'instructor')
  )
);

-- 5. Simulation Notes Templates - Accessible to tenant admins
DROP POLICY IF EXISTS "Tenant admins can manage notes templates" ON simulation_notes_templates;
CREATE POLICY "Tenant admins can manage notes templates" ON simulation_notes_templates
FOR ALL USING (
  patient_template_id IN (
    SELECT spt.id FROM simulation_patient_templates spt
    JOIN scenario_templates st ON st.id = spt.scenario_template_id
    JOIN tenant_users tu ON tu.tenant_id = st.tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'instructor')
  )
);

-- 6. Fix simulation_users policy to allow admins to see all simulation users
DROP POLICY IF EXISTS "Users see own simulation data" ON simulation_users;
DROP POLICY IF EXISTS "Admins can manage simulation users" ON simulation_users;

CREATE POLICY "Admins can manage simulation users" ON simulation_users
FOR ALL USING (
  simulation_tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN tenant_users tu ON tu.tenant_id = t.parent_tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'instructor')
    AND t.tenant_type = 'simulation'
  )
);

-- Also allow simulation users to see their own data
CREATE POLICY "Simulation users see own data" ON simulation_users
FOR SELECT USING (
  user_id = auth.uid() OR
  simulation_tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN tenant_users tu ON tu.tenant_id = t.parent_tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'instructor')
    AND t.tenant_type = 'simulation'
  )
);

-- 7. Fix simulation patients policy to allow proper access
DROP POLICY IF EXISTS "Simulation users see simulation patients" ON simulation_patients;
CREATE POLICY "Simulation users see simulation patients" ON simulation_patients
FOR ALL USING (
  -- Admin/instructor access through parent tenant
  active_simulation_id IN (
    SELECT t.simulation_id FROM tenants t
    JOIN tenant_users tu ON tu.tenant_id = t.parent_tenant_id
    WHERE tu.user_id = auth.uid() 
    AND tu.role IN ('admin', 'instructor')
    AND t.tenant_type = 'simulation'
  ) OR
  -- Simulation user access through simulation tenant
  active_simulation_id IN (
    SELECT t.simulation_id FROM tenants t
    JOIN simulation_users su ON su.simulation_tenant_id = t.id
    WHERE su.user_id = auth.uid()
    AND t.tenant_type = 'simulation'
  )
);

-- 8. Update active_simulations policy
DROP POLICY IF EXISTS "Users can access their simulations" ON active_simulations;
CREATE POLICY "Users can access their simulations" ON active_simulations
FOR ALL USING (
  -- Admin/instructor access
  tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'instructor')
  ) OR
  -- Simulation user access
  id IN (
    SELECT t.simulation_id FROM tenants t
    JOIN simulation_users su ON su.simulation_tenant_id = t.id
    WHERE su.user_id = auth.uid()
    AND t.tenant_type = 'simulation'
  )
);

-- Grant necessary permissions for RPC functions
GRANT EXECUTE ON FUNCTION instantiate_simulation_patients(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_simulation_to_template(UUID) TO authenticated;

RAISE NOTICE 'RLS policies updated for simulation system security';