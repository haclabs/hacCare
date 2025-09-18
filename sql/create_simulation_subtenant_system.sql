-- Simulation Sub-Tenant System
-- This creates a sub-tenant architecture for simulations where each simulation
-- gets its own tenant with dedicated users who only see simulation data

-- 1. Add simulation-specific fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id),
ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'institution' CHECK (tenant_type IN ('institution', 'simulation')),
ADD COLUMN IF NOT EXISTS simulation_id UUID REFERENCES active_simulations(id),
ADD COLUMN IF NOT EXISTS auto_cleanup_at TIMESTAMP; -- For automatic simulation cleanup

-- 2. Create simulation users table for managing simulation-specific users
CREATE TABLE IF NOT EXISTS simulation_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username TEXT NOT NULL, -- e.g., "student1", "nurse_sarah"
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'nurse')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(simulation_tenant_id, username)
);

-- 3. Create function to set up a simulation sub-tenant
CREATE OR REPLACE FUNCTION create_simulation_subtenant(
  p_simulation_id UUID,
  p_simulation_name TEXT,
  p_parent_tenant_id UUID
) RETURNS UUID AS $$
DECLARE
  v_subtenant_id UUID;
BEGIN
  -- Create the simulation sub-tenant
  INSERT INTO tenants (
    id,
    name,
    parent_tenant_id,
    tenant_type,
    simulation_id,
    auto_cleanup_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Simulation: ' || p_simulation_name,
    p_parent_tenant_id,
    'simulation',
    p_simulation_id,
    NOW() + INTERVAL '24 hours', -- Auto-cleanup after 24 hours
    NOW(),
    NOW()
  ) RETURNING id INTO v_subtenant_id;

  -- Update the active_simulation to reference this tenant
  UPDATE active_simulations 
  SET tenant_id = v_subtenant_id 
  WHERE id = p_simulation_id;

  RETURN v_subtenant_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to add users to simulation
CREATE OR REPLACE FUNCTION add_simulation_user(
  p_simulation_tenant_id UUID,
  p_email TEXT,
  p_username TEXT,
  p_role TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create auth user if password provided, otherwise assume user exists
  IF p_password IS NOT NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW()
    ) RETURNING id INTO v_user_id;
  ELSE
    -- Find existing user by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'User with email % not found', p_email;
    END IF;
  END IF;

  -- Add user to simulation tenant
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    permissions,
    created_at
  ) VALUES (
    p_simulation_tenant_id,
    v_user_id,
    p_role,
    CASE 
      WHEN p_role = 'nurse' THEN '["read_patients", "write_patients", "read_medications", "write_medications", "read_vitals", "write_vitals"]'::jsonb
      WHEN p_role = 'student' THEN '["read_patients", "read_medications", "read_vitals"]'::jsonb
      WHEN p_role = 'instructor' THEN '["admin"]'::jsonb
      ELSE '["read_patients"]'::jsonb
    END,
    NOW()
  );

  -- Add to simulation_users tracking table
  INSERT INTO simulation_users (
    simulation_tenant_id,
    user_id,
    username,
    role
  ) VALUES (
    p_simulation_tenant_id,
    v_user_id,
    p_username,
    p_role
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to cleanup simulation tenants
CREATE OR REPLACE FUNCTION cleanup_expired_simulations() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_tenant_record RECORD;
BEGIN
  -- Find expired simulation tenants
  FOR v_tenant_record IN 
    SELECT t.id, t.simulation_id 
    FROM tenants t 
    WHERE t.tenant_type = 'simulation' 
    AND t.auto_cleanup_at < NOW()
  LOOP
    -- Delete simulation data
    DELETE FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id;
    DELETE FROM simulation_patient_vitals WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    DELETE FROM simulation_patient_medications WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    DELETE FROM simulation_patient_notes WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    
    -- Delete tenant users
    DELETE FROM tenant_users WHERE tenant_id = v_tenant_record.id;
    DELETE FROM simulation_users WHERE simulation_tenant_id = v_tenant_record.id;
    
    -- Delete the simulation and tenant
    DELETE FROM active_simulations WHERE id = v_tenant_record.simulation_id;
    DELETE FROM tenants WHERE id = v_tenant_record.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Add RLS policies for simulation sub-tenants
-- Patients in simulation tenants only see simulation_patients data
CREATE POLICY IF NOT EXISTS "Simulation users see simulation patients" 
ON simulation_patients 
FOR ALL 
TO authenticated 
USING (
  active_simulation_id IN (
    SELECT s.id 
    FROM active_simulations s 
    JOIN tenant_users tu ON tu.tenant_id = s.tenant_id 
    WHERE tu.user_id = auth.uid()
  )
);

-- Regular patients table is filtered out for simulation tenant users
CREATE POLICY IF NOT EXISTS "Simulation users cannot see regular patients" 
ON patients 
FOR ALL 
TO authenticated 
USING (
  NOT EXISTS (
    SELECT 1 FROM tenant_users tu 
    JOIN tenants t ON t.id = tu.tenant_id 
    WHERE tu.user_id = auth.uid() 
    AND t.tenant_type = 'simulation'
  )
);

-- Enable RLS on simulation tables
ALTER TABLE simulation_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_notes ENABLE ROW LEVEL SECURITY;

-- 7. Create helper views
CREATE OR REPLACE VIEW simulation_overview AS
SELECT 
  t.id as tenant_id,
  t.name as simulation_name,
  s.id as simulation_id,
  s.session_name,
  s.status,
  s.start_time,
  s.end_time,
  COUNT(su.id) as user_count,
  COUNT(sp.id) as patient_count
FROM tenants t
JOIN active_simulations s ON s.id = t.simulation_id
LEFT JOIN simulation_users su ON su.simulation_tenant_id = t.id
LEFT JOIN simulation_patients sp ON sp.active_simulation_id = s.id
WHERE t.tenant_type = 'simulation'
GROUP BY t.id, t.name, s.id, s.session_name, s.status, s.start_time, s.end_time;

COMMENT ON TABLE simulation_users IS 'Tracks users assigned to specific simulation tenants';
COMMENT ON FUNCTION create_simulation_subtenant IS 'Creates a new sub-tenant for a simulation with isolated data';
COMMENT ON FUNCTION add_simulation_user IS 'Adds a user to a simulation sub-tenant with appropriate permissions';
COMMENT ON FUNCTION cleanup_expired_simulations IS 'Removes expired simulation tenants and their data';