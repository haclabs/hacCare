# SQL Scripts

This directory contains important SQL scripts for database operations and fixes.

## Files

### `complete-fix-all-in-one.sql`
**Purpose**: Comprehensive fix for PostgREST schema cache issues and trigger problems

**What it does**:
- Modifies `auto_set_tenant_id()` trigger to check if tenant_id is already provided
- Creates `create_patient_alert_v3()` RPC function with dynamic SQL to bypass schema cache
- Recreates all triggers on affected tables

**When to use**: 
- Deploy this after any schema changes that add tenant_id columns
- Use when experiencing "column does not exist" errors despite the column existing

**Status**: ✅ DEPLOYED and WORKING (as of October 2025)

## Related Documentation

- Database migrations: `/docs/development/database/migrations/`
- Database functions: `/docs/development/database/functions/`
- Debug scripts (archived): `/docs/development/archives/debug-sql-files/`

## Usage

To run these scripts:

1. Open Supabase SQL Editor
2. Copy the entire contents of the desired SQL file
3. Execute in the editor
4. Verify success by checking for errors and testing the affected functionality

## Archive Date
October 8, 2025
