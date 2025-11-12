# Supabase Development Setup

This directory contains the Supabase CLI configuration and migrations for the hacCare project.

## Directory Structure

```
supabase/
├── config.toml          # Supabase CLI configuration
├── migrations/          # Database migration files (version controlled)
│   └── 20251111232257_baseline_schema.sql  # Current production baseline
├── functions/           # Edge Functions
├── seed.sql            # Seed data for local development
└── .gitignore          # Files to ignore in git
```

## Setup

The Supabase CLI is already installed and configured. Your project is linked to your Supabase instance.

## Common Commands

### Type Generation
```bash
# Generate TypeScript types from database schema
npm run supabase:types
```

### Migrations
```bash
# Create a new migration
npx supabase migration new <migration_name>

# List migrations
npx supabase migration list

# Apply pending migrations to remote database
npx supabase db push

# Pull schema changes from remote (requires Docker)
npx supabase db pull
```

### Local Development (requires Docker)
```bash
# Start local Supabase instance
npx supabase start

# Stop local instance
npx supabase stop

# Reset local database (applies migrations + seeds)
npx supabase db reset

# View Supabase Studio locally
# After running 'start', open: http://localhost:54323
```

### Database Inspection
```bash
# View current migration status
npx supabase migration list

# Squash migrations (combine multiple into one)
npx supabase migration squash

# Repair migration history (if needed)
npx supabase migration repair --status <applied|reverted> <timestamp>
```

## Migration Workflow

1. **Create a new migration:**
   ```bash
   npx supabase migration new add_new_feature
   ```

2. **Edit the migration file** in `supabase/migrations/`

3. **Test locally** (if Docker is available):
   ```bash
   npx supabase db reset  # Apply all migrations
   ```

4. **Push to production:**
   ```bash
   npx supabase db push
   ```

5. **Update TypeScript types:**
   ```bash
   npm run supabase:types
   ```

## Baseline Migration

The current production database schema has been established as a baseline in:
- `20251111232257_baseline_schema.sql`

This represents the state of the database as of November 11, 2025. All future schema changes should be made through new migration files.

## Legacy Files

Old migration files from `database/migrations/` have been archived to:
- `archive/database-legacy-20251111/`

These are kept for reference but are no longer used. The Supabase CLI workflow is now the single source of truth.

## Environment Variables

Make sure these are set in your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

### Docker Not Available
If you don't have Docker installed, you can still:
- Create and push migrations to remote
- Generate TypeScript types
- View migration history

You cannot:
- Run local Supabase instance
- Test migrations locally before pushing

### Migration History Mismatch
If you see migration history errors:
```bash
npx supabase migration repair --status reverted <timestamp>
```

## Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Local Development](https://supabase.com/docs/guides/local-development)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
