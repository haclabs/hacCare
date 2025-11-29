# Schema Dump Instructions

The dev container has network limitations. To dump the production schema, run this on your **local machine** (not in the dev container):

## Quick Command

```bash
cd /path/to/hacCare

# Dump production schema
PGPASSWORD='h9TX9HqssQ3pHApa' pg_dump \
  "postgresql://postgres:h9TX9HqssQ3pHApa@db.cwhqffubvqolhnkecyck.supabase.co:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-acl \
  --file=supabase/schema.sql

# Commit the updated schema
git add supabase/schema.sql
git commit -m "chore: Update production schema dump"
git push
```

## Or Use the Script

```bash
cd docs/operations/release
./dump-production.sh
```

## Security Note

After dumping, you should **rotate the database password** in Supabase dashboard:
1. Go to https://supabase.com/dashboard/project/cwhqffubvqolhnkecyck/settings/database
2. Click "Reset database password"
3. Update your local `.env` files with the new password
