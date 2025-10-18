#!/bin/bash

# Phase 2: SQL Organization - Create Clean Database Structure
# This script creates the new database/ directory and organizes SQL files

set -e

echo "🗄️  Phase 2: SQL Organization"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Create clean database directory structure
echo -e "${YELLOW}Step 1: Creating database/ directory structure...${NC}"
mkdir -p database/migrations
mkdir -p database/policies
mkdir -p database/functions
mkdir -p database/views
mkdir -p database/seeds
mkdir -p database/maintenance
echo -e "${GREEN}✓ Database directories created${NC}"
echo ""

# Step 2: Copy production migrations (keep chronological order)
echo -e "${YELLOW}Step 2: Organizing production migrations...${NC}"
cp docs/development/database/migrations/001_enhance_session_tracking.sql database/migrations/
cp docs/development/database/migrations/002_create_doctors_orders_table.sql database/migrations/
cp docs/development/database/migrations/003_admin_dashboard_schema.sql database/migrations/
cp docs/development/database/migrations/004_add_doctor_name_to_orders.sql database/migrations/
cp docs/development/database/migrations/005_add_oxygen_delivery_to_vitals.sql database/migrations/
cp docs/development/database/migrations/006_labs_schema.sql database/migrations/
cp docs/development/database/migrations/007_add_labs_user_profile_fkeys.sql database/migrations/
echo -e "${GREEN}✓ Copied 7 production migrations${NC}"
echo ""

# Step 3: Copy simulation migrations (as 008-011)
echo -e "${YELLOW}Step 3: Organizing simulation migrations...${NC}"
cp docs/development/simulation-v2/001_drop_old_simulation_tables.sql database/migrations/008_drop_old_simulation_tables.sql
cp docs/development/simulation-v2/002_create_new_simulation_schema.sql database/migrations/009_create_simulation_schema.sql
cp docs/development/simulation-v2/003_create_simulation_rls_policies.sql database/migrations/010_simulation_rls_policies.sql
cp docs/development/simulation-v2/004_create_simulation_functions.sql database/migrations/011_simulation_functions.sql
echo -e "${GREEN}✓ Organized 4 simulation migrations as 008-011${NC}"
echo ""

# Step 4: Copy additional feature migrations
echo -e "${YELLOW}Step 4: Adding feature migrations...${NC}"
cp docs/development/database/migrations/add_backup_audit_log_foreign_key.sql database/migrations/012_backup_audit_foreign_keys.sql
cp docs/development/database/migrations/implement_reusable_simulation_labels.sql database/migrations/013_reusable_simulation_labels.sql
cp docs/development/database/migrations/update_reset_simulation_preserve_ids.sql database/migrations/014_reset_simulation_preserve_ids.sql
echo -e "${GREEN}✓ Added 3 feature migrations as 012-014${NC}"
echo ""

# Step 5: Copy database functions
echo -e "${YELLOW}Step 5: Organizing database functions...${NC}"
cp docs/development/database/functions/duplicate_patient_to_tenant_enhanced.sql database/functions/
cp docs/development/database/functions/universal_insert_functions.sql database/functions/
cp docs/development/database/functions/update_user_profile_admin.sql database/functions/
cp docs/development/simulation-v2/FINAL_CORRECT_snapshot_functions.sql database/functions/simulation_snapshot_functions.sql
cp docs/development/simulation-v2/auto_set_tenant_id_trigger.sql database/functions/
echo -e "${GREEN}✓ Organized 5 database functions${NC}"
echo ""

# Step 6: Consolidate RLS policies
echo -e "${YELLOW}Step 6: Consolidating RLS policies...${NC}"
cp docs/development/database/policies/super_admin_rls_policies.sql database/policies/super_admin_rls.sql
cp docs/development/database/policies/patient_vitals_rls_simple.sql database/policies/patient_vitals_rls.sql
cp docs/development/simulation-v2/setup_simulation_portal_rls.sql database/policies/simulation_rls.sql
echo -e "${GREEN}✓ Consolidated 3 main RLS policy files${NC}"
echo ""

# Step 7: Copy seed data
echo -e "${YELLOW}Step 7: Organizing seed data...${NC}"
cp docs/development/database/seeds/006_labs_reference_data.sql database/seeds/labs_reference_data.sql
echo -e "${GREEN}✓ Organized 1 seed file${NC}"
echo ""

# Step 8: Copy maintenance scripts
echo -e "${YELLOW}Step 8: Organizing maintenance scripts...${NC}"
cp docs/development/scripts/maintenance/production_deployment_check.sql database/maintenance/
cp docs/development/scripts/maintenance/security_audit.sql database/maintenance/
cp docs/development/sql/add_performance_indexes.sql database/maintenance/performance_indexes.sql
echo -e "${GREEN}✓ Organized 3 maintenance scripts${NC}"
echo ""

# Step 9: Archive diagnostic/check files
echo -e "${YELLOW}Step 9: Archiving diagnostic files...${NC}"
mkdir -p archive/sql/diagnostics
mkdir -p archive/sql/checks

# Archive diagnostic files
find docs/development -name "*diagnose*.sql" -exec cp {} archive/sql/diagnostics/ \; 2>/dev/null || true
find docs/development -name "*check*.sql" -exec cp {} archive/sql/checks/ \; 2>/dev/null || true
find docs/development -name "*verify*.sql" -exec cp {} archive/sql/checks/ \; 2>/dev/null || true

