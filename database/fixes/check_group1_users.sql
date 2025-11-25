-- Check who the users are in Group 1 (which has 5 users correctly)
SELECT 
  u.email,
  tu.role,
  tu.tenant_id
FROM tenant_users tu
JOIN auth.users u ON u.id = tu.user_id
WHERE tu.tenant_id = (
  SELECT tenant_id 
  FROM simulation_active 
  WHERE name = 'CLS Testing - Group 1'
)
ORDER BY u.email;
