# Test Files Documentation

This directory contains test files for the hacCare multi-tenant system.

## 🧪 Core Tests

### `test-tenant-creation.mjs`
- **Purpose**: Tests basic tenant creation functionality
- **Use**: Verify that super admins can create tenants
- **Run**: `node tests/test-tenant-creation.mjs`

### `test-super-admin-only.mjs`
- **Purpose**: Confirms only super admins can create tenants
- **Use**: Validate RLS policies are working correctly
- **Run**: `node tests/test-super-admin-only.mjs`

### `test-final-tenant-creation.mjs`
- **Purpose**: Comprehensive tenant creation tests for different user roles
- **Use**: Full regression testing of tenant creation permissions
- **Run**: `node tests/test-final-tenant-creation.mjs`

## 🔧 Utility Tests

### `check-rls-status.mjs`
- **Purpose**: Check current RLS policies on tenants table
- **Use**: Debug RLS policy issues
- **Run**: `node tests/check-rls-status.mjs`

### `show-available-admins.js`
- **Purpose**: Display available users for tenant admin selection
- **Use**: Help with tenant creation by showing admin options
- **Run**: `node tests/show-available-admins.js`

## 🚀 Setup/Migration Tests

### `apply-rls-fix.mjs`
- **Purpose**: Apply RLS policies for tenant creation
- **Use**: One-time setup or policy fixes
- **Note**: Only run if RLS policies need to be reapplied

## 📊 Quick Test Commands

```bash
# Test tenant creation (recommended)
node tests/test-tenant-creation.mjs

# Check available admin users
node tests/show-available-admins.js

# Full tenant permission testing
node tests/test-final-tenant-creation.mjs
```

## 🗑️ When to Clean Up

Consider removing these files when:
- ✅ Your tenant system is fully stable
- ✅ You have proper unit tests in place
- ✅ You haven't needed them for 3+ months
- ✅ Your team is confident in the tenant functionality

## 📝 Notes

- All tests use the actual Supabase database
- Tests clean up after themselves (delete test tenants)
- Some tests require authentication with specific users
- Keep these files during active development
