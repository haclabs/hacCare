-- Final tenant fix - this should definitely work
-- Run this in Supabase SQL Editor

-- 1. First check what we have
SELECT 'Current state check' as info;
SELECT 
  u.id,
  u.email,
  'User found' as status
FROM auth.users u 
WHERE u.email = 'admin@haccare.com';

-- 2. Check available tenants
SELECT 'Available tenants' as info;
SELECT id, name, status FROM tenants WHERE status = 'active';

-- 3. Clean slate - remove any existing assignments
DELETE FROM tenant_users WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@haccare.com'
);

-- 4. Insert with explicit values (this should work)
INSERT INTO tenant_users (
  user_id, 
  tenant_id, 
  role, 
  permissions, 
  is_active, 
  created_at, 
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@haccare.com'),
  (SELECT id FROM tenants WHERE status = 'active' ORDER BY created_at LIMIT 1),
  'admin',
  ARRAY['patients:read', 'patients:write', 'medications:read', 'medications:write', 'alerts:read'],
  true,
  NOW(),
  NOW()
);

-- 5. Verify it worked
SELECT 'Final verification' as info;
SELECT 
  tu.user_id,
  tu.tenant_id,
  tu.role,
  tu.is_active,
  t.name as tenant_name,
  u.email
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id  
JOIN auth.users u ON tu.user_id = u.id
WHERE u.email = 'admin@haccare.com';

-- 6. Test the function one more time
SELECT 'Function test' as info;
SELECT * FROM get_user_current_tenant(
  (SELECT id FROM auth.users WHERE email = 'admin@haccare.com')  
);

-- 7. Double-check we can see the medications the user created
SELECT 'Medication visibility test' as info;
SELECT COUNT(*) as medication_count
FROM patient_medications pm
WHERE pm.tenant_id IN (
  SELECT tu.tenant_id 
  FROM tenant_users tu 
  JOIN auth.users u ON tu.user_id = u.id
  WHERE u.email = 'admin@haccare.com'
  AND tu.is_active = true
);
