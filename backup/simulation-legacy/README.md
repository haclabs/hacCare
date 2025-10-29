# Simulation System Backup Summary

This directory contains all the old simulation code that was moved during the cleanup and rebuild process on October 29, 2025.

## Directory Structure

```
backup/simulation-legacy/
├── migrations/           # Old database migrations (23 files)
├── functions/           # Old database functions and policies (2 files)  
├── api/                 # Old source code files
│   ├── simulation/      # Old simulation feature directory
│   └── AuthContext-simulation.tsx
└── sql-debug/          # SQL debug files from root (35 files)
```

## What Was Moved

### SQL Debug Files (35 files)
- All the debug SQL files that were created during the 3-day troubleshooting period
- Files like `debug_reset_function.sql`, `SUPABASE_EMERGENCY_RECOVERY.sql`, etc.
- These represent the various attempts to fix the broken reset functionality

### Database Migrations (23 files)
- All simulation-related database migrations from `database/migrations/`
- Files numbered from 008 to 030 that dealt with simulation schema changes
- Multiple attempts at fixing the reset function and snapshot system

### Database Functions (2 files)
- `simulation_snapshot_functions.sql`
- `simulation_rls.sql` (Row Level Security policies)

### Source Code Files
- `src/features/simulation/` - Complete old simulation frontend
- `src/contexts/auth/AuthContext-simulation.tsx` - Simulation-specific auth context

### Documentation Files
- `SIMULATION_OVERHAUL_PLAN.md`
- `SIMULATION_RESET_COMPARISON.md` 
- `SNAPSHOT_ANALYSIS.md`
- `URGENT_FIXES_APPLIED.md`

## Issues with Old System

The old simulation system had several critical problems:

1. **Reset Functionality**: The reset function either failed with errors, wiped patients completely, or lost vital readings
2. **State Management**: Poor separation between snapshot (immutable) and current (mutable) state
3. **Data Integrity**: No proper preservation of persistent identifiers (barcodes, patient IDs)
4. **Concurrent Simulations**: System couldn't handle multiple simulations from same template
5. **Database Design**: Overly complex with multiple failed migration attempts

## New System Benefits

The new system addresses these issues with:

1. **Clean Architecture**: Proper separation of concerns with immutable snapshots
2. **Persistent Identifiers**: Barcodes and patient IDs preserved across resets
3. **State Management**: Clear distinction between snapshot baseline and current mutable state
4. **Scalability**: Support for multiple concurrent simulations
5. **Maintainability**: Clean database schema and well-structured code

## Recovery Process

If needed, the old system can be partially restored from these backup files, but it's recommended to:

1. Review the backup files to understand what data/functionality was previously implemented
2. Port any missing features to the new system architecture
3. Use the SQL debug files to understand what scenarios were being tested
4. Reference the documentation files for business requirements

## Files Not Backed Up

- Live database data (this should be preserved in your production database)
- Configuration files that weren't simulation-specific
- Any simulation templates or snapshots created by users (these remain in the database)

## Next Steps

1. Implement the new simulation system using the clean architecture
2. Test the new reset functionality thoroughly
3. Migrate any essential features from the old system if needed
4. Update documentation to reflect the new system design

---

**Created**: October 29, 2025  
**Backup Size**: 60+ files across multiple directories  
**Reason**: Complete rebuild of simulation system with proper architecture