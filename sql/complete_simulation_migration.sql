-- ============================================
-- COMPLETE SIMULATION MIGRATION - PART 2
-- Functions and Views (Tables already exist)
-- ============================================

-- ============================================
-- STEP 1: Create Functions
-- ============================================

-- Function to set up a simulation sub-tenant with lobby
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

  -- Update the active_simulation to reference this tenant and set to lobby
  UPDATE active_simulations 
  SET 
    tenant_id = v_subtenant_id,
    simulation_status = 'lobby',
    lobby_message = 'Welcome to ' || p_simulation_name || '. Please wait for the instructor to start the simulation.'
  WHERE id = p_simulation_id;

  RETURN v_subtenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add users to simulation
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

-- Function to join simulation lobby
CREATE OR REPLACE FUNCTION join_simulation_lobby(
  p_simulation_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_info RECORD;
BEGIN
  -- Get user info from simulation_users
  SELECT su.username, su.role, s.simulation_status, s.lobby_message
  INTO v_user_info
  FROM simulation_users su
  JOIN tenants t ON t.id = su.simulation_tenant_id
  JOIN active_simulations s ON s.id = t.simulation_id
  WHERE su.user_id = p_user_id AND s.id = p_simulation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not authorized for this simulation';
  END IF;

  -- Insert or update lobby presence
  INSERT INTO simulation_lobby (
    simulation_id,
    user_id,
    username,
    role,
    last_ping,
    status
  ) VALUES (
    p_simulation_id,
    p_user_id,
    v_user_info.username,
    v_user_info.role,
    NOW(),
    CASE 
      WHEN v_user_info.simulation_status = 'running' THEN 'in_simulation'
      ELSE 'waiting'
    END
  )
  ON CONFLICT (simulation_id, user_id) 
  DO UPDATE SET 
    last_ping = NOW(),
    status = CASE 
      WHEN v_user_info.simulation_status = 'running' THEN 'in_simulation'
      ELSE 'waiting'
    END;

  -- Return simulation status and lobby info
  RETURN jsonb_build_object(
    'simulation_status', v_user_info.simulation_status,
    'lobby_message', v_user_info.lobby_message,
    'user_role', v_user_info.role,
    'can_start_simulation', v_user_info.role = 'instructor'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to start simulation (instructor only)
CREATE OR REPLACE FUNCTION start_simulation(
  p_simulation_id UUID,
  p_instructor_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_instructor BOOLEAN := FALSE;
BEGIN
  -- Check if user is instructor for this simulation
  SELECT EXISTS(
    SELECT 1 FROM simulation_users su
    JOIN tenants t ON t.id = su.simulation_tenant_id
    WHERE su.user_id = p_instructor_id 
    AND t.simulation_id = p_simulation_id
    AND su.role = 'instructor'
  ) INTO v_is_instructor;

  IF NOT v_is_instructor THEN
    RAISE EXCEPTION 'Only instructors can start simulations';
  END IF;

  -- Update simulation status
  UPDATE active_simulations 
  SET 
    simulation_status = 'running',
    lobby_message = 'Simulation is now active!',
    instructor_id = p_instructor_id,
    start_time = NOW()
  WHERE id = p_simulation_id;

  -- Update all lobby users to in_simulation
  UPDATE simulation_lobby 
  SET status = 'in_simulation'
  WHERE simulation_id = p_simulation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup simulation tenants
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
    
    -- Delete lobby and user data
    DELETE FROM simulation_lobby WHERE simulation_id = v_tenant_record.simulation_id;
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

-- ============================================
-- STEP 2: Create RLS Policies
-- ============================================

-- Enable RLS on simulation tables (if not already enabled)
ALTER TABLE simulation_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_lobby ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users see own simulation data" ON simulation_users;
DROP POLICY IF EXISTS "Simulation participants see lobby" ON simulation_lobby;
DROP POLICY IF EXISTS "Simulation users see simulation patients" ON simulation_patients;
DROP POLICY IF EXISTS "Simulation users cannot see regular patients" ON patients;

-- Simulation users can only see their own simulation data
CREATE POLICY "Users see own simulation data" 
ON simulation_users 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid());

-- Lobby access for simulation participants
CREATE POLICY "Simulation participants see lobby" 
ON simulation_lobby 
FOR ALL 
TO authenticated 
USING (
  simulation_id IN (
    SELECT s.id 
    FROM active_simulations s 
    JOIN tenants t ON t.simulation_id = s.id
    JOIN tenant_users tu ON tu.tenant_id = t.id 
    WHERE tu.user_id = auth.uid()
  )
);

-- Patients in simulation tenants only see simulation_patients data
CREATE POLICY "Simulation users see simulation patients" 
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
CREATE POLICY "Simulation users cannot see regular patients" 
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

-- ============================================
-- STEP 3: Create Views
-- ============================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS simulation_overview;
DROP VIEW IF EXISTS simulation_lobby_status;

-- Simulation overview with lobby info
CREATE VIEW simulation_overview AS
SELECT 
  t.id as tenant_id,
  t.name as simulation_name,
  s.id as simulation_id,
  s.session_name,
  s.status,
  s.simulation_status,
  s.lobby_message,
  s.start_time,
  s.end_time,
  COUNT(DISTINCT su.id) as total_users,
  COUNT(DISTINCT sl.id) as lobby_users,
  COUNT(DISTINCT sp.id) as patient_count
FROM tenants t
JOIN active_simulations s ON s.id = t.simulation_id
LEFT JOIN simulation_users su ON su.simulation_tenant_id = t.id
LEFT JOIN simulation_lobby sl ON sl.simulation_id = s.id AND sl.status = 'waiting'
LEFT JOIN simulation_patients sp ON sp.active_simulation_id = s.id
WHERE t.tenant_type = 'simulation'
GROUP BY t.id, t.name, s.id, s.session_name, s.status, s.simulation_status, s.lobby_message, s.start_time, s.end_time;

-- Active lobby users view
CREATE VIEW simulation_lobby_status AS
SELECT 
  sl.simulation_id,
  s.session_name,
  s.simulation_status,
  s.lobby_message,
  sl.user_id,
  sl.username,
  sl.role,
  sl.status,
  sl.joined_at,
  sl.last_ping,
  CASE 
    WHEN sl.last_ping > NOW() - INTERVAL '2 minutes' THEN 'online'
    ELSE 'offline'
  END as online_status
FROM simulation_lobby sl
JOIN active_simulations s ON s.id = sl.simulation_id
WHERE sl.last_ping > NOW() - INTERVAL '10 minutes' -- Only show recent activity
ORDER BY sl.role, sl.joined_at;

-- ============================================
-- STEP 4: Add Comments
-- ============================================

COMMENT ON TABLE simulation_users IS 'Tracks users assigned to specific simulation tenants';
COMMENT ON TABLE simulation_lobby IS 'Tracks real-time user presence in simulation lobby';
COMMENT ON FUNCTION create_simulation_subtenant IS 'Creates a new sub-tenant for a simulation with isolated data and lobby';
COMMENT ON FUNCTION add_simulation_user IS 'Adds a user to a simulation sub-tenant with appropriate permissions';
COMMENT ON FUNCTION join_simulation_lobby IS 'Registers user presence in simulation lobby and returns status';
COMMENT ON FUNCTION start_simulation IS 'Starts simulation (instructor only) and moves all users from lobby to active';
COMMENT ON FUNCTION cleanup_expired_simulations IS 'Removes expired simulation tenants and their data';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_simulation_subtenant', 'join_simulation_lobby', 'start_simulation', 'add_simulation_user', 'cleanup_expired_simulations')
AND routine_schema = 'public';

-- Verify views were created
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('simulation_overview', 'simulation_lobby_status')
AND table_schema = 'public';

-- Test the views work
SELECT 'simulation_overview test' as test, COUNT(*) as count FROM simulation_overview;
SELECT 'simulation_lobby_status test' as test, COUNT(*) as count FROM simulation_lobby_status;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================

SELECT 'MIGRATION COMPLETED SUCCESSFULLY!' as status,
       'You can now use the SimulationSubTenantService' as next_step;