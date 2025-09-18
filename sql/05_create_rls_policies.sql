-- ============================================
-- PART 5: CREATE RLS POLICIES
-- Run this in Supabase Dashboard > SQL Editor
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