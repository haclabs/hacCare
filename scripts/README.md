# Scripts Directory

This directory contains utility scripts for the hacCare application.

## Structure

- **`setup/`** - Scripts for initial setup and configuration
- **`utilities/`** - General utility scripts for database operations and fixes
- **`diagnostics/`** - Scripts for checking system status and diagnosing issues

## Usage

Make sure you have the proper environment variables set before running any scripts.

### Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Running Scripts
Most scripts can be run with Node.js:
```bash
node scripts/setup/setup-multi-tenant.js
node scripts/diagnostics/check-data.js
```

Some scripts use ES modules (.mjs) and may require specific Node.js flags.
