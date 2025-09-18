-- ============================================
-- PART 6: CREATE VIEWS
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS simulation_overview;
DROP VIEW IF EXISTS simulation_lobby_status;

-- Simulation overview with lobby info
CREATE VIEW simulation_overview AS
SELECT 
  t.id as tenant_id,
  t.name as simulation_name,
  s.id as simulation_id,
  s.session_name,
  s.status,
  s.simulation_status,
  s.lobby_message,
  s.start_time,
  s.end_time,
  COUNT(DISTINCT su.id) as total_users,
  COUNT(DISTINCT sl.id) as lobby_users,
  COUNT(DISTINCT sp.id) as patient_count
FROM tenants t
JOIN active_simulations s ON s.id = t.simulation_id
LEFT JOIN simulation_users su ON su.simulation_tenant_id = t.id
LEFT JOIN simulation_lobby sl ON sl.simulation_id = s.id AND sl.status = 'waiting'
LEFT JOIN simulation_patients sp ON sp.active_simulation_id = s.id
WHERE t.tenant_type = 'simulation'
GROUP BY t.id, t.name, s.id, s.session_name, s.status, s.simulation_status, s.lobby_message, s.start_time, s.end_time;

-- Active lobby users view
CREATE VIEW simulation_lobby_status AS
SELECT 
  sl.simulation_id,
  s.session_name,
  s.simulation_status,
  s.lobby_message,
  sl.user_id,
  sl.username,
  sl.role,
  sl.status,
  sl.joined_at,
  sl.last_ping,
  CASE 
    WHEN sl.last_ping > NOW() - INTERVAL '2 minutes' THEN 'online'
    ELSE 'offline'
  END as online_status
FROM simulation_lobby sl
JOIN active_simulations s ON s.id = sl.simulation_id
WHERE sl.last_ping > NOW() - INTERVAL '10 minutes' -- Only show recent activity
ORDER BY sl.role, sl.joined_at;