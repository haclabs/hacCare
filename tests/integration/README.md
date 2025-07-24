# Integration Tests

End-to-end integration tests that verify complete workflows and system behavior.

## Files

- **`test-final-tenant-creation.mjs`** - Comprehensive tenant creation tests for different user roles
- **`test-correct-tenant.mjs`** - Tests correct tenant selection and isolation  
- **`test-super-admin-only.mjs`** - Confirms only super admins can create tenants
- **`test-super-admin-tenant-switching.js`** - Tests super admin tenant switching functionality
- **`test-unique-tenant.mjs`** - Tests tenant uniqueness constraints

## Purpose

Integration tests verify that:
- Complete user workflows function correctly
- Multi-tenant isolation works as expected
- Role-based permissions are enforced
- System components work together properly

## Running Integration Tests

```bash
# Run individual integration tests
node tests/integration/test-final-tenant-creation.mjs
node tests/integration/test-super-admin-only.mjs
node tests/integration/test-unique-tenant.mjs
```

## Notes

- These tests interact with the actual database
- Tests should clean up after themselves
- Some tests require specific user authentication
- Run in a test environment, not production
