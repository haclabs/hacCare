-- Performance Indexes for hacCare RLS Policies
-- Run these separately for optimal performance (CONCURRENTLY option)
-- These must be run outside of transaction blocks

-- Index for tenant_users lookups (most common RLS pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_users_user_tenant_active 
ON tenant_users (user_id, tenant_id, is_active) 
WHERE is_active = true;

-- Index for user_profiles role checks (super_admin verification)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role_active 
ON user_profiles (id, role, is_active) 
WHERE is_active = true;

-- Index for simulation-related lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulation_users_user_tenant 
ON simulation_users (user_id, simulation_tenant_id);

-- Additional useful indexes for RLS performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_tenant_id
ON patients (tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id
ON user_sessions (user_id);

-- Verify indexes were created
SELECT 
    schemaname,
    tablename, 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;