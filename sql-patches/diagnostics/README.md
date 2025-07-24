# Diagnostic SQL Scripts

Read-only scripts for debugging, checking database state, and diagnosing issues.

## Files

### Data Checks
- **`check-current-data.sql`** - Checks current data state and integrity
- **`check-role-constraints.sql`** - Verifies role constraints
- **`check-tenant-users-rls.sql`** - Checks tenant users RLS policies

### User Debugging
- **`debug-user-creation.sql`** - Debugs user creation issues
- **`diagnose-user-creation.sql`** - Diagnoses user creation problems
- **`diagnose-patient-user-issue.sql`** - Diagnoses patient user issues

## Usage

These scripts are generally safe to run as they are read-only diagnostic queries:

```bash
# Using psql
psql -h your-host -d your-database -f diagnostics/check-current-data.sql

# Using your database client
# Copy and paste the SQL content into your query editor
```

## Purpose

- **Troubleshooting** - Identify issues with data or configuration
- **Monitoring** - Check system health and data integrity  
- **Investigation** - Understand current database state before applying fixes
- **Validation** - Verify that fixes have been applied correctly

## Best Practices

1. Run diagnostic scripts before applying fixes
2. Use results to understand the scope of issues
3. Save output for comparison after fixes are applied
4. These scripts should not modify data - report if they do

⚠️ **Note**: While these scripts are designed to be read-only, always review the SQL content before execution.
