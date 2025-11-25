-- Check what roles are allowed in tenant_users table
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'tenant_users_role_check';

-- Also check what roles currently exist
SELECT DISTINCT role 
FROM tenant_users 
ORDER BY role;

-- Check the table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenant_users'
ORDER BY ordinal_position;
