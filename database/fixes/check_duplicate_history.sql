-- Check for triggers on simulation_active or simulation_history that might cause duplicates
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('simulation_active', 'simulation_history')
ORDER BY event_object_table, trigger_name;

-- Check for duplicate history entries for the problem simulation
SELECT 
    id,
    simulation_id,
    name,
    completed_at,
    instructor_name,
    (SELECT COUNT(*) FROM jsonb_array_elements(student_activities)) as activity_count,
    created_at
FROM simulation_history
WHERE name LIKE 'CLS Testing - Group 5%'
  AND completed_at::date = CURRENT_DATE
ORDER BY completed_at DESC;
