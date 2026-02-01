-- ============================================================================
-- FIX: Remove "Program" from All Program Tenant Names
-- ============================================================================

-- Update tenant names to remove " Program" suffix
UPDATE tenants
SET name = REGEXP_REPLACE(name, ' Program$', '')
WHERE tenant_type = 'program'
  AND name LIKE '% Program';

-- Verify the fix
SELECT 
  p.code as program_code,
  t.name as tenant_name,
  t.subdomain,
  t.tenant_type
FROM programs p
JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;
