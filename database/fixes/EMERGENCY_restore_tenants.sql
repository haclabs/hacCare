-- ============================================================================
-- EMERGENCY FIX: Restore All Tenant Types
-- ============================================================================

-- Drop the restrictive constraint I just added
ALTER TABLE tenants 
DROP CONSTRAINT IF EXISTS tenants_tenant_type_check;

-- Don't add any CHECK constraint - let the tenant_type column accept any value
-- The database will handle validation through other means

-- Verify all tenants are visible now
SELECT 
  id,
  name,
  tenant_type,
  status,
  created_at
FROM tenants
ORDER BY created_at;

-- Count tenants by type
SELECT 
  tenant_type,
  COUNT(*) as count
FROM tenants
GROUP BY tenant_type
ORDER BY count DESC;
