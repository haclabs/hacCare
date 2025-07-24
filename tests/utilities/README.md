# Utility Tests

Helper tests, maintenance utilities, and test support functions.

## Files

- **`test-acknowledgment.js`** - Tests acknowledgment functionality
- **`test-dashboard-update.js`** - Tests dashboard update operations
- **`test-deduplication.js`** - Tests data deduplication processes
- **`test-final-update.js`** - Tests final update operations
- **`test-no-changes-update.js`** - Tests update behavior when no changes exist
- **`test-update-behavior.js`** - Tests various update behaviors
- **`test-user-creation.js`** - Tests user creation functionality
- **`test-user-creation-console.js`** - Console-based user creation tests

## Purpose

Utility tests verify:
- Helper functions work correctly
- Data maintenance operations are safe
- User management workflows function properly
- Update operations behave as expected

## Running Utility Tests

```bash
# Run individual utility tests
node tests/utilities/test-user-creation.js
node tests/utilities/test-dashboard-update.js
node tests/utilities/test-deduplication.js
```

## Categories

### User Management
- User creation and management tests
- User workflow validation

### Data Operations  
- Update behavior testing
- Deduplication verification
- Data integrity checks

### UI/Dashboard
- Dashboard update functionality
- User interface behavior

## Notes

- These tests often involve data manipulation
- Some tests may require specific setup
- Useful for debugging and maintenance tasks
