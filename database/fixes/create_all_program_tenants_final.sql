-- ============================================================================
-- CREATE ALL 4 PROGRAM TENANTS (FINAL VERSION)
-- ============================================================================

-- Insert all 4 program tenants
INSERT INTO tenants (name, subdomain, tenant_type, parent_tenant_id, program_id, is_simulation, status, created_at)
SELECT 
  p.name || ' Program' as name,
  CASE 
    WHEN p.code = 'SIM Hub' THEN 'simhub'
    ELSE lower(regexp_replace(p.code, '[^a-zA-Z0-9]', '', 'g'))
  END as subdomain,
  'program' as tenant_type,
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid as parent_tenant_id,
  p.id as program_id,
  false as is_simulation,
  'active' as status,
  NOW() as created_at
FROM programs p
WHERE p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.program_id = p.id)
RETURNING id, name, subdomain, tenant_type;

-- Verify all program tenants created
SELECT 
  p.code as program_code,
  p.name as program_name,
  t.id as tenant_id,
  t.name as tenant_name,
  t.subdomain,
  t.tenant_type,
  t.status
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;