DIAG_COUNT=$(ls archive/sql/diagnostics/ 2>/dev/null | wc -l)
CHECK_COUNT=$(ls archive/sql/checks/ 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Archived ${DIAG_COUNT} diagnostic files${NC}"
echo -e "${GREEN}✓ Archived ${CHECK_COUNT} check/verify files${NC}"
echo ""

# Step 10: Archive remaining simulation-v2 files
echo -e "${YELLOW}Step 10: Archiving remaining simulation files...${NC}"
mkdir -p archive/sql/simulation-v2-dev
cp docs/development/simulation-v2/add_tenant_id_columns*.sql archive/sql/simulation-v2-dev/ 2>/dev/null || true
cp docs/development/simulation-v2/FINAL_save_snapshot_all_fixes.sql archive/sql/simulation-v2-dev/ 2>/dev/null || true
cp docs/development/simulation-v2/force_drop_functions.sql archive/sql/simulation-v2-dev/ 2>/dev/null || true
cp docs/development/simulation-v2/implement_option4_label_printing.sql archive/sql/simulation-v2-dev/ 2>/dev/null || true
SIM_COUNT=$(ls archive/sql/simulation-v2-dev/ 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Archived ${SIM_COUNT} simulation development files${NC}"
echo ""

# Step 11: Archive remaining SQL utilities
echo -e "${YELLOW}Step 11: Archiving SQL utilities...${NC}"
mkdir -p archive/sql/utilities
cp docs/development/sql/*.sql archive/sql/utilities/ 2>/dev/null || true
cp docs/development/database/cleanup_old_sessions.sql archive/sql/utilities/ 2>/dev/null || true
UTIL_COUNT=$(ls archive/sql/utilities/ 2>/dev/null | wc -l)
echo -e "${GREEN}✓ Archived ${UTIL_COUNT} utility files${NC}"
echo ""

# Step 12: Create database README
echo -e "${YELLOW}Step 12: Creating database documentation...${NC}"
cat > database/README.md << 'EOF'
# hacCare Database Schema

This directory contains all production database migrations, functions, policies, and maintenance scripts.

## Directory Structure

```
database/
├── migrations/        Production migrations (run in order)
├── functions/         Database functions and stored procedures
├── policies/          Row Level Security (RLS) policies
├── seeds/            Reference data and test data
├── maintenance/      Maintenance and optimization scripts
└── views/            Database views (if any)
```

## Migration Order

Migrations must be run in numerical order:

1. `001_enhance_session_tracking.sql` - Session management
2. `002_create_doctors_orders_table.sql` - Doctor's orders
3. `003_admin_dashboard_schema.sql` - Admin features
4. `004_add_doctor_name_to_orders.sql` - Orders enhancement
5. `005_add_oxygen_delivery_to_vitals.sql` - Vitals enhancement
6. `006_labs_schema.sql` - Lab panels and results
7. `007_add_labs_user_profile_fkeys.sql` - Lab foreign keys
8. `008_drop_old_simulation_tables.sql` - Simulation cleanup
9. `009_create_simulation_schema.sql` - Simulation v2 schema
10. `010_simulation_rls_policies.sql` - Simulation security
11. `011_simulation_functions.sql` - Simulation functions
12. `012_backup_audit_foreign_keys.sql` - Backup system
13. `013_reusable_simulation_labels.sql` - Label printing
14. `014_reset_simulation_preserve_ids.sql` - Simulation reset

## Running Migrations

### Fresh Database Setup
```bash
# Run all migrations in order
for file in database/migrations/*.sql; do
  psql -f "$file"
done
```

### Adding New Migration
1. Create file with next number: `015_your_migration.sql`
2. Test on development database
3. Update this README with description
4. Commit to git

## Database Functions

Key functions:
- `duplicate_patient_to_tenant_enhanced.sql` - Multi-tenant patient duplication
- `simulation_snapshot_functions.sql` - Simulation state management
- `universal_insert_functions.sql` - Safe insert helpers
- `update_user_profile_admin.sql` - Admin user management

## RLS Policies

Security policies:
- `super_admin_rls.sql` - Super admin access
- `patient_vitals_rls.sql` - Vital signs security
- `simulation_rls.sql` - Simulation portal access

## Maintenance

Regular maintenance scripts:
- `production_deployment_check.sql` - Pre-deployment validation
- `security_audit.sql` - Security review
- `performance_indexes.sql` - Index optimization

## Seed Data

Reference data:
- `labs_reference_data.sql` - Lab panels and normal ranges

## Important Notes

⚠️ **Always backup before running migrations**
⚠️ **Test migrations on staging first**
⚠️ **Never modify existing migrations - create new ones**
⚠️ **Document all schema changes**

## Rollback Procedures

If a migration fails:
1. Check the error message
2. Restore from backup if needed
3. Fix the migration file
4. Test again on staging

## Support

For database issues:
- Check migration logs
- Review RLS policies
- Run security audit
- Contact DevOps team
EOF
echo -e "${GREEN}✓ Database README created${NC}"
echo ""

# Summary
echo "=============================="
echo -e "${GREEN}✅ Phase 2 Complete!${NC}"
echo ""
echo "Database Organization Summary:"
echo "  📁 Migrations: 14 files (chronological)"
echo "  🔧 Functions: 5 files"
echo "  🔒 Policies: 3 files (consolidated)"
echo "  🌱 Seeds: 1 file"
echo "  🛠️  Maintenance: 3 files"
echo ""
echo "Archive Summary:"
echo "  📦 Diagnostics: ${DIAG_COUNT} files"
echo "  ✓ Checks: ${CHECK_COUNT} files"
echo "  🔬 Sim Dev: ${SIM_COUNT} files"
echo "  🔧 Utilities: ${UTIL_COUNT} files"
echo ""
echo "Next steps:"
echo "  1. Review database/README.md"
echo "  2. Verify migration order"
echo "  3. Test build: npm run build"
echo "  4. Git commit: 'Phase 2: SQL organization'"
echo ""
