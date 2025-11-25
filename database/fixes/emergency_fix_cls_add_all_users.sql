-- ============================================================================
-- EMERGENCY FIX PART 2: Add ALL clsnurse accounts to ALL CLS simulation tenants
-- ============================================================================
-- Problem: Each group needs access to all 5 clsnurse accounts (clsnurse, clsnurse1-4)
--          so any student can log into any group
-- ============================================================================

DO $$
DECLARE
  v_user_record record;
  v_sim_record record;
BEGIN
  RAISE NOTICE '🔄 Adding all clsnurse accounts to all CLS Testing simulations...';
  
  -- For each CLS Testing simulation
  FOR v_sim_record IN 
    SELECT id, tenant_id, name 
    FROM simulation_active 
    WHERE name LIKE 'CLS Testing%'
    ORDER BY name
  LOOP
    RAISE NOTICE '📍 Processing: %', v_sim_record.name;
    
    -- Add all clsnurse accounts (clsnurse, clsnurse1, clsnurse2, clsnurse3, clsnurse4)
    FOR v_user_record IN
      SELECT id, email
      FROM auth.users
      WHERE email IN (
        'clsnurse@lethpolytech.ca',
        'clsnurse1@lethpolytech.ca', 
        'clsnurse2@lethpolytech.ca',
        'clsnurse3@lethpolytech.ca',
        'clsnurse4@lethpolytech.ca'
      )
    LOOP
      -- Add user to tenant if not already there
      INSERT INTO tenant_users (tenant_id, user_id)
      VALUES (v_sim_record.tenant_id, v_user_record.id)
      ON CONFLICT (tenant_id, user_id) DO NOTHING;
      
      RAISE NOTICE '  ✅ Added % to tenant', v_user_record.email;
    END LOOP;
    
    RAISE NOTICE '  📊 Total users in tenant: %', (
      SELECT COUNT(*) FROM tenant_users WHERE tenant_id = v_sim_record.tenant_id
    );
    RAISE NOTICE '';
    
  END LOOP;
  
  RAISE NOTICE '🎉 All clsnurse accounts now have access to all CLS Testing simulations!';
  
END $$;

-- Verify all groups now have 5 users
SELECT 
  sa.name as simulation_name,
  sa.tenant_id,
  (SELECT COUNT(*) FROM patients WHERE tenant_id = sa.tenant_id) as patient_count,
  (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = sa.tenant_id) as user_count
FROM simulation_active sa
WHERE sa.name LIKE 'CLS Testing%'
ORDER BY sa.name;
