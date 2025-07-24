# SQL Patches Directory

This directory contains SQL scripts for database schema changes, fixes, and maintenance.

## Structure

- **`setup/`** - Initial setup and configuration scripts
- **`fixes/`** - Bug fixes, patches, and maintenance scripts  
- **`diagnostics/`** - Scripts for debugging and checking database state

## Usage

⚠️ **Important**: Always backup your database before running any SQL patches!

### Running SQL Files

You can run these files using your preferred database client or command line:

```bash
# Using psql (PostgreSQL)
psql -h your-host -d your-database -f sql-patches/setup/setup_multi_tenant.sql

# Using Supabase CLI
supabase db reset
supabase db push
```

### File Naming Convention

- **`setup-*`** - Initial setup scripts
- **`fix-*`** - Bug fixes and patches
- **`check-*`** - Diagnostic queries (read-only)
- **`debug-*`** - Debugging queries
- **`diagnose-*`** - Problem diagnosis queries
- **`cleanup-*`** - Data cleanup scripts
- **`migrate-*`** - Data migration scripts

## Safety Guidelines

1. Always test patches on a development database first
2. Create backups before applying fixes
3. Review the SQL content before execution
4. Run diagnostic scripts first to understand current state
5. Apply patches in the correct order when dependencies exist

## Directory Contents

### Setup Scripts
Scripts for initial database setup and configuration.

### Fix Scripts  
Scripts to resolve specific issues and apply patches.

### Diagnostic Scripts
Read-only scripts to check database state and diagnose issues.
