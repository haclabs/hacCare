# Supabase Database Management

This folder contains SQL scripts and utilities for managing the hacCare multi-tenant database.

## Folder Structure

### `/diagnostics`
Scripts for debugging and analyzing database state:
- `debug-medication-step-by-step.sql` - Comprehensive medication visibility debugging
- `debug-tenant-assignment.sql` - Tenant assignment diagnostics
- `diagnose-medication-visibility.sql` - Medication visibility analysis
- `compare-rls-policies.sql` - RLS policy comparison and analysis

### `/fixes`
SQL scripts for applying fixes and updates:
- `fix-tenant-assignment.sql` - Assign users to tenants
- `fix-super-admin-role.sql` - Update user roles to super_admin
- `fix-medication-rls-policy.sql` - Update RLS policies for medications
- `fix-role-constraint.sql` - Fix role constraints
- `fix-user-tenant.sql` - Fix user-tenant relationships
- `disable-medication-rls.sql` - Temporarily disable RLS for debugging
- `complete-tenant-fix.sql` - Comprehensive tenant setup fix
- `final-tenant-fix.sql` - Final tenant isolation fix

### `/utilities`
JavaScript utilities for database management:
- `assign-user-to-tenant.js` - Utility to assign users to tenants
- `quick-assign.js` - Quick tenant assignment script

### `/migrations` 
Future database migrations will be stored here.

## Usage

1. **For Diagnostics**: Run scripts in `/diagnostics` to analyze current database state
2. **For Fixes**: Apply scripts in `/fixes` to resolve issues (run diagnostics first)
3. **For Utilities**: Use JavaScript files in `/utilities` for automated tasks

## Notes

- Always run diagnostic scripts before applying fixes
- Test fixes in development environment first
- Keep backups before running major fixes
- RLS policies are critical for multi-tenant security
