# Diagnostic Scripts

Scripts for checking system status, diagnosing issues, and monitoring application health.

## Files

- **`check-data.js`** - Checks data integrity and consistency
- **`check-rls-status.mjs`** - Checks Row Level Security (RLS) status
- **`check-tenant-rls.cjs`** - Checks tenant-specific RLS policies (CommonJS)
- **`check-tenant-rls.js`** - Checks tenant-specific RLS policies
- **`show-available-admins.js`** - Shows available admin users
- **`apply-rls-fix.mjs`** - Applies fixes for RLS issues

## Usage

Most diagnostic scripts are safe to run and provide read-only information:

```bash
node check-data.js
node show-available-admins.js
node check-rls-status.mjs
```

For fix scripts, use caution:
```bash
node apply-rls-fix.mjs
```

## Notes

- `.mjs` files use ES modules
- `.cjs` files use CommonJS explicitly  
- Regular `.js` files follow your package.json module setting
