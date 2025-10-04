-- Supabase Migration Script: Update Patient Medications to New Daily-Based Format
-- Date: September 30, 2025
-- Purpose: Convert old frequency formats to new daily-based system and add admin_times array support
-- Table: patient_medications

-- =============================================================================
-- STEP 1: Add admin_times column to store multiple administration times
-- =============================================================================
ALTER TABLE patient_medications 
ADD COLUMN IF NOT EXISTS admin_times jsonb DEFAULT NULL;

-- =============================================================================
-- STEP 2: Update frequencies from old format to new daily-based format
-- =============================================================================
UPDATE patient_medications 
SET frequency = CASE 
    WHEN frequency = 'Q6H' OR frequency = 'Q6H (Every 6 hours)' THEN 'QID (Four times daily)'
    WHEN frequency = 'Q8H' OR frequency = 'Q8H (Every 8 hours)' THEN 'TID (Three times daily)'  
    WHEN frequency = 'Q12H' OR frequency = 'Q12H (Every 12 hours)' THEN 'BID (Twice daily)'
    WHEN frequency = 'Q4H' OR frequency = 'Q4H (Every 4 hours)' THEN 'QID (Four times daily)'
    WHEN frequency = 'BID' THEN 'BID (Twice daily)'
    WHEN frequency = 'TID' THEN 'TID (Three times daily)'
    WHEN frequency = 'QID' THEN 'QID (Four times daily)'
    WHEN frequency = 'PRN' THEN 'PRN (As needed)'
    WHEN frequency = 'Once daily' THEN 'Once daily'
    WHEN frequency = 'Continuous' THEN 'Continuous'
    ELSE frequency -- Keep any other values as-is
END
WHERE frequency IN (
    'Q6H', 'Q8H', 'Q12H', 'Q4H', 'BID', 'TID', 'QID', 'PRN', 
    'Q6H (Every 6 hours)', 'Q8H (Every 8 hours)', 'Q12H (Every 12 hours)', 'Q4H (Every 4 hours)'
);

-- =============================================================================
-- STEP 3: Create admin_times arrays based on frequency and existing admin_time
-- =============================================================================

-- Function to add hours to time and handle 24-hour wraparound
CREATE OR REPLACE FUNCTION add_hours_to_time(base_time text, hours_to_add integer)
RETURNS text AS $$
DECLARE
    base_hour integer;
    base_minute integer;
    new_hour integer;
