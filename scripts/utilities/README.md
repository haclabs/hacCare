# Utility Scripts

General utility scripts for database operations, fixes, and maintenance.

## Files

- **`apply-fk-constraints.js`** - Applies foreign key constraints to the database
- **`apply-foreign-key-migration.js`** - Migrates foreign key relationships
- **`fix-foreign-keys.js`** - Fixes foreign key constraint issues
- **`quick-fix-foreign-keys.js`** - Quick fixes for foreign key problems

## Usage

These scripts typically require database connection and should be run carefully:

```bash
node apply-fk-constraints.js
node fix-foreign-keys.js
```

⚠️ **Warning**: These scripts modify database structure. Always backup your database before running.
