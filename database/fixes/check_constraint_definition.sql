-- Quick check - what are the valid role values?
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'tenant_users'::regclass
  AND contype = 'c';  -- check constraints
