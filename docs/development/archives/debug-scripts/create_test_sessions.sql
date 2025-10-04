-- Create Test Sessions for Admin Dashboard
-- Run this to populate the admin dashboard with sample login sessions

-- Clean up any existing test sessions first
DELETE FROM user_sessions WHERE ip_address IN ('192.168.1.100', '10.0.0.50', '172.16.0.25');

-- Insert sample login sessions with real user IDs
DO $$
DECLARE
    user1_id uuid;
    user2_id uuid;
    user3_id uuid;
    tenant1_id uuid;
BEGIN
    -- Get some real user IDs from user_profiles
    SELECT id INTO user1_id FROM user_profiles WHERE is_active = true ORDER BY created_at LIMIT 1;
    SELECT id INTO user2_id FROM user_profiles WHERE is_active = true ORDER BY created_at LIMIT 1 OFFSET 1;
    SELECT id INTO user3_id FROM user_profiles WHERE is_active = true ORDER BY created_at LIMIT 1 OFFSET 2;
    
    -- Get a tenant ID
    SELECT tenant_id INTO tenant1_id FROM tenant_users WHERE is_active = true LIMIT 1;
    
    -- Insert test sessions if we have users
    IF user1_id IS NOT NULL THEN
        INSERT INTO user_sessions (user_id, ip_address, user_agent, tenant_id, status, login_time, last_activity) 
        VALUES 
            (user1_id, '192.168.1.100'::inet, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124', tenant1_id, 'active', now() - interval '2 hours', now() - interval '5 minutes'),
            (user1_id, '10.0.0.50'::inet, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36', tenant1_id, 'idle', now() - interval '1 day', now() - interval '30 minutes');
        
        RAISE NOTICE '✅ Created sessions for user: %', user1_id;
    END IF;
    
    IF user2_id IS NOT NULL AND user2_id != user1_id THEN
        INSERT INTO user_sessions (user_id, ip_address, user_agent, tenant_id, status, login_time, last_activity) 
        VALUES 
            (user2_id, '172.16.0.25'::inet, 'Mozilla/5.0 (X11; Linux x86_64) Firefox/89.0', tenant1_id, 'active', now() - interval '30 minutes', now() - interval '1 minute');
            
        RAISE NOTICE '✅ Created session for user: %', user2_id;
    END IF;
    
    IF user3_id IS NOT NULL AND user3_id NOT IN (user1_id, user2_id) THEN
        INSERT INTO user_sessions (user_id, ip_address, user_agent, tenant_id, status, login_time, last_activity) 
        VALUES 
            (user3_id, '203.0.113.45'::inet, 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) Mobile/15E148', tenant1_id, 'logged_out', now() - interval '3 hours', now() - interval '2 hours');
            
        RAISE NOTICE '✅ Created session for user: %', user3_id;
    END IF;
    
    -- Show the results
    RAISE NOTICE 'Test sessions created. View them with: SELECT * FROM user_sessions ORDER BY login_time DESC;';
END $$;

-- Verify the test data
SELECT 
    us.id,
    up.email,
    up.first_name || ' ' || up.last_name as user_name,
    us.ip_address,
    us.user_agent,
    us.login_time,
    us.last_activity,
    us.status
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.login_time DESC;