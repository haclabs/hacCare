-- Diagnostic query to discover patient_alerts table structure and enum types
-- Run this first to understand the exact column types

-- 1. Check patient_alerts table structure
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'patient_alerts'
ORDER BY ordinal_position;

-- 2. Check enum types and their values
SELECT 
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%alert%' OR t.typname LIKE '%priority%'
GROUP BY t.typname
ORDER BY t.typname;

-- 3. Show sample alert records to understand current format
SELECT 
    alert_type,
    priority,
    pg_typeof(alert_type) as alert_type_type,
    pg_typeof(priority) as priority_type
FROM patient_alerts 
LIMIT 3;