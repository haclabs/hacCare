-- ============================================================================
-- CLEANUP: Delete duplicate empty simulation history entries
-- ============================================================================
-- Problem: Duplicate history entries being created with NULL instructor and 0 activities
-- Solution: Delete the empty duplicates, keeping the ones with data
-- ============================================================================

-- First, let's see what we're deleting
SELECT 
    id,
    simulation_id,
    name,
    completed_at,
    instructor_name,
    (SELECT COUNT(*) FROM jsonb_array_elements(student_activities)) as activity_count,
    CASE 
        WHEN instructor_name IS NULL AND 
             (SELECT COUNT(*) FROM jsonb_array_elements(student_activities)) = 0 
        THEN '❌ WILL DELETE (empty duplicate)'
        ELSE '✅ KEEP (has data)'
    END as action
FROM simulation_history
WHERE simulation_id IN (
    -- Find simulations with duplicate history entries
    SELECT simulation_id
    FROM simulation_history
    WHERE completed_at::date = CURRENT_DATE
    GROUP BY simulation_id, completed_at
    HAVING COUNT(*) > 1
)
ORDER BY simulation_id, completed_at DESC;

-- Now delete the empty duplicates
DELETE FROM simulation_history
WHERE id IN (
    SELECT h1.id
    FROM simulation_history h1
    WHERE EXISTS (
        -- Find if there's another entry for same simulation at same time
        SELECT 1
        FROM simulation_history h2
        WHERE h2.simulation_id = h1.simulation_id
          AND h2.completed_at = h1.completed_at
          AND h2.id != h1.id
          -- Keep the one with data, delete the empty one
          AND (
              -- Delete if this one is empty
              (h1.instructor_name IS NULL AND 
               (SELECT COUNT(*) FROM jsonb_array_elements(h1.student_activities)) = 0)
              -- And the other one has data
              AND (h2.instructor_name IS NOT NULL OR 
                   (SELECT COUNT(*) FROM jsonb_array_elements(h2.student_activities)) > 0)
          )
    )
);

-- Verify cleanup
SELECT 
    'After cleanup:' as status,
    COUNT(*) as total_history_entries,
    COUNT(DISTINCT simulation_id) as unique_simulations
FROM simulation_history
WHERE completed_at::date = CURRENT_DATE;
