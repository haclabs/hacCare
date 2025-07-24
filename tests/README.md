# Tests Directory

This directory contains organized test files for the hacCare multi-tenant system.

## Structure

- **`integration/`** - End-to-end integration tests
- **`unit/`** - Unit tests for specific components/functions  
- **`utilities/`** - Utility tests and test helpers
- **`run-tests.js`** - Test runner script

## Running Tests

### All Tests
```bash
node tests/run-tests.js
```

### Specific Test Categories
```bash
# Integration tests
node tests/integration/test-final-tenant-creation.mjs

# Unit tests  
node tests/unit/test-connection.js

# Utility tests
node tests/utilities/test-user-creation.js
```

## Test Categories

### Integration Tests
Full end-to-end tests that verify complete workflows:
- Tenant creation and management
- User permissions and RLS
- Super admin functionality

### Unit Tests
Focused tests for specific components:
- Database connections
- Individual functions
- Foreign key constraints

### Utility Tests
Helper tests and maintenance utilities:
- Data deduplication
- User creation flows
- Dashboard updates

## Quick Test Commands

```bash
# Test tenant system
node tests/integration/test-final-tenant-creation.mjs

# Test database connection
node tests/unit/test-connection.js

# Test user creation
node tests/utilities/test-user-creation.js
