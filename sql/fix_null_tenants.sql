-- Fix NULL tenant_ids in test sessions
-- First find what tenants actually exist, then update sessions

-- Show all available tenants
SELECT id, name, created_at FROM tenants ORDER BY name;

-- Update sessions to use the first available tenant
-- (We'll use the first tenant we find since LetHpoly might not exist)
UPDATE user_sessions 
SET tenant_id = (
  SELECT id FROM tenants 
  ORDER BY name 
  LIMIT 1
)
WHERE tenant_id IS NULL;

-- Verify the fix worked
SELECT 
  us.ip_address,
  us.tenant_id,
  t.name as tenant_name,
  up.email,
  up.first_name,
  up.last_name,
  us.status
FROM user_sessions us
LEFT JOIN tenants t ON us.tenant_id = t.id
LEFT JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.login_time DESC;