-- ============================================================================
-- FIX: Drop and Recreate tenant_type Check Constraint
-- ============================================================================

-- 1. Find the current check constraint
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'tenants'
  AND con.contype = 'c'
  AND con.conname LIKE '%tenant_type%';

-- 2. Drop the old constraint
ALTER TABLE tenants 
DROP CONSTRAINT IF EXISTS tenants_tenant_type_check;

-- 3. Add new constraint with 'program' included
ALTER TABLE tenants
ADD CONSTRAINT tenants_tenant_type_check 
CHECK (tenant_type IN ('production', 'institution', 'hospital', 'clinic', 'simulation_template', 'simulation_active', 'program'));

-- 4. Verify the new constraint
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'tenants'
  AND con.contype = 'c'
  AND con.conname LIKE '%tenant_type%';
