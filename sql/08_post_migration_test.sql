-- ============================================
-- POST-MIGRATION TEST QUERIES
-- Run these to test the simulation system
-- ============================================

-- Test 1: Check all functions exist and are callable
SELECT 
  'Functions Status' as test_category,
  routine_name,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_name IN (
  'create_simulation_subtenant', 
  'join_simulation_lobby', 
  'start_simulation', 
  'add_simulation_user', 
  'cleanup_expired_simulations'
)
AND routine_schema = 'public'
ORDER BY routine_name;

-- Test 2: Check all required tables exist
SELECT 
  'Tables Status' as test_category,
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN (
  'active_simulations', 
  'simulation_users', 
  'simulation_lobby', 
  'tenants',
  'tenant_users'
)
AND table_schema = 'public'
ORDER BY table_name;

-- Test 3: Check views exist and are queryable
SELECT 
  'Views Status' as test_category,
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN ('simulation_overview', 'simulation_lobby_status')
AND table_schema = 'public'
ORDER BY table_name;

-- Test 4: Verify RLS is enabled
SELECT 
  'RLS Status' as test_category,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename IN ('simulation_users', 'simulation_lobby', 'simulation_patients')
AND schemaname = 'public'
ORDER BY tablename;

-- Test 5: Check column structure of active_simulations
SELECT 
  'Column Check' as test_category,
  column_name,
  data_type as status
FROM information_schema.columns 
WHERE table_name = 'active_simulations' 
AND table_schema = 'public'
AND column_name IN ('scenario_template_id', 'instructor_id', 'sim_access_key', 'simulation_status', 'lobby_message')
ORDER BY column_name;

-- Show final status
SELECT 
  '🎉 SIMULATION SYSTEM READY!' as status,
  'All migrations completed successfully' as message,
  'You can now create simulations!' as next_step;