-- ============================================================================
-- TAG EXISTING SIMULATIONS WITH PROGRAM CODES
-- ============================================================================
-- Migration: Add program categories to existing templates and active sims
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================
-- Purpose: Existing templates/simulations likely have NULL or empty 
--          primary_categories. Tag them so instructors can see them.
-- ============================================================================

-- ============================================================================
-- 1. ADD PRIMARY_CATEGORIES COLUMN IF NOT EXISTS
-- ============================================================================

-- Add primary_categories to simulation_templates if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_templates' 
    AND column_name = 'primary_categories'
  ) THEN
    ALTER TABLE simulation_templates 
    ADD COLUMN primary_categories TEXT[] DEFAULT '{}';
    
    RAISE NOTICE '✅ Added primary_categories column to simulation_templates';
  ELSE
    RAISE NOTICE 'ℹ️ primary_categories column already exists on simulation_templates';
  END IF;
END $$;

-- Add primary_categories to simulation_active if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_active' 
    AND column_name = 'primary_categories'
  ) THEN
    ALTER TABLE simulation_active 
    ADD COLUMN primary_categories TEXT[] DEFAULT '{}';
    
    RAISE NOTICE '✅ Added primary_categories column to simulation_active';
  ELSE
    RAISE NOTICE 'ℹ️ primary_categories column already exists on simulation_active';
  END IF;
END $$;

-- Add sub_categories as well
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_templates' 
    AND column_name = 'sub_categories'
  ) THEN
    ALTER TABLE simulation_templates 
    ADD COLUMN sub_categories TEXT[] DEFAULT '{}';
    
    RAISE NOTICE '✅ Added sub_categories column to simulation_templates';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_active' 
    AND column_name = 'sub_categories'
  ) THEN
    ALTER TABLE simulation_active 
    ADD COLUMN sub_categories TEXT[] DEFAULT '{}';
    
    RAISE NOTICE '✅ Added sub_categories column to simulation_active';
  END IF;
END $$;

-- ============================================================================
-- 2. SHOW CURRENT STATE
-- ============================================================================

-- Check templates without categories
SELECT 
  'Templates without categories' as type,
  COUNT(*) as count
FROM simulation_templates
WHERE primary_categories IS NULL 
   OR primary_categories = '{}';

-- Check active simulations without categories
SELECT 
  'Active sims without categories' as type,
  COUNT(*) as count
FROM simulation_active
WHERE primary_categories IS NULL 
   OR primary_categories = '{}';

-- ============================================================================
-- 2. OPTION A: TAG ALL WITH ALL PROGRAM CODES (SAFEST)
-- ============================================================================
-- This makes all existing templates visible to all instructors
-- Use this if you're unsure which program each template belongs to

-- Get all program codes from the database
DO $$
DECLARE
  v_program_codes TEXT[];
BEGIN
  -- Get all active program codes
  SELECT ARRAY_AGG(code) INTO v_program_codes
  FROM programs
  WHERE is_active = true;
  
  RAISE NOTICE '📚 Found program codes: %', v_program_codes;
  
  -- Update simulation_templates with no categories
  UPDATE simulation_templates
  SET 
    primary_categories = v_program_codes,
    updated_at = NOW()
  WHERE primary_categories IS NULL 
     OR primary_categories = '{}';
  
  RAISE NOTICE '✅ Updated % templates with all program codes', 
    (SELECT COUNT(*) FROM simulation_templates WHERE primary_categories = v_program_codes);
  
  -- Update simulation_active with no categories
  UPDATE simulation_active
  SET 
    primary_categories = v_program_codes,
    updated_at = NOW()
  WHERE primary_categories IS NULL 
     OR primary_categories = '{}';
  
  RAISE NOTICE '✅ Updated % active simulations with all program codes',
    (SELECT COUNT(*) FROM simulation_active WHERE primary_categories = v_program_codes);
END $$;

-- ============================================================================
-- 3. OPTION B: TAG SPECIFIC TEMPLATES (MANUAL)
-- ============================================================================
-- Use these if you know which program each template belongs to
-- Comment out the DO block above and uncomment these instead

