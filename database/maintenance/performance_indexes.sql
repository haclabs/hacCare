-- Add Performance Indexes to Speed Up Authentication Queries
-- Run this in Supabase SQL Editor to improve login performance

-- Index on user_profiles primary key (if not already indexed)
-- This speeds up the profile fetch by user ID
CREATE INDEX IF NOT EXISTS idx_user_profiles_id 
ON public.user_profiles(id);

-- Index on user_profiles email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON public.user_profiles(email);

-- Index on tenant_users for user_id lookups
-- This speeds up tenant assignment queries
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id 
ON public.tenant_users(user_id);

-- Index on tenant_users for tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id 
ON public.tenant_users(tenant_id);

-- Composite index for user_id + active status (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_user_tenant_active 
ON public.tenant_users(user_id, is_active) 
WHERE is_active = true;

-- Index on tenants primary key (if not already indexed)
CREATE INDEX IF NOT EXISTS idx_tenants_id 
ON public.tenants(id);

-- Index on tenants status for filtering (tenants use 'status', not 'is_active')
CREATE INDEX IF NOT EXISTS idx_tenants_status 
ON public.tenants(status) 
WHERE status = 'active';

-- Refresh the materialized view to ensure it's up to date
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_tenant_cache;

-- Add a comment explaining the performance optimization
COMMENT ON INDEX idx_user_profiles_id IS 'Speeds up user profile lookups during authentication';
COMMENT ON INDEX idx_user_tenant_active IS 'Optimizes tenant assignment queries for active users';

-- Analyze tables to update query planner statistics
ANALYZE public.user_profiles;
ANALYZE public.tenant_users;
ANALYZE public.tenants;

-- Show the results
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'tenant_users', 'tenants')
ORDER BY tablename, indexname;
