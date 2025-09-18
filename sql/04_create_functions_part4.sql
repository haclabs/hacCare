-- ============================================
-- PART 4: CREATE START AND CLEANUP FUNCTIONS
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

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