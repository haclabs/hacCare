# Unit Tests

Focused tests for specific components, functions, and database operations.

## Files

- **`test-connection.js`** - Tests database connection functionality
- **`test-database-functions.js`** - Tests individual database functions
- **`test-foreign-keys.js`** - Tests foreign key constraints and relationships

## Purpose

Unit tests verify that:
- Individual functions work correctly in isolation
- Database connections are properly established
- Foreign key relationships are maintained
- Specific components behave as expected

## Running Unit Tests

```bash
# Run individual unit tests
node tests/unit/test-connection.js
node tests/unit/test-database-functions.js
node tests/unit/test-foreign-keys.js
```

## Best Practices

- Each test should be independent
- Tests should be fast and focused
- Mock external dependencies when possible
- Use descriptive test names and assertions

## Notes

- Unit tests focus on specific functionality
- Should not depend on external state
- Can be run frequently during development