BEGIN
    -- Extract hour and minute from time string (format: HH:MM)
    base_hour := CAST(split_part(base_time, ':', 1) AS integer);
    base_minute := CAST(split_part(base_time, ':', 2) AS integer);
    
    -- Add hours and handle wraparound
    new_hour := (base_hour + hours_to_add) % 24;
    
    -- Return formatted time
    RETURN lpad(new_hour::text, 2, '0') || ':' || lpad(base_minute::text, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- Update medications with admin_times arrays
UPDATE patient_medications 
SET admin_times = CASE 
    -- Four times daily (QID) - 6 hour intervals starting from admin_time
    WHEN frequency = 'QID (Four times daily)' THEN 
        jsonb_build_array(
            COALESCE(admin_time, '08:00'),
            add_hours_to_time(COALESCE(admin_time, '08:00'), 6),
            add_hours_to_time(COALESCE(admin_time, '08:00'), 12),
            add_hours_to_time(COALESCE(admin_time, '08:00'), 18)
        )
    -- Three times daily (TID) - 8 hour intervals
    WHEN frequency = 'TID (Three times daily)' THEN 
        jsonb_build_array(
            COALESCE(admin_time, '08:00'),
            add_hours_to_time(COALESCE(admin_time, '08:00'), 8),
            add_hours_to_time(COALESCE(admin_time, '08:00'), 16)
        )
    -- Twice daily (BID) - 12 hour intervals  
    WHEN frequency = 'BID (Twice daily)' THEN 
        jsonb_build_array(
            COALESCE(admin_time, '08:00'),
            add_hours_to_time(COALESCE(admin_time, '08:00'), 12)
        )
    -- Once daily, PRN, and Continuous keep single time
    ELSE 
        jsonb_build_array(COALESCE(admin_time, '08:00'))
END
WHERE admin_times IS NULL;

-- Clean up the helper function
DROP FUNCTION IF EXISTS add_hours_to_time(text, integer);

-- =============================================================================
-- STEP 4: Update medications that might be diabetic (OPTIONAL - review first)
-- =============================================================================
-- Uncomment the following lines if you want to automatically categorize diabetic medications
/*
UPDATE patient_medications 
SET category = 'diabetic'
WHERE LOWER(name) LIKE '%insulin%' 
   OR LOWER(name) LIKE '%metformin%'
   OR LOWER(name) LIKE '%glipizide%'
   OR LOWER(name) LIKE '%glyburide%'
   OR LOWER(name) LIKE '%lantus%'
   OR LOWER(name) LIKE '%humalog%'
   OR LOWER(name) LIKE '%novolog%'
   OR LOWER(name) LIKE '%glucagon%'
   OR LOWER(name) LIKE '%januvia%'
   OR LOWER(name) LIKE '%ozempic%'
   OR LOWER(name) LIKE '%trulicity%';
*/

-- =============================================================================
-- VERIFICATION QUERIES - Run these after migration to check results
-- =============================================================================

-- 1. Check frequency distribution after migration
SELECT frequency, COUNT(*) as count 
FROM patient_medications 
GROUP BY frequency 
ORDER BY count DESC;

-- 2. Check admin_times format for different frequencies
SELECT 
    id,
    name,
    frequency,
    admin_time,
    admin_times,
    jsonb_array_length(admin_times) as times_count
FROM patient_medications 
WHERE admin_times IS NOT NULL
ORDER BY frequency, name
LIMIT 20;

-- 3. Check for medications that might need manual review
SELECT 
    id, 
    name, 
    frequency, 
    admin_time, 
    admin_times, 
    category,
    CASE 
        WHEN admin_times IS NULL THEN 'Missing admin_times'
        WHEN jsonb_array_length(admin_times) = 0 THEN 'Empty admin_times'
        WHEN frequency LIKE '%Four times%' AND jsonb_array_length(admin_times) != 4 THEN 'QID should have 4 times'
        WHEN frequency LIKE '%Three times%' AND jsonb_array_length(admin_times) != 3 THEN 'TID should have 3 times'
        WHEN frequency LIKE '%Twice%' AND jsonb_array_length(admin_times) != 2 THEN 'BID should have 2 times'
        WHEN frequency = 'Once daily' AND jsonb_array_length(admin_times) != 1 THEN 'Once daily should have 1 time'
        ELSE 'OK'
    END as review_status
FROM patient_medications 
WHERE admin_times IS NULL 
   OR jsonb_array_length(admin_times) = 0
   OR (frequency LIKE '%Four times%' AND jsonb_array_length(admin_times) != 4)
   OR (frequency LIKE '%Three times%' AND jsonb_array_length(admin_times) != 3)
   OR (frequency LIKE '%Twice%' AND jsonb_array_length(admin_times) != 2)
   OR (frequency = 'Once daily' AND jsonb_array_length(admin_times) != 1);

-- 4. Summary report
SELECT 
    'Total medications' as metric,
    COUNT(*)::text as value
FROM patient_medications
UNION ALL
SELECT 
    'Medications with admin_times' as metric,
    COUNT(*)::text as value
FROM patient_medications 
WHERE admin_times IS NOT NULL
UNION ALL
SELECT 
    'Medications with multiple times' as metric,
    COUNT(*)::text as value
FROM patient_medications 
WHERE jsonb_array_length(admin_times) > 1
UNION ALL
SELECT 
    'Diabetic medications' as metric,
    COUNT(*)::text as value
FROM patient_medications 
WHERE category = 'diabetic';

-- 5. Example of your specific medication after migration
SELECT 
    name,
    frequency,
    admin_time,
    admin_times,
    category
FROM patient_medications 
WHERE name = 'Advair 250mcg' 
   OR id = '06391db1-adab-4cd9-8ad9-ad7ed0f1facf';

-- =============================================================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================================================
/*
-- To rollback the migration, uncomment and run:
-- 1. Remove admin_times column
ALTER TABLE patient_medications DROP COLUMN IF EXISTS admin_times;

-- 2. Restore old frequency formats (if you kept track)
UPDATE patient_medications 
SET frequency = CASE 
    WHEN frequency = 'QID (Four times daily)' THEN 'Q6H'
    WHEN frequency = 'TID (Three times daily)' THEN 'Q8H'
    WHEN frequency = 'BID (Twice daily)' THEN 'Q12H'
    WHEN frequency = 'PRN (As needed)' THEN 'PRN'
    ELSE frequency
END;
*/