/*
-- Tag specific templates with NESA
UPDATE simulation_templates
SET primary_categories = ARRAY['NESA']
WHERE name ILIKE '%cardiac%' OR name ILIKE '%emergency%'
  AND (primary_categories IS NULL OR primary_categories = '{}');

-- Tag specific templates with PN (Practical Nursing)
UPDATE simulation_templates
SET primary_categories = ARRAY['PN']
WHERE name ILIKE '%basic%' OR name ILIKE '%fundamentals%'
  AND (primary_categories IS NULL OR primary_categories = '{}');

-- Tag specific templates with SIM Hub
UPDATE simulation_templates
SET primary_categories = ARRAY['SIM Hub']
WHERE name ILIKE '%advanced%' OR name ILIKE '%critical%'
  AND (primary_categories IS NULL OR primary_categories = '{}');

-- Tag specific templates with BNAD
UPDATE simulation_templates
SET primary_categories = ARRAY['BNAD']
WHERE name ILIKE '%bachelor%' OR name ILIKE '%degree%'
  AND (primary_categories IS NULL OR primary_categories = '{}');

-- Tag templates with multiple programs (shared across programs)
UPDATE simulation_templates
SET primary_categories = ARRAY['NESA', 'PN', 'SIM Hub']
WHERE name ILIKE '%general%' OR name ILIKE '%common%'
  AND (primary_categories IS NULL OR primary_categories = '{}');
*/

-- ============================================================================
-- 4. OPTION C: COPY TEMPLATE CATEGORIES TO ACTIVE SIMULATIONS
-- ============================================================================
-- Active simulations should inherit categories from their template

UPDATE simulation_active sa
SET 
  primary_categories = st.primary_categories,
  updated_at = NOW()
FROM simulation_templates st
WHERE sa.template_id = st.id
  AND st.primary_categories IS NOT NULL
  AND st.primary_categories != '{}'
  AND (sa.primary_categories IS NULL OR sa.primary_categories = '{}');

-- ============================================================================
-- 5. VERIFY RESULTS
-- ============================================================================

-- Show templates by program
SELECT 
  'Templates by program' as report,
  UNNEST(primary_categories) as program_code,
  COUNT(*) as template_count
FROM simulation_templates
WHERE primary_categories IS NOT NULL
  AND primary_categories != '{}'
GROUP BY UNNEST(primary_categories)
ORDER BY program_code;

-- Show active sims by program
SELECT 
  'Active sims by program' as report,
  UNNEST(primary_categories) as program_code,
  COUNT(*) as simulation_count
FROM simulation_active
WHERE primary_categories IS NOT NULL
  AND primary_categories != '{}'
GROUP BY UNNEST(primary_categories)
ORDER BY program_code;

-- Show templates still without categories (should be 0)
SELECT 
  id,
  name,
  status,
  created_at
FROM simulation_templates
WHERE primary_categories IS NULL 
   OR primary_categories = '{}'
ORDER BY created_at DESC;

-- Show active sims still without categories (should be 0)
SELECT 
  id,
  name,
  status,
  created_at
FROM simulation_active
WHERE primary_categories IS NULL 
   OR primary_categories = '{}'
ORDER BY created_at DESC;

-- ============================================================================
-- 6. CREATE TRIGGER TO AUTO-TAG FUTURE SIMULATIONS
-- ============================================================================
-- When launching a simulation from a template, copy template categories

CREATE OR REPLACE FUNCTION auto_tag_simulation_from_template()
RETURNS TRIGGER AS $$
BEGIN
  -- If simulation has no categories but template does, copy them
  IF (NEW.primary_categories IS NULL OR NEW.primary_categories = '{}') 
     AND NEW.template_id IS NOT NULL THEN
    SELECT primary_categories INTO NEW.primary_categories
    FROM simulation_templates
    WHERE id = NEW.template_id
      AND primary_categories IS NOT NULL
      AND primary_categories != '{}';
    
    IF NEW.primary_categories IS NOT NULL AND NEW.primary_categories != '{}' THEN
      RAISE NOTICE '✅ Auto-tagged simulation % with categories from template: %', 
        NEW.name, NEW.primary_categories;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_tag_simulation ON simulation_active;

-- Create trigger
CREATE TRIGGER trigger_auto_tag_simulation
  BEFORE INSERT ON simulation_active
  FOR EACH ROW
  EXECUTE FUNCTION auto_tag_simulation_from_template();

COMMENT ON FUNCTION auto_tag_simulation_from_template IS
'Automatically copy primary_categories from template to simulation when launching';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary
SELECT 
  'Summary' as section,
  (SELECT COUNT(*) FROM simulation_templates WHERE primary_categories IS NOT NULL AND primary_categories != '{}') as templates_tagged,
  (SELECT COUNT(*) FROM simulation_active WHERE primary_categories IS NOT NULL AND primary_categories != '{}') as simulations_tagged,
  (SELECT COUNT(*) FROM simulation_templates WHERE primary_categories IS NULL OR primary_categories = '{}') as templates_untagged,
  (SELECT COUNT(*) FROM simulation_active WHERE primary_categories IS NULL OR primary_categories = '{}') as simulations_untagged;
