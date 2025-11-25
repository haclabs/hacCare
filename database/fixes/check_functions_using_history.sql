-- Let's check if there are any other functions that might be inserting into simulation_history
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND (
    routine_definition ILIKE '%INSERT INTO simulation_history%'
    OR routine_definition ILIKE '%simulation_history%'
  )
ORDER BY routine_name;
