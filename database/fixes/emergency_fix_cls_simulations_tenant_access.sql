-- ============================================================================
-- EMERGENCY FIX: Give clsnurse access to CLS Testing simulation tenant data
-- ============================================================================
-- Problem: Simulations 2-5 were created with clsnurse1-5 accounts
--          Changed participants to all use 'clsnurse' but patient data
--          still belongs to old tenant IDs that clsnurse can't access
-- 
-- Solution: Add clsnurse's user_id to the tenant access for all CLS sims
-- ============================================================================

-- Step 1: Find clsnurse's user_id
DO $$
DECLARE
  v_clsnurse_user_id uuid;
  v_sim_record record;
  v_tenant_id uuid;
BEGIN
  -- Get clsnurse user_id
  SELECT id INTO v_clsnurse_user_id
  FROM auth.users
  WHERE email = 'clsnurse@lethpolytech.ca';
  
  IF v_clsnurse_user_id IS NULL THEN
    RAISE EXCEPTION 'clsnurse user not found';
  END IF;
  
  RAISE NOTICE 'Found clsnurse user_id: %', v_clsnurse_user_id;
  
  -- For each CLS Testing simulation
  FOR v_sim_record IN 
    SELECT id, tenant_id, name 
    FROM simulation_active 
    WHERE name LIKE 'CLS Testing%'
  LOOP
    RAISE NOTICE 'Processing: % (tenant_id: %)', v_sim_record.name, v_sim_record.tenant_id;
    
    -- Check if clsnurse already has access to this tenant
    IF NOT EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE tenant_id = v_sim_record.tenant_id 
      AND user_id = v_clsnurse_user_id
    ) THEN
      -- Add clsnurse to this tenant (use default 'viewer' role or try without specifying)
      INSERT INTO tenant_users (tenant_id, user_id)
      VALUES (v_sim_record.tenant_id, v_clsnurse_user_id)
      ON CONFLICT (tenant_id, user_id) DO NOTHING;
      
      RAISE NOTICE '  ✅ Added clsnurse access to tenant %', v_sim_record.tenant_id;
    ELSE
      RAISE NOTICE '  ℹ️  clsnurse already has access to tenant %', v_sim_record.tenant_id;
    END IF;
    
    -- Verify patient access
    RAISE NOTICE '  📊 Patients in this tenant: %', (
      SELECT COUNT(*) FROM patients WHERE tenant_id = v_sim_record.tenant_id
    );
    
  END LOOP;
  
  RAISE NOTICE '🎉 Emergency fix complete! clsnurse now has access to all CLS Testing simulation data.';
  
END $$;

-- Verify the fix
SELECT 
  sa.name as simulation_name,
  sa.tenant_id,
  (SELECT COUNT(*) FROM patients WHERE tenant_id = sa.tenant_id) as patient_count,
  (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = sa.tenant_id) as user_count
FROM simulation_active sa
WHERE sa.name LIKE 'CLS Testing%'
ORDER BY sa.name;
