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
