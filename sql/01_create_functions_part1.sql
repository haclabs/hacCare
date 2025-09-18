-- ============================================
-- PART 1: CREATE SIMULATION FUNCTIONS
-- Run this in Supabase Dashboard > SQL Editor
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