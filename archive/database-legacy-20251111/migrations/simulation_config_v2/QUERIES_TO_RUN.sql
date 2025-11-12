-- ============================================================================
-- QUERIES TO RUN IN SUPABASE SQL EDITOR
-- ============================================================================
-- Copy each query below, paste into Supabase SQL Editor, run it, and paste 
-- the results back to me so I can fix the RLS policies
-- ============================================================================

-- ---------------------------------------------------------------------------
-- QUERY 1: Get user_profiles table structure
-- ---------------------------------------------------------------------------
-- This shows me what columns exist in user_profiles (like tenant_id)

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- QUERY 2: Get simulation_templates table structure  
-- ---------------------------------------------------------------------------
-- This shows me what columns exist in simulation_templates

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'simulation_templates'
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- QUERY 3: Get simulation_active table structure
-- ---------------------------------------------------------------------------
-- This shows me what columns exist in simulation_active

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'simulation_active'
ORDER BY ordinal_position;

-- ---------------------------------------------------------------------------
-- QUERY 4: Sample tenant_id values
-- ---------------------------------------------------------------------------
-- This shows me the actual tenant_id patterns (template_xxx vs active_sim_xxx)

-- From user_profiles (if tenant_id exists there)
SELECT 'user_profiles' as source, tenant_id, COUNT(*) as count
FROM user_profiles
GROUP BY tenant_id
LIMIT 10;

-- From simulation_templates
SELECT 'simulation_templates' as source, tenant_id, COUNT(*) as count
FROM simulation_templates
GROUP BY tenant_id
LIMIT 10;

-- From simulation_active
SELECT 'simulation_active' as source, tenant_id, COUNT(*) as count
FROM simulation_active
GROUP BY tenant_id
LIMIT 10;

-- ---------------------------------------------------------------------------
-- INSTRUCTIONS
-- ---------------------------------------------------------------------------
-- 1. Copy QUERY 1, paste into Supabase SQL Editor, run it
-- 2. Copy the results and paste back to me
-- 3. Repeat for QUERY 2, 3, and 4
-- 4. I'll use this info to fix the RLS policies correctly
