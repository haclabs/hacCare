-- ===============================================
-- SIMULATION RLS POLICIES  
-- ===============================================
-- Multi-tenant security policies for the new simulation system

-- Helper function to get current user's tenant access
CREATE OR REPLACE FUNCTION get_user_simulation_tenant_access()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE
    -- Super admin can access any tenant
    WHEN EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    ) THEN NULL -- NULL means access all tenants
    
    -- Regular users only access their assigned tenant
    ELSE (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      LIMIT 1
    )
  END;
$$;

-- ===============================================
-- TEMPLATE POLICIES
-- ===============================================
ALTER TABLE sim_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_templates_access ON sim_templates
FOR ALL USING (
  -- Super admin can access all templates
  get_user_simulation_tenant_access() IS NULL
  OR 
  -- Regular users can access templates from their tenant
  tenant_id = get_user_simulation_tenant_access()
);

-- Template patients inherit template access
ALTER TABLE sim_template_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_template_patients_access ON sim_template_patients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_templates st
    WHERE st.id = sim_template_patients.template_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

-- Template meds inherit template access  
ALTER TABLE sim_template_meds ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_template_meds_access ON sim_template_meds
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_templates st
    WHERE st.id = sim_template_meds.template_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

-- Template barcodes inherit template access
ALTER TABLE sim_template_barcodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_template_barcodes_access ON sim_template_barcodes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_templates st
    WHERE st.id = sim_template_barcodes.template_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

-- ===============================================
-- SNAPSHOT POLICIES  
-- ===============================================
ALTER TABLE sim_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_snapshots_access ON sim_snapshots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_templates st
    WHERE st.id = sim_snapshots.template_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

-- ===============================================
-- RUN POLICIES
-- ===============================================
ALTER TABLE sim_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_runs_access ON sim_runs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_snapshots ss
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE ss.id = sim_runs.snapshot_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

-- ===============================================
-- RUN ENTITY POLICIES (patients, barcodes)
-- ===============================================
ALTER TABLE sim_run_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_run_patients_access ON sim_run_patients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = sim_run_patients.run_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

ALTER TABLE sim_run_barcode_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_run_barcode_pool_access ON sim_run_barcode_pool
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id  
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = sim_run_barcode_pool.run_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

-- ===============================================
-- EVENT TABLE POLICIES (vitals, meds, alerts, notes)
-- ===============================================
ALTER TABLE sim_run_vitals_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_run_vitals_events_access ON sim_run_vitals_events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = sim_run_vitals_events.run_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

ALTER TABLE sim_run_med_admin_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_run_med_admin_events_access ON sim_run_med_admin_events
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = sim_run_med_admin_events.run_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

ALTER TABLE sim_run_alert_acks ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_run_alert_acks_access ON sim_run_alert_acks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = sim_run_alert_acks.run_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

ALTER TABLE sim_run_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_run_notes_access ON sim_run_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = sim_run_notes.run_id
    AND (
      get_user_simulation_tenant_access() IS NULL
      OR st.tenant_id = get_user_simulation_tenant_access()
    )
  )
);

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================
-- Allow authenticated users to access simulation functions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===============================================
-- COMMENTS
-- ===============================================
COMMENT ON FUNCTION get_user_simulation_tenant_access() IS 'Returns NULL for super_admin (access all tenants) or tenant_id for regular users';