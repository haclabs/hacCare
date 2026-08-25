-- Drop legacy backup system tables (backupService.ts was removed from the codebase;
-- these tables are no longer written to or read from by the application).
-- backup_audit_log is intentionally kept as a historical audit trail.

DROP TRIGGER IF EXISTS trigger_backup_metadata_updated_at ON public.backup_metadata;
DROP FUNCTION IF EXISTS public.update_backup_metadata_updated_at();

-- These functions only queried backup_metadata and would break once it's dropped.
DROP FUNCTION IF EXISTS public.get_backup_statistics();
DROP FUNCTION IF EXISTS public.mark_expired_backups();

DROP TABLE IF EXISTS public.backup_files CASCADE;
DROP TABLE IF EXISTS public.backup_metadata CASCADE;
