-- ============================================================================
-- MANUAL INSERT: Bypass Function and Create Tenants Directly
-- ============================================================================

-- Insert BNAD Program Tenant
INSERT INTO tenants (
  name,
  subdomain,
  tenant_type,
  parent_tenant_id,
  program_id,
  is_simulation,
  status,
  created_at
) VALUES (
  'BNAD Program',
  'bnad',
  'program',
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
  (SELECT id FROM programs WHERE code = 'BNAD'),
  false,
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insert NESA Program Tenant
INSERT INTO tenants (
  name,
  subdomain,
  tenant_type,
  parent_tenant_id,
  program_id,
  is_simulation,
  status,
  created_at
) VALUES (
  'NESA Program',
  'nesa',
  'program',
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
  (SELECT id FROM programs WHERE code = 'NESA'),
  false,
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insert Practical Nursing Program Tenant
INSERT INTO tenants (
  name,
  subdomain,
  tenant_type,
  parent_tenant_id,
  program_id,
  is_simulation,
  status,
  created_at
) VALUES (
  'Practical Nursing Program',
  'pn',
  'program',
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
  (SELECT id FROM programs WHERE code = 'PN'),
  false,
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Insert SIM Hub Program Tenant
INSERT INTO tenants (
  name,
  subdomain,
  tenant_type,
  parent_tenant_id,
  program_id,
  is_simulation,
  status,
  created_at
) VALUES (
  'Simulation Hub Program',
  'simhub',
  'program',
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid,
  (SELECT id FROM programs WHERE code = 'SIM Hub'),
  false,
  'active',
  NOW()
) ON CONFLICT DO NOTHING;

-- Verify results
SELECT 
  p.code as program_code,
  p.name as program_name,
  t.id as tenant_id,
  t.name as tenant_name,
  t.subdomain,
  t.tenant_type,
  t.status,
  t.parent_tenant_id
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;
