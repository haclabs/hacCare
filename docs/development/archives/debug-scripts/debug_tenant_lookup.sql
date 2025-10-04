-- Debug tenant lookup issue
-- Check what tenants exist and what tenant_ids are in sessions

-- Check what tenants exist
SELECT id, name, created_at FROM tenants ORDER BY name;

-- Check what tenant_ids are in our sessions
SELECT DISTINCT tenant_id FROM user_sessions WHERE tenant_id IS NOT NULL;

-- Check if the tenant lookup is working
SELECT 
  us.ip_address,
  us.tenant_id,
  t.id as tenant_table_id,
  t.name as tenant_name,
  CASE 
    WHEN us.tenant_id IS NULL THEN 'Session has NULL tenant_id'
    WHEN t.id IS NULL THEN 'Tenant not found in tenants table'
    ELSE 'Tenant lookup should work'
  END as diagnosis
FROM user_sessions us
LEFT JOIN tenants t ON us.tenant_id = t.id
ORDER BY us.login_time DESC;

-- Try the exact query the app uses
SELECT t.id, t.name 
FROM tenants t 
WHERE t.id IN (
  SELECT DISTINCT tenant_id 
  FROM user_sessions 
  WHERE tenant_id IS NOT NULL
);