-- =====================================================
-- Backup Management System Database Schema
-- =====================================================
-- 
-- This script creates the necessary tables and policies for the
-- super admin backup management system with proper security controls.

-- Drop existing tables if they exist (for testing)
DROP TABLE IF EXISTS backup_audit_log CASCADE;
DROP TABLE IF EXISTS backup_files CASCADE;
DROP TABLE IF EXISTS backup_metadata CASCADE;

-- =====================================================
-- Backup Metadata Table
-- =====================================================
-- Stores metadata about each backup created in the system

CREATE TABLE backup_metadata (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'partial', 'tenant_specific')),
    file_size BIGINT NOT NULL DEFAULT 0,
    record_count INTEGER NOT NULL DEFAULT 0,
    options JSONB NOT NULL DEFAULT '{}',
    checksum TEXT NOT NULL,
    encrypted BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'expired')),
    expiry_date TIMESTAMPTZ NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    last_downloaded TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_backup_metadata_created_by ON backup_metadata(created_by);
CREATE INDEX idx_backup_metadata_created_at ON backup_metadata(created_at DESC);
CREATE INDEX idx_backup_metadata_status ON backup_metadata(status);
CREATE INDEX idx_backup_metadata_expiry ON backup_metadata(expiry_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_backup_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_backup_metadata_updated_at
    BEFORE UPDATE ON backup_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_metadata_updated_at();

-- =====================================================
-- Backup Files Table
-- =====================================================
-- Stores the actual backup file data
-- In production, this should be replaced with cloud storage

CREATE TABLE backup_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id TEXT NOT NULL REFERENCES backup_metadata(id) ON DELETE CASCADE,
    file_data TEXT NOT NULL, -- Base64 encoded or encrypted data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_hash TEXT, -- Additional integrity check
    compression_type TEXT DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'brotli'))
);

-- Add indexes
CREATE UNIQUE INDEX idx_backup_files_backup_id ON backup_files(backup_id);
CREATE INDEX idx_backup_files_created_at ON backup_files(created_at DESC);

-- =====================================================
-- Backup Audit Log Table
-- =====================================================
-- Comprehensive audit trail for all backup operations

CREATE TABLE backup_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN (
        'backup_created', 
        'backup_downloaded', 
        'backup_deleted', 
        'backup_restored', 
        'backup_failed',
        'backup_expired',
        'backup_access_denied'
    )),
    backup_id TEXT, -- NULL for general actions
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for audit queries
CREATE INDEX idx_backup_audit_user_id ON backup_audit_log(user_id);
CREATE INDEX idx_backup_audit_action ON backup_audit_log(action);
CREATE INDEX idx_backup_audit_backup_id ON backup_audit_log(backup_id);
CREATE INDEX idx_backup_audit_created_at ON backup_audit_log(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all backup tables
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Super Admin Only Access Policy
-- =====================================================
-- Only super admins can access backup data

-- Backup Metadata Policies
CREATE POLICY "backup_metadata_super_admin_all" ON backup_metadata
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

-- Backup Files Policies  
CREATE POLICY "backup_files_super_admin_all" ON backup_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

-- Backup Audit Log Policies
CREATE POLICY "backup_audit_super_admin_select" ON backup_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

CREATE POLICY "backup_audit_insert_all" ON backup_audit_log
    FOR INSERT WITH CHECK (true); -- Allow inserts for audit logging

-- =====================================================
-- Backup Management Functions
-- =====================================================

-- Function to automatically mark expired backups
CREATE OR REPLACE FUNCTION mark_expired_backups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired backups
    UPDATE backup_metadata 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'completed' 
    AND expiry_date < NOW()
    AND status != 'expired';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the expiration
    INSERT INTO backup_audit_log (user_id, action, details)
    VALUES (
        '00000000-0000-0000-0000-000000000000'::UUID, -- System user
        'backup_expired', 
        jsonb_build_object('expired_count', expired_count)
    );
    
    RETURN expired_count;
END;
$$;

-- Function to cleanup old audit logs (keep last 1 year)
CREATE OR REPLACE FUNCTION cleanup_backup_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM backup_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function to get backup statistics
CREATE OR REPLACE FUNCTION get_backup_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_backups', COUNT(*),
        'completed_backups', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_backups', COUNT(*) FILTER (WHERE status = 'failed'),
        'expired_backups', COUNT(*) FILTER (WHERE status = 'expired'),
        'total_size_bytes', COALESCE(SUM(file_size), 0),
        'total_records', COALESCE(SUM(record_count), 0),
        'encrypted_backups', COUNT(*) FILTER (WHERE encrypted = true),
        'oldest_backup', MIN(created_at),
        'newest_backup', MAX(created_at),
        'total_downloads', COALESCE(SUM(download_count), 0)
    ) INTO stats
    FROM backup_metadata;
    
    RETURN stats;
END;
$$;

-- =====================================================
-- Scheduled Tasks (using pg_cron if available)
-- =====================================================

-- Note: These would typically be set up in production with pg_cron
-- or external job schedulers

-- Example cron job to mark expired backups (daily at 2 AM)
-- SELECT cron.schedule('mark-expired-backups', '0 2 * * *', 'SELECT mark_expired_backups();');

-- Example cron job to cleanup old audit logs (monthly)  
-- SELECT cron.schedule('cleanup-backup-audit', '0 3 1 * *', 'SELECT cleanup_backup_audit_logs();');

-- =====================================================
-- Initial Data and Comments
-- =====================================================

-- Add comments for documentation
COMMENT ON TABLE backup_metadata IS 'Stores metadata for system backups with security controls';
COMMENT ON TABLE backup_files IS 'Stores backup file data (replace with cloud storage in production)';
COMMENT ON TABLE backup_audit_log IS 'Comprehensive audit trail for backup operations';

COMMENT ON COLUMN backup_metadata.options IS 'JSON configuration used to create the backup';
COMMENT ON COLUMN backup_metadata.checksum IS 'SHA-256 checksum for data integrity verification';
COMMENT ON COLUMN backup_metadata.download_count IS 'Number of times backup has been downloaded (max 10)';

COMMENT ON FUNCTION mark_expired_backups() IS 'Automatically marks backups as expired based on expiry_date';
COMMENT ON FUNCTION get_backup_statistics() IS 'Returns comprehensive backup system statistics';
COMMENT ON FUNCTION cleanup_backup_audit_logs() IS 'Removes audit logs older than 1 year';

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant usage to authenticated users (RLS will control actual access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON backup_metadata TO authenticated;
GRANT ALL ON backup_files TO authenticated;
GRANT ALL ON backup_audit_log TO authenticated;

-- Grant execution on functions
GRANT EXECUTE ON FUNCTION mark_expired_backups() TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_backup_audit_logs() TO authenticated;

-- =====================================================
-- Validation and Testing
-- =====================================================

-- Verify table creation
DO $$
BEGIN
    -- Check if all tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_metadata') THEN
        RAISE EXCEPTION 'backup_metadata table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_files') THEN
        RAISE EXCEPTION 'backup_files table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_audit_log') THEN
        RAISE EXCEPTION 'backup_audit_log table not created';
    END IF;
    
    RAISE NOTICE 'Backup management system database schema created successfully!';
    RAISE NOTICE 'Tables created: backup_metadata, backup_files, backup_audit_log';
    RAISE NOTICE 'RLS policies enabled for super admin access only';
    RAISE NOTICE 'Audit logging configured for compliance';
END
$$;

-- Show final statistics
SELECT 
    'Backup System Setup Complete' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'backup_%') as tables_created,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%backup%') as functions_created;
