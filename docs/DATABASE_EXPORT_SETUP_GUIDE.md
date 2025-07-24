# Database Export and Setup Guide

## Option 1: Export from Supabase (Recommended)

### Export Schema from Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Backups**
3. Click **Generate Schema Dump**
4. This will give you a complete SQL file with your current structure

### Export via Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Export schema (replace with your project reference)
supabase db dump --project-ref YOUR_PROJECT_REF --schema public --data-only=false > haccare-schema.sql

# Export data (if you want sample data)
supabase db dump --project-ref YOUR_PROJECT_REF --data-only=true > haccare-data.sql
```

### Export via pg_dump (if you have direct database access)
```bash
# Replace with your actual database connection details
pg_dump -h db.your-project-ref.supabase.co \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-privileges \
        > haccare-schema-export.sql
```

## Option 2: Use Our Complete Setup Script

We've created a comprehensive setup script at:
`sql-patches/setup/complete-database-setup.sql`

This script includes:
- ✅ All table structures
- ✅ Indexes for performance  
- ✅ Row Level Security policies
- ✅ Helper functions (including the fixed get_tenant_users)
- ✅ Triggers for auto-updating timestamps
- ✅ Proper permissions
- ✅ Empty data structure ready for production

## Setting up Super Admin User

### Method 1: Via Supabase Dashboard (Recommended)
1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter admin email and temporary password
4. Set **Email Confirm** to true
5. After user is created, run this SQL:

```sql
-- Update the user profile to be super admin
UPDATE user_profiles 
SET role = 'super_admin',
    first_name = 'System',
    last_name = 'Administrator'
WHERE email = 'your-admin@domain.com';
```

### Method 2: Force Password Change Setup
```sql
-- Create a function to force password change
CREATE OR REPLACE FUNCTION check_super_admin_password_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the default super admin
  IF NEW.email = 'admin@yourdomain.com' AND 
     NEW.encrypted_password = OLD.encrypted_password AND
     OLD.created_at < NOW() - INTERVAL '1 hour' THEN
    
    -- Force email confirmation to require password reset
    NEW.email_confirmed_at = NULL;
    NEW.confirmation_token = gen_random_uuid()::text;
    
    RAISE NOTICE 'Super admin must change password on first login';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to auth.users (Supabase specific)
DROP TRIGGER IF EXISTS force_admin_password_change ON auth.users;
CREATE TRIGGER force_admin_password_change
  BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION check_super_admin_password_change();
```

## Local Development Setup

### For Docker/Local PostgreSQL:
1. Start PostgreSQL with required extensions:
```bash
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: haccare
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - ./init:/docker-entrypoint-initdb.d/
```

2. Run the complete setup script:
```bash
psql -h localhost -U postgres -d haccare -f sql-patches/setup/complete-database-setup.sql
```

### For Supabase Local Development:
```bash
# Initialize Supabase locally
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Run custom setup
psql -h localhost -p 54322 -U postgres -d postgres -f sql-patches/setup/complete-database-setup.sql
```

## Environment-Specific Configuration

### Production Checklist:
- [ ] Change all default passwords
- [ ] Update CORS settings
- [ ] Configure backup schedule  
- [ ] Set up monitoring
- [ ] Enable SSL/TLS
- [ ] Configure rate limiting
- [ ] Set up audit logging

### Development Environment:
- [ ] Use environment variables for database connection
- [ ] Set up test data seeding scripts
- [ ] Configure local authentication
- [ ] Set up hot reloading for schema changes

## Data Migration

If you need to migrate existing data:

```sql
-- Export data from existing system
COPY patients TO '/tmp/patients.csv' WITH CSV HEADER;
COPY patient_vitals TO '/tmp/vitals.csv' WITH CSV HEADER;
-- ... other tables

-- Import to new system (ensure tenant_id is set correctly)
\COPY patients FROM '/tmp/patients.csv' WITH CSV HEADER;
-- ... other tables
```

## Testing the Setup

After running the setup, verify everything works:

```sql
-- Test 1: Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- Test 3: Check functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Test 4: Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';
```
