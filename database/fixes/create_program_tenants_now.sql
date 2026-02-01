-- ============================================================================
-- MANUALLY CREATE PROGRAM TENANTS - SIMPLE VERSION
-- ============================================================================
-- Run this to create the 4 program tenants for BNAD, NESA, PN, SIM Hub
-- ============================================================================

-- Create program tenant for BNAD
SELECT create_program_tenant(
  (SELECT id FROM programs WHERE code = 'BNAD'),
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
) as bnad_result;

-- Create program tenant for NESA
SELECT create_program_tenant(
  (SELECT id FROM programs WHERE code = 'NESA'),
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
) as nesa_result;

-- Create program tenant for PN
SELECT create_program_tenant(
  (SELECT id FROM programs WHERE code = 'PN'),
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
) as pn_result;

-- Create program tenant for SIM Hub
SELECT create_program_tenant(
  (SELECT id FROM programs WHERE code = 'SIM Hub'),
  '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
) as sim_hub_result;

-- Verify results
SELECT 
  p.code as program_code,
  p.name as program_name,
  t.name as tenant_name,
  t.subdomain,
  t.tenant_type,
  t.status,
  (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id) as user_count
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;
