-- DIAGNOSE USER WITHOUT TENANT ASSIGNMENT
-- Run this in Supabase SQL Editor to see which users have no tenant assignment

SELECT 
  'USERS WITHOUT TENANT ASSIGNMENT:' as diagnostic_type,
  up.id,
  up.email,
  up.role,
  up.is_active,
  up.created_at,
  CASE 
    WHEN tu.user_id IS NULL THEN '❌ No tenant assignment'
    ELSE '✅ Has tenant assignment'
  END as tenant_status
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id
WHERE tu.user_id IS NULL
  AND up.is_active = true
ORDER BY up.created_at DESC;

-- Also show available tenants for assignment
SELECT 
  'AVAILABLE TENANTS:' as diagnostic_type,
  t.id,
  t.name,
  t.subdomain,
  t.status
FROM tenants t
WHERE t.status = 'active'
ORDER BY t.name;
