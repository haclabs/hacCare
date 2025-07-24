# Setup SQL Scripts

Scripts for initial database setup and configuration.

## Files

- **`setup_multi_tenant.sql`** - Core multi-tenant database setup
- **`setup-complete-tenant-isolation.sql`** - Complete tenant isolation setup
- **`setup-profiles-and-tables.sql`** - User profiles and table setup
- **`setup-tenant-users-rls.sql`** - Tenant users Row Level Security setup
- **`production-subdomain-setup.sql`** - Production subdomain configuration

## Execution Order

When setting up from scratch, run scripts in this recommended order:

1. `setup_multi_tenant.sql` (core structure)
2. `setup-profiles-and-tables.sql` (user management)
3. `setup-tenant-users-rls.sql` (security policies)
4. `setup-complete-tenant-isolation.sql` (isolation rules)
5. `production-subdomain-setup.sql` (production config)

⚠️ **Note**: Some scripts may have dependencies on others. Review the script contents for specific requirements.
