-- ============================================================================
-- RESTORE INSTRUCTOR ACCESS: Copy Group 1's users to Groups 2-5
-- ============================================================================
-- Problem: Groups 2-5 lost their instructor accounts, only have clsnurse now
-- Solution: Copy all 5 users from Group 1 to Groups 2-5
-- ============================================================================

DO $$
DECLARE
  v_group1_tenant_id uuid;
  v_user_record record;
  v_sim_record record;
BEGIN
  -- Get Group 1's tenant_id
  SELECT tenant_id INTO v_group1_tenant_id
  FROM simulation_active 
  WHERE name = 'CLS Testing - Group 1';
  
  RAISE NOTICE '📍 Group 1 tenant_id: %', v_group1_tenant_id;
  RAISE NOTICE '👥 Copying Group 1 users to Groups 2-5...';
  RAISE NOTICE '';
  
  -- For each simulation in Groups 2-5
  FOR v_sim_record IN 
    SELECT id, tenant_id, name 
    FROM simulation_active 
    WHERE name LIKE 'CLS Testing - Group %'
    AND name != 'CLS Testing - Group 1'
    ORDER BY name
  LOOP
    RAISE NOTICE '📍 Processing: %', v_sim_record.name;
    
    -- Copy all users from Group 1 to this group
    FOR v_user_record IN
      SELECT tu.user_id, u.email
      FROM tenant_users tu
      JOIN auth.users u ON u.id = tu.user_id
      WHERE tu.tenant_id = v_group1_tenant_id
    LOOP
      -- Add user to this tenant
      INSERT INTO tenant_users (tenant_id, user_id)
      VALUES (v_sim_record.tenant_id, v_user_record.user_id)
      ON CONFLICT (tenant_id, user_id) DO NOTHING;
      
      RAISE NOTICE '  ✅ Added %', v_user_record.email;
    END LOOP;
    
    RAISE NOTICE '  📊 Total users now: %', (
      SELECT COUNT(*) FROM tenant_users WHERE tenant_id = v_sim_record.tenant_id
    );
    RAISE NOTICE '';
    
  END LOOP;
  
  RAISE NOTICE '🎉 All instructors restored to Groups 2-5!';
  
END $$;

-- Verify all groups now have 5 users
SELECT 
  sa.name as simulation_name,
  (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = sa.tenant_id) as user_count,
  (SELECT string_agg(u.email, ', ' ORDER BY u.email) 
   FROM tenant_users tu 
   JOIN auth.users u ON u.id = tu.user_id 
   WHERE tu.tenant_id = sa.tenant_id) as users
FROM simulation_active sa
WHERE sa.name LIKE 'CLS Testing%'
ORDER BY sa.name;
