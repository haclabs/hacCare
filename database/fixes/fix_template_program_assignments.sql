-- ============================================================================
-- FIX TEMPLATE PROGRAM ASSIGNMENTS
-- ============================================================================
-- Assign correct programs to existing simulation templates
-- Date: 2026-02-01
-- ============================================================================

-- Current state: All templates tagged with ['NESA', 'PN', 'SIM Hub', 'BNAD']
-- Goal: Assign each template to its correct program only

-- ============================================================================
-- 1. UPDATE TEMPLATES WITH CORRECT PROGRAM ASSIGNMENTS
-- ============================================================================

-- HOF Lab → NESA only
UPDATE simulation_templates
SET primary_categories = ARRAY['NESA']
WHERE name = 'HOF Lab';

-- CLS Testing → NESA only
UPDATE simulation_templates
SET primary_categories = ARRAY['NESA']
WHERE name = 'CLS Testing';

-- The Nursing Shift → PN only
UPDATE simulation_templates
SET primary_categories = ARRAY['PN']
WHERE name = 'The Nursing Shift';

-- ============================================================================
-- 2. VERIFICATION - CHECK UPDATED ASSIGNMENTS
-- ============================================================================

SELECT 
  name,
  status,
  primary_categories,
  created_at
FROM simulation_templates
ORDER BY name;

-- ============================================================================
-- 3. CHECK WHAT TEMPLATES A NESA INSTRUCTOR SEES
-- ============================================================================
-- Replace 'NESA_INSTRUCTOR_USER_ID' with actual user ID to test

-- SELECT * FROM get_user_accessible_simulations('NESA_INSTRUCTOR_USER_ID');

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 
  '✅ Templates Updated' as status,
  'HOF Lab and CLS Testing assigned to NESA' as nesa_templates,
  'The Nursing Shift assigned to PN' as pn_templates;
