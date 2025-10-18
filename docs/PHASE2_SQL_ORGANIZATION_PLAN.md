# Phase 2: SQL Migration Organization

**Status:** Ready to Execute  
**Risk Level:** Low (documentation/organization only)  
**Prerequisites:** Phase 1 Complete ✅

## Objectives

1. Create clean database/ directory structure
2. Organize migrations chronologically
3. Separate production migrations from development scripts
4. Document migration history
5. Improve deployment process

## Current State

### Migration Files Location
```
docs/development/database/migrations/
├── 001_initial_schema.sql
├── 002_add_patients_table.sql
├── 003_admin_dashboard_schema.sql
├── ... (many more, mixed order)
└── Various production migrations
```

### Problems
- ❌ Migrations scattered across multiple directories
- ❌ No clear numbering/versioning
- ❌ Hard to identify production vs. development
- ❌ Deployment order unclear

## Proposed Structure

```
database/
├── README.md                      # Migration guide
├── migrations/                    # Production migrations (chronological)
│   ├── 001_initial_schema.sql
│   ├── 002_patients_table.sql
│   ├── 003_vitals_system.sql
│   ├── 004_medications.sql
│   ├── 005_admin_dashboard.sql
│   ├── 006_simulation_system.sql
│   ├── 007_labs_integration.sql
│   ├── 008_backup_system.sql
│   └── 009_session_management.sql
│
├── seeds/                         # Test/demo data
│   ├── 01_demo_tenants.sql
│   ├── 02_demo_users.sql
│   └── 03_demo_patients.sql
│
├── policies/                      # RLS policies (by feature)
│   ├── patients_rls.sql
│   ├── vitals_rls.sql
│   ├── medications_rls.sql
│   └── admin_rls.sql
│
├── functions/                     # Database functions (by feature)
│   ├── session_management.sql
│   ├── simulation_functions.sql
│   └── tenant_management.sql
│
└── views/                         # Database views
    ├── patient_overview.sql
    └── admin_dashboard_views.sql
```

## Migration Inventory

### Core Schema Migrations (Production)
1. ✅ `001_initial_schema.sql` - Base tables (users, profiles, tenants)
2. ✅ `002_patients_table.sql` - Patient management
3. ✅ `003_vitals_system.sql` - Vital signs tracking
4. ✅ `004_medications.sql` - Medication administration
5. ✅ `005_admin_dashboard.sql` - Admin features
6. ✅ `006_simulation_system.sql` - Simulation v2
7. ✅ `007_labs_integration.sql` - Lab panels & results
8. ✅ `008_backup_system.sql` - Backup & restore
9. ✅ `009_session_management.sql` - Session logging

### Additional Features (if exist)
- Diabetic records
- Wound care
- Doctor's orders
- Handover notes
- Advanced directives

## Implementation Steps

### Step 2.1: Analyze Current Migrations
```bash
# List all migration files
find docs/development -name "*.sql" -type f | \
  grep -v "debug" | grep -v "fix" | grep -v "test" | \
  sort
```

### Step 2.2: Create Database Directory Structure
```bash
mkdir -p database/{migrations,seeds,policies,functions,views}
```

### Step 2.3: Identify Core Migrations
Review each migration file and categorize:
- Production migrations → database/migrations/
- RLS policies → database/policies/
- Functions → database/functions/
- Views → database/views/
- Demo data → database/seeds/

### Step 2.4: Rename & Organize
Copy migrations to new structure with proper numbering

### Step 2.5: Create Migration Documentation
Document:
- Migration order
- What each migration does
- Dependencies between migrations
- Rollback procedures

### Step 2.6: Create Deployment Script
Automated script to run migrations in order

## Success Criteria

- [ ] Clean database/ directory created
- [ ] All production migrations numbered sequentially
- [ ] Policies separated from migrations
- [ ] Functions separated from migrations
- [ ] Migration README created
- [ ] Deployment script created
- [ ] Build still passes
- [ ] Git committed

## Safety Measures

1. **Copy, Don't Move (Initially)**
   - Keep original files in place
   - Copy to new structure
   - Verify everything works
   - Then remove originals

2. **Document Everything**
   - Which file came from where
   - What each migration does
   - Dependencies

3. **Test Migration Order**
   - Can we rebuild database from scratch?
   - Are there any circular dependencies?

## Estimated Time

- Analysis: 30 minutes
- Organization: 1 hour
- Documentation: 30 minutes
- Testing: 30 minutes
- **Total: 2.5 hours**

## Next Steps After Phase 2

Once SQL is organized, we can proceed to:
- Phase 3: Feature-based architecture (src/ reorganization)
- Component consolidation
- Type improvements
- Test coverage

## Ready to Execute?

This phase is low-risk because we're only organizing files, not changing code. The database directory will be separate from docs/, making it clear what's production-ready.

Shall I proceed with Phase 2?
