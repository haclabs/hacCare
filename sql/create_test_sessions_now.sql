-- Create test sessions for debugging
-- This will help us see if sessions are being created and staying in the database

INSERT INTO user_sessions (
  id,
  user_id,
  ip_address,
  user_agent,
  tenant_id,
  login_time,
  last_activity,
  status
) VALUES
-- Test session 1 - Super Admin (Heather Gordon)
(
  gen_random_uuid(),
  (SELECT id FROM user_profiles WHERE email = 'heather.gordon@hactech.com' LIMIT 1),
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Debug Session 1',
  (SELECT id FROM tenants WHERE name = 'LetHpoly' LIMIT 1),
  NOW(),
  NOW(),
  'active'
),
-- Test session 2 - Regular user
(
  gen_random_uuid(),
  (SELECT id FROM user_profiles WHERE email != 'heather.gordon@hactech.com' AND is_active = true LIMIT 1),
  '192.168.1.101',
  'Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Debug Session 2',
  (SELECT id FROM tenants WHERE name = 'LetHpoly' LIMIT 1),
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '2 minutes',
  'active'
),
-- Test session 3 - Idle session
(
  gen_random_uuid(),
  (SELECT id FROM user_profiles WHERE is_active = true LIMIT 1 OFFSET 1),
  '192.168.1.102',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Debug Session 3',
  (SELECT id FROM tenants WHERE name = 'LetHpoly' LIMIT 1),
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '20 minutes',
  'idle'
);

-- Verify sessions were created
SELECT 
  'Created Sessions' as result,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
FROM user_sessions;

-- Show the created sessions with user details
SELECT 
  us.id,
  up.email,
  up.first_name,
  up.last_name,
  us.ip_address,
  us.status,
  us.login_time,
  us.last_activity
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.login_time DESC;