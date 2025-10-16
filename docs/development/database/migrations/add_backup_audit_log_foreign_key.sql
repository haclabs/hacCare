-- ===========================================================================
-- FIX: Add foreign key relationship between backup_audit_log and user_profiles
-- ===========================================================================
-- This creates the missing foreign key that Supabase PostgREST needs for joins
-- ===========================================================================

-- First, check if backup_audit_log table exists
DO $$ 
BEGIN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'backup_audit_log_user_id_fkey'
        AND table_name = 'backup_audit_log'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE backup_audit_log
        ADD CONSTRAINT backup_audit_log_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES user_profiles(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE '✅ Foreign key constraint added: backup_audit_log.user_id -> user_profiles.id';
    ELSE
        RAISE NOTICE '✅ Foreign key constraint already exists';
    END IF;
END $$;

-- Verify the foreign key was created
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'backup_audit_log';

SELECT '✅ backup_audit_log foreign key relationship created!' as status;
