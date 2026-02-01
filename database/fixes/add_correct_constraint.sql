-- ============================================================================
-- ADD CORRECT CHECK CONSTRAINT WITH ALL TENANT TYPES
-- ============================================================================

-- Add constraint that includes ALL existing types plus 'program'
ALTER TABLE tenants
ADD CONSTRAINT tenants_tenant_type_check 
CHECK (tenant_type IN (
  'production',
  'institution',
  'hospital',
  'clinic',
  'simulation_template',
  'simulation_active',
  'program'
));

-- Verify constraint was added
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'tenants'
  AND con.contype = 'c'
  AND con.conname = 'tenants_tenant_type_check';

-- Test: Try to insert BNAD program tenant
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
) ON CONFLICT DO NOTHING
RETURNING id, name, subdomain, tenant_type;
