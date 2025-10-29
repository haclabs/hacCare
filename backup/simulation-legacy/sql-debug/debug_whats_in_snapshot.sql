-- SIMPLE TEST: Just show me what's in the snapshot
-- Simulation: 124676b7-a6c8-4f8e-9ca9-5d6f8c086158

SELECT 
    'SNAPSHOT CONTENTS' as info,
    st.snapshot_version,
    keys.table_name,
    CASE 
        WHEN jsonb_typeof(st.snapshot_data->keys.table_name) = 'array'
        THEN jsonb_array_length(st.snapshot_data->keys.table_name)
        ELSE -1 
    END as record_count,
    jsonb_typeof(st.snapshot_data->keys.table_name) as data_type
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
CROSS JOIN (
    SELECT jsonb_object_keys(st2.snapshot_data) as table_name
    FROM simulation_active sa2
    JOIN simulation_templates st2 ON st2.id = sa2.template_id
    WHERE sa2.id = '124676b7-a6c8-4f8e-9ca9-5d6f8c086158'
) keys
WHERE sa.id = '124676b7-a6c8-4f8e-9ca9-5d6f8c086158'
ORDER BY keys.table_name;