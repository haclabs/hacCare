-- Migration Script: Update Patient Medications to New Daily-Based Format
-- Date: September 30, 2025
-- Purpose: Convert old frequency formats to new daily-based system and add admin_times array support
-- Database: Supabase PostgreSQL
-- Table: patient_medications

-- Step 1: Add admin_times column if it doesn't exist (PostgreSQL JSONB for better performance)
ALTER TABLE patient_medications 
ADD COLUMN IF NOT EXISTS admin_times JSONB DEFAULT NULL;

-- Step 2: Update frequencies from old format to new format
UPDATE medications 
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
WHERE frequency IN ('Q6H', 'Q8H', 'Q12H', 'Q4H', 'BID', 'TID', 'QID', 'PRN', 'Q6H (Every 6 hours)', 'Q8H (Every 8 hours)', 'Q12H (Every 12 hours)', 'Q4H (Every 4 hours)');

-- Step 3: Create admin_times arrays based on frequency and existing admin_time
-- For medications that need multiple times per day
UPDATE medications 
SET admin_times = CASE 
    -- Four times daily (QID) - 6 hour intervals starting from admin_time
    WHEN frequency = 'QID (Four times daily)' THEN 
        JSON_ARRAY(
            COALESCE(admin_time, '08:00'),
            TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '06:00:00'), '%H:%i'),
            TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '12:00:00'), '%H:%i'),
            TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '18:00:00'), '%H:%i')
        )
    -- Three times daily (TID) - 8 hour intervals
    WHEN frequency = 'TID (Three times daily)' THEN 
        JSON_ARRAY(
            COALESCE(admin_time, '08:00'),
            TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '08:00:00'), '%H:%i'),
            TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '16:00:00'), '%H:%i')
        )
    -- Twice daily (BID) - 12 hour intervals  
    WHEN frequency = 'BID (Twice daily)' THEN 
        JSON_ARRAY(
            COALESCE(admin_time, '08:00'),
            TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '12:00:00'), '%H:%i')
        )
    -- Once daily, PRN, and Continuous keep single time
    ELSE 
        JSON_ARRAY(COALESCE(admin_time, '08:00'))
END
WHERE admin_times IS NULL;

-- Step 4: Handle potential time overflow (when adding hours goes past 24:00)
-- Update any times that went over 24 hours
UPDATE medications 
SET admin_times = CASE 
    WHEN frequency = 'QID (Four times daily)' THEN 
        JSON_ARRAY(
            COALESCE(admin_time, '08:00'),
            CASE 
                WHEN TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (6 * 3600) >= 86400 
                THEN TIME_FORMAT(SEC_TO_TIME(TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (6 * 3600) - 86400), '%H:%i')
                ELSE TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '06:00:00'), '%H:%i')
            END,
            CASE 
                WHEN TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (12 * 3600) >= 86400 
                THEN TIME_FORMAT(SEC_TO_TIME(TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (12 * 3600) - 86400), '%H:%i')
                ELSE TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '12:00:00'), '%H:%i')
            END,
            CASE 
                WHEN TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (18 * 3600) >= 86400 
                THEN TIME_FORMAT(SEC_TO_TIME(TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (18 * 3600) - 86400), '%H:%i')
                ELSE TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '18:00:00'), '%H:%i')
            END
        )
    WHEN frequency = 'TID (Three times daily)' THEN 
        JSON_ARRAY(
            COALESCE(admin_time, '08:00'),
            CASE 
                WHEN TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (8 * 3600) >= 86400 
                THEN TIME_FORMAT(SEC_TO_TIME(TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (8 * 3600) - 86400), '%H:%i')
                ELSE TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '08:00:00'), '%H:%i')
            END,
            CASE 
                WHEN TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (16 * 3600) >= 86400 
                THEN TIME_FORMAT(SEC_TO_TIME(TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (16 * 3600) - 86400), '%H:%i')
                ELSE TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '16:00:00'), '%H:%i')
            END
        )
    WHEN frequency = 'BID (Twice daily)' THEN 
        JSON_ARRAY(
            COALESCE(admin_time, '08:00'),
            CASE 
                WHEN TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (12 * 3600) >= 86400 
                THEN TIME_FORMAT(SEC_TO_TIME(TIME_TO_SEC(COALESCE(admin_time, '08:00')) + (12 * 3600) - 86400), '%H:%i')
                ELSE TIME_FORMAT(ADDTIME(COALESCE(admin_time, '08:00'), '12:00:00'), '%H:%i')
            END
        )
    ELSE admin_times -- Keep existing for single-time medications
END
WHERE frequency IN ('QID (Four times daily)', 'TID (Three times daily)', 'BID (Twice daily)');

-- Step 5: Update any medications that might need the diabetic category
-- This is optional - you may want to manually review and update these
-- UPDATE medications 
-- SET category = 'diabetic'
-- WHERE LOWER(name) LIKE '%insulin%' 
--    OR LOWER(name) LIKE '%metformin%'
--    OR LOWER(name) LIKE '%glipizide%'
--    OR LOWER(name) LIKE '%glyburide%'
--    OR LOWER(name) LIKE '%lantus%'
--    OR LOWER(name) LIKE '%humalog%'
--    OR LOWER(name) LIKE '%novolog%';

-- Step 6: Verification queries to check the migration results
-- Run these after the migration to verify everything looks correct

-- Check frequency distribution after migration
SELECT frequency, COUNT(*) as count 
FROM medications 
GROUP BY frequency 
ORDER BY count DESC;

-- Check admin_times format for different frequencies
SELECT 
    frequency,
    admin_time,
    admin_times,
    JSON_LENGTH(admin_times) as times_count
FROM medications 
WHERE admin_times IS NOT NULL
LIMIT 10;

-- Check for any medications that might need manual review
SELECT id, name, frequency, admin_time, admin_times, category
FROM medications 
WHERE admin_times IS NULL 
   OR JSON_LENGTH(admin_times) = 0
   OR (frequency LIKE '%daily%' AND JSON_LENGTH(admin_times) != SUBSTRING_INDEX(frequency, ' ', 1));

-- Summary report
SELECT 
    'Total medications' as metric,
    COUNT(*) as value
FROM medications
UNION ALL
SELECT 
    'Medications with admin_times' as metric,
    COUNT(*) as value
FROM medications 
WHERE admin_times IS NOT NULL
UNION ALL
SELECT 
    'Medications with multiple times' as metric,
    COUNT(*) as value
FROM medications 
WHERE JSON_LENGTH(admin_times) > 1;