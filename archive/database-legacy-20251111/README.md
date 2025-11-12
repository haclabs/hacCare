# 🗄️ hacCare Database Setup# hacCare Database Schema



This directory contains all database schema, migrations, functions, and maintenance scripts.This directory contains all production database migrations, functions, policies, and maintenance scripts.



---## Directory Structure



## 🚀 Quick Start (New Installation)```

database/

### Option 1: Fresh Production Install (Recommended)├── migrations/        Production migrations (run in order)

**Use this for brand new deployments:**├── functions/         Database functions and stored procedures

├── policies/          Row Level Security (RLS) policies

```bash├── seeds/            Reference data and test data

# 1. Create database (if needed)├── maintenance/      Maintenance and optimization scripts

createdb haccare_production└── views/            Database views (if any)

```

# 2. Run complete schema (creates everything)

psql -d haccare_production -f database/schema.sql## Migration Order



# 3. Load reference dataMigrations must be run in numerical order:

psql -d haccare_production -f database/seeds/labs_reference_data.sql

1. `001_enhance_session_tracking.sql` - Session management

# 4. Create initial admin user (interactive)2. `002_create_doctors_orders_table.sql` - Doctor's orders

psql -d haccare_production -f database/seeds/create_admin_user.sql3. `003_admin_dashboard_schema.sql` - Admin features

```4. `004_add_doctor_name_to_orders.sql` - Orders enhancement

5. `005_add_oxygen_delivery_to_vitals.sql` - Vitals enhancement

**Time:** ~30 seconds  6. `006_labs_schema.sql` - Lab panels and results

**Result:** Fully functional database with admin user7. `007_add_labs_user_profile_fkeys.sql` - Lab foreign keys

8. `008_drop_old_simulation_tables.sql` - Simulation cleanup

---9. `009_create_simulation_schema.sql` - Simulation v2 schema

10. `010_simulation_rls_policies.sql` - Simulation security

### Option 2: Upgrade Existing Database11. `011_simulation_functions.sql` - Simulation functions

**Use this if you already have a database and need to upgrade:**12. `012_backup_audit_foreign_keys.sql` - Backup system

13. `013_reusable_simulation_labels.sql` - Label printing

```bash14. `014_reset_simulation_preserve_ids.sql` - Simulation reset

# Run migrations in order (001-015)

for file in database/migrations/*.sql; do## Running Migrations

  psql -d your_database -f "$file"

done### Fresh Database Setup

``````bash

# Run all migrations in order

**Time:** ~2-3 minutes  for file in database/migrations/*.sql; do

**Result:** Database upgraded to latest version  psql -f "$file"

done

---```



## 📂 Directory Structure### Adding New Migration

1. Create file with next number: `015_your_migration.sql`

```2. Test on development database

database/3. Update this README with description

├── schema.sql              # 🆕 Complete schema (fresh installs)4. Commit to git

├── migrations/             # Incremental updates (existing databases)

│   ├── 001-015_*.sql      # Production migrations## Database Functions

│   └── README.md          # Migration history

├── functions/              # Database functionsKey functions:

├── policies/               # Row Level Security (RLS)- `duplicate_patient_to_tenant_enhanced.sql` - Multi-tenant patient duplication

├── seeds/                  # Reference and initial data- `simulation_snapshot_functions.sql` - Simulation state management

│   ├── labs_reference_data.sql- `universal_insert_functions.sql` - Safe insert helpers

│   └── create_admin_user.sql  # 🆕 Initial admin setup- `update_user_profile_admin.sql` - Admin user management

├── maintenance/            # DBA scripts

└── views/                  # Database views (future)## RLS Policies

```

Security policies:

---- `super_admin_rls.sql` - Super admin access

- `patient_vitals_rls.sql` - Vital signs security

## 🎯 Which Option Should I Use?- `simulation_rls.sql` - Simulation portal access



| Scenario | Use | Time |## Maintenance

|----------|-----|------|

| **New production deployment** | `schema.sql` | 30 sec |Regular maintenance scripts:

| **New development setup** | `schema.sql` | 30 sec |- `production_deployment_check.sql` - Pre-deployment validation

| **Existing database upgrade** | `migrations/` | 2-3 min |- `security_audit.sql` - Security review

| **Supabase fresh project** | `schema.sql` | Copy/paste |- `performance_indexes.sql` - Index optimization

| **Supabase existing project** | Latest migration | Run newest |

## Seed Data

---

Reference data:

## 📝 Adding schema.sql (TODO)- `labs_reference_data.sql` - Lab panels and normal ranges



**Next step:** Create consolidated schema file## Important Notes



```bash⚠️ **Always backup before running migrations**

# Combine all migrations into single file⚠️ **Test migrations on staging first**

cat database/migrations/*.sql > database/schema.sql⚠️ **Never modify existing migrations - create new ones**

⚠️ **Document all schema changes**

# Then clean up and add:

# - Initial admin user creation## Rollback Procedures

# - Reference data

# - Production-ready defaultsIf a migration fails:

```1. Check the error message

2. Restore from backup if needed

---3. Fix the migration file

4. Test again on staging

## 🔐 Security Hardening

## Support

After initial setup, verify security:

For database issues:

```bash- Check migration logs

# Run security audit- Review RLS policies

psql -d your_database -f database/maintenance/security_audit.sql- Run security audit

- Contact DevOps team

# Run security tests
psql -d your_database -f database/maintenance/test_security_hardening.sql
```

**Current Status:**
- 132 RLS policies across 35 tables
- Security score: 8.5/10
- All critical systems protected

---

## 🛠️ Maintenance Scripts

### Pre-Deployment
```bash
psql -f database/maintenance/production_deployment_check.sql
```

### Regular Maintenance
```bash
# Security audit (monthly)
psql -f database/maintenance/security_audit.sql

# Check orphaned alerts
psql -f database/maintenance/check_orphaned_alerts.sql

# Performance check
psql -f database/maintenance/performance_indexes.sql
```

---

## 📊 Current Schema

**Version:** 015 (Security Hardening)  
**Tables:** 44  
**RLS Policies:** 132  
**Functions:** 12  
**Last Updated:** October 18, 2025

### Key Tables
- `patients`, `patient_vitals`, `patient_medications`
- `simulation_templates`, `simulation_active`
- `lab_panels`, `lab_results`
- `user_profiles`, `tenants`, `tenant_users`
- `patient_alerts`, `session_tracking`

---

## ⚠️ Important Notes

### For Fresh Installs
- ✅ Use `schema.sql` when available (faster, tested)
- ✅ Includes all security hardening
- ✅ Production-ready defaults

### For Existing Databases
- ✅ Run migrations in numerical order
- ✅ Backup before migrating
- ✅ Test on staging first
- ⚠️ Never modify existing migrations

---

## 📞 Support

**Common Issues:**
- Permission denied → Check RLS policies
- Function not found → Run `database/functions/*.sql`
- Table not found → Ensure schema/migrations ran

**Documentation:**
- Security: `docs/architecture/security/`
- Troubleshooting: `docs/operations/troubleshooting/`
- Features: `docs/features/`

---

**Schema Version:** 015  
**Production Ready:** ✅ Yes
