-- Diagnostic query to check current table structures
-- Run this first to see what tables and columns actually exist

-- Let's check the exact column structure of the problematic table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'simulation_patient_vitals' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if simulation_patient_medications table exists and its structure  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'simulation_patient_medications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if simulation_patients table has the expected columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'simulation_patients' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. List all tables that start with 'simulation'
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE 'simulation%'
ORDER BY table_name;