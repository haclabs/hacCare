-- =====================================================
-- FIX: User Tenant Cache for Super Admins
-- =====================================================
-- PROBLEM: user_tenant_cache has UNIQUE constraint on user_id
-- This prevents super admins from accessing multiple tenants
-- (one super admin can create/access multiple simulation templates)
-- 
-- ERROR: duplicate key value violates unique constraint 
-- "idx_user_tenant_cache_user_id"
-- 
-- SOLUTION: Change constraint from UNIQUE(user_id) to 
-- UNIQUE(user_id, tenant_id) to allow users in multiple tenants
-- =====================================================

-- Drop the existing unique constraint on user_id
DROP INDEX IF EXISTS idx_user_tenant_cache_user_id;

-- Create new composite unique constraint on (user_id, tenant_id)
-- This allows one user to be in multiple tenants (super admin use case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenant_cache_user_tenant 
ON user_tenant_cache(user_id, tenant_id);

-- Add regular index on user_id for query performance
CREATE INDEX IF NOT EXISTS idx_user_tenant_cache_user 
ON user_tenant_cache(user_id);

-- Add index on tenant_id for query performance
CREATE INDEX IF NOT EXISTS idx_user_tenant_cache_tenant 
ON user_tenant_cache(tenant_id);

COMMENT ON INDEX idx_user_tenant_cache_user_tenant IS 
'Allows users (especially super admins) to be cached for multiple tenants';
