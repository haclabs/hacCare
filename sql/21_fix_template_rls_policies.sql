-- Fix RLS policy for simulation_patient_templates to allow template creation
-- The issue was that RLS policies were too restrictive for template management

-- Re-enable RLS with proper policies
ALTER TABLE simulation_patient_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Tenant admins can manage patient templates" ON simulation_patient_templates;
DROP POLICY IF EXISTS "Tenant admins can manage scenario templates" ON scenario_templates;

-- Create more permissive policies for template management
-- Allow users who created the scenario template or are associated with the tenant
CREATE POLICY "Users can manage scenario templates" ON scenario_templates
FOR ALL USING (
  created_by = auth.uid()
  OR tenant_id IN (
    SELECT tenant_id FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'instructor', 'nurse')
  )
);

-- Allow users to manage patient templates for scenarios they have access to
CREATE POLICY "Users can manage patient templates" ON simulation_patient_templates
FOR ALL USING (
  scenario_template_id IN (
    SELECT id FROM scenario_templates st
    WHERE st.created_by = auth.uid()
    OR st.tenant_id IN (
      SELECT tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('admin', 'instructor', 'nurse')
    )
  )
);

-- Ensure authenticated users have necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON simulation_patient_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scenario_templates TO authenticated;

-- Also ensure the new template tables have proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_vitals_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_medications_templates TO authenticated; 
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_notes_templates TO authenticated;