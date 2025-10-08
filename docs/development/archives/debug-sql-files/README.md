# Debug SQL Files Archive

This directory contains SQL debugging scripts that were used during development to troubleshoot various issues.

## Files Overview

### RLS & Security Fixes
- `rls-bypass-fix.sql` - RLS bypass fix attempt
- `temp-disable-rls.sql` - Temporary RLS disable script
- `fix-function-with-rls-off.sql` - Function fix with RLS disabled
- `ultimate-fix-dynamic-sql.sql` - Dynamic SQL fix for RLS issues
- `nuclear-option-create-alert-v2.sql` - Alternative alert creation approach

### Trigger Debugging
- `fix-trigger-function.sql` - Trigger function fixes
- `drop-trigger.sql` - Drop trigger utility
- `find-trigger.sql` - Find trigger utility

### Schema & Structure Checks
- `check-patient-alerts-tenant-id.sql` - Patient alerts tenant_id verification
- `check-patient-notes-schema.sql` - Patient notes schema check
- `check_patient_vitals_structure.sql` - Patient vitals structure check
- `check_rls_policies.sql` - RLS policies verification
- `check_tables.sql` - General table structure checks
- `verify-function-signature.sql` - Function signature verification

### Comprehensive Diagnostics
- `comprehensive-diagnosis.sql` - Complete system diagnostic script
- `debug-function-versions.sql` - Function version debugging
- `investigate-cache-table.sql` - Cache table investigation

## Note

These files are archived for reference and should not be used in production. The working fixes have been consolidated into `/docs/development/sql/complete-fix-all-in-one.sql`.

## Archive Date
October 8, 2025
