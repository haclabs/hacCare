# hacMap Database Migration

## Quick Start

You're seeing the "Failed to load markers" error because the database tables haven't been created yet.

### Deploy to Supabase

1. **Open Supabase SQL Editor:**
   - Go to your Supabase project
   - Navigate to: SQL Editor (in left sidebar)

2. **Run the Migration:**
   - Click "+ New Query"
   - Copy the entire contents of `database/migrations/hacmap_tables.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

3. **Verify Installation:**
   The script will create:
   - ✅ 4 enums (device types, reservoir types, orientations, wound types)
   - ✅ 3 tables (avatar_locations, devices, wounds)
   - ✅ Indexes for performance
   - ✅ RLS policies for tenant isolation
   - ✅ Triggers for auto-updating timestamps

4. **Check Results:**
   Run this query to verify tables exist:
   ```sql
   select table_name from information_schema.tables 
   where table_schema = 'public' 
   and table_name in ('avatar_locations', 'devices', 'wounds');
   ```

   You should see 3 rows returned.

### Troubleshooting

**Error: "relation "tenants" does not exist"**
- The migration expects a `tenants` table. If you don't have one, you'll need to modify the foreign key references.

**Error: "relation "patient_profiles" does not exist"**
- The migration expects a `patient_profiles` table. Verify your patient table name and adjust if needed.

**Error: "role "authenticated" does not exist"**
- This is standard in Supabase. If you're using a different auth system, adjust the GRANT statements.

### Tables Created

1. **avatar_locations** - Stores x/y coordinates on body diagram
   - Links to: tenants, patient_profiles, auth.users
   
2. **devices** - Medical device documentation
   - Links to: avatar_locations, tenants, patient_profiles, auth.users
   
3. **wounds** - Wound assessment documentation
   - Links to: avatar_locations, tenants, patient_profiles, auth.users

### Security

All tables have Row Level Security (RLS) enabled with policies that enforce:
- Users can only access data from their own tenant
- Tenant ID is extracted from JWT claims: `request.jwt.claims->>'tenant_id'`

### After Migration

Once deployed, refresh your hacCare app and the hacMap feature should work properly!
