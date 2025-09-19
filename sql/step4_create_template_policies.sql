-- Step 4: Create RLS policies for template tables
-- These policies allow users with appropriate tenant permissions to manage templates

-- Policies for vitals templates
CREATE POLICY "Users can manage vitals templates" ON patient_vitals_templates
FOR ALL USING (
  patient_template_id IN (
    SELECT pt.id FROM simulation_patient_templates pt
    JOIN scenario_templates st ON pt.scenario_template_id = st.id
    WHERE st.created_by = auth.uid()
    OR st.tenant_id IN (
      SELECT tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('admin', 'instructor', 'nurse')
    )
  )
);

-- Policies for medications templates  
CREATE POLICY "Users can manage medications templates" ON patient_medications_templates
FOR ALL USING (
  patient_template_id IN (
    SELECT pt.id FROM simulation_patient_templates pt
    JOIN scenario_templates st ON pt.scenario_template_id = st.id
    WHERE st.created_by = auth.uid()
    OR st.tenant_id IN (
      SELECT tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('admin', 'instructor', 'nurse')
    )
  )
);

-- Policies for notes templates
CREATE POLICY "Users can manage notes templates" ON patient_notes_templates
FOR ALL USING (
  patient_template_id IN (
    SELECT pt.id FROM simulation_patient_templates pt
    JOIN scenario_templates st ON pt.scenario_template_id = st.id
    WHERE st.created_by = auth.uid()
    OR st.tenant_id IN (
      SELECT tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('admin', 'instructor', 'nurse')
    )
  )
);