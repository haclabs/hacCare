-- ============================================
-- PART 7: VERIFICATION QUERIES
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_simulation_subtenant', 'join_simulation_lobby', 'start_simulation', 'add_simulation_user', 'cleanup_expired_simulations')
AND routine_schema = 'public'
ORDER BY routine_name;

-- Verify views were created
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('simulation_overview', 'simulation_lobby_status')
AND table_schema = 'public'
ORDER BY table_name;

-- Test the views work
SELECT 'simulation_overview test' as test, COUNT(*) as count FROM simulation_overview;
SELECT 'simulation_lobby_status test' as test, COUNT(*) as count FROM simulation_lobby_status;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('simulation_users', 'simulation_lobby', 'simulation_patients')
AND schemaname = 'public';

-- Show a success message
SELECT 'MIGRATION COMPLETED SUCCESSFULLY!' as status,
       'You can now use the SimulationSubTenantService' as next_step;