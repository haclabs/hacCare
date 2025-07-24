# hacCare Multi-Tenant System: Complete Debugging & Deployment Guide

## 📋 Project Overview

**hacCare** is a multi-tenant healthcare management system built with React/TypeScript frontend and Supabase PostgreSQL backend. This document provides a comprehensive guide for debugging multi-tenant issues and deploying the system to various environments.

**Key Technologies:**
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL with Row Level Security)
- Authentication: Supabase Auth
- Multi-tenancy: Row Level Security (RLS) with tenant isolation

---

## 🐛 Issues Resolved (July 24, 2025)

### Issue #1: PGRST204 Database Error ✅ RESOLVED
**Problem:** Patient service attempting to insert non-database fields (vital signs data) as database columns.

**Error Message:** 
```
PGRST204: Could not find foreign table "temperature" in schema "public"
```

**Root Cause:** The `multiTenantPatientService.ts` functions were trying to insert calculated/derived fields like vital signs data directly into the patients table.

**Solution:** Added field filtering in patient service functions to exclude non-database fields before insertion.

**Files Modified:**
- `src/lib/multiTenantPatientService.ts`

**Code Changes:**
```typescript
// Before: Passing all data including computed fields
const { data, error } = await supabase
  .from('patients')
  .insert([patientData]);

// After: Filtering to only database fields
const dbFields = {
  first_name: patientData.first_name,
  last_name: patientData.last_name,
  // ... only actual DB columns
};
const { data, error } = await supabase
  .from('patients')
  .insert([dbFields]);
```

---

### Issue #2: Alert System Tenant Isolation ✅ RESOLVED
**Problem:** `patient_alerts` table missing `tenant_id` column, causing alerts to not be properly tenant-filtered.

**Symptoms:**
- Vital sign alerts created but not appearing in notifications
- Cross-tenant data leakage in alert system

**Root Cause:** The `patient_alerts` table was created without the `tenant_id` column that's required for proper multi-tenant isolation.

**Solution:** 
1. Added `tenant_id` column to `patient_alerts` table
2. Updated all alert creation functions to include `tenant_id`
3. Implemented proper RLS policies for tenant isolation
4. Created automatic tenant_id population triggers

**Files Modified:**
- `src/lib/alertService.ts`
- `src/types/index.ts`
- `sql-patches/fixes/add-tenant-id-to-alerts.sql`

**Database Migration:**
```sql
-- Add tenant_id column
ALTER TABLE patient_alerts ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Update existing alerts with tenant_id from patient relationship
UPDATE patient_alerts SET tenant_id = (
  SELECT p.tenant_id FROM patients p WHERE p.id = patient_alerts.patient_id
);

-- Make tenant_id required
ALTER TABLE patient_alerts ALTER COLUMN tenant_id SET NOT NULL;

-- Add RLS policies for tenant isolation
CREATE POLICY "Users can only access alerts from their tenant" ON patient_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND tenant_id = patient_alerts.tenant_id 
      AND is_active = true
    ) OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

---

### Issue #3: Patient Data Tenant Isolation ✅ RESOLVED
**Problem:** John Doe patient visible in wrong tenants (appearing in "System Default" when should only be in "Lethpoly").

**Symptoms:**
- Patient data appearing across tenant boundaries
- "Link Patients" vs "Patient Management" showing different data
- Inconsistent patient filtering behavior

**Root Cause:** The main `App.tsx` was using the generic `usePatients` hook instead of the tenant-aware `useMultiTenantPatients` hook.

**Solution:** Changed App.tsx to use proper multi-tenant data fetching.

**Files Modified:**
- `src/App.tsx`

**Code Changes:**
```typescript
// Before: Generic patient fetching
const { patients, loading, error } = usePatients();

// After: Tenant-aware patient fetching  
const { patients, loading, error } = useMultiTenantPatients();
```

**Result:** John Doe now only appears in Lethpoly tenant, proper tenant isolation maintained.

---

### Issue #4: Management Dashboard User Count Display ✅ RESOLVED
**Problem:** Management dashboard showing "Users (0)" instead of "Users (1)" for LethPoly tenant.

**Error Messages:**
1. `"column reference 'role' is ambiguous"`
2. `"Returned type character varying(20) does not match expected type text in column 3"`

**Root Cause:** 
1. **Ambiguous Column Reference:** Both `tenant_users` and `user_profiles` tables have a `role` column, causing PostgreSQL confusion
2. **Type Mismatch:** The `tenant_users.role` column has a CHECK constraint that makes PostgreSQL treat it as `VARCHAR(20)`, but the RPC function was declaring it as `TEXT`

**Solution:** Created comprehensive fix for the `get_tenant_users` RPC function.

**Files Modified:**
- `sql-patches/fixes/fix-get-tenant-users-type-mismatch.sql`

**Final Working Solution:**
```sql
CREATE OR REPLACE FUNCTION get_tenant_users(target_tenant_id UUID)
RETURNS TABLE(
  user_id UUID, 
  tenant_id UUID, 
  role VARCHAR(20),  -- Changed from TEXT to VARCHAR(20) to match constraint
  permissions TEXT[], 
  is_active BOOLEAN,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  department TEXT,
  license_number TEXT,
  phone TEXT,
  user_is_active BOOLEAN
) AS $$
DECLARE
  current_user_role TEXT;
  user_can_access BOOLEAN := FALSE;
BEGIN
  -- Get current user's role (FIXED: Added table alias to avoid ambiguity)
  SELECT up.role INTO current_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Permission checking logic...
  
  RETURN QUERY
  SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.role::VARCHAR(20),  -- Cast to match return type
    tu.permissions,
    tu.is_active,
    up.email,
    up.first_name,
    up.last_name,
    up.department,
    up.license_number,
    up.phone,
    up.is_active as user_is_active
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE tu.tenant_id = target_tenant_id
  AND tu.is_active = true
  ORDER BY up.first_name, up.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Result:** Management dashboard now correctly shows "Users (1)" for LethPoly tenant.

---

## 🏗️ Database Deployment Solutions

### Complete Database Setup Script
**Location:** `sql-patches/setup/complete-database-setup.sql`

**Features:**
- ✅ Complete schema with all tables, indexes, constraints
- ✅ Row Level Security (RLS) policies for multi-tenant isolation
- ✅ Helper functions (including fixed `get_tenant_users`)
- ✅ Automatic timestamp update triggers
- ✅ Proper permissions and security settings
- ✅ Empty structure ready for any environment

**Usage:**
```bash
# For any PostgreSQL database
psql -h localhost -U postgres -d haccare -f sql-patches/setup/complete-database-setup.sql
```

### Super Admin Setup
**Location:** `sql-patches/setup/setup-super-admin.sql`

**Process:**
1. Create user in Supabase Auth UI
2. Get user UUID from `auth.users` table
3. Update script with real UUID and email
4. Run script to create super admin profile

**Security Features:**
- ✅ User validation before profile creation
- ✅ Optional password change enforcement
- ✅ Proper role assignment and permissions
- ✅ Verification queries to confirm setup

### Export Options from Supabase

**Method 1: Supabase CLI**
```bash
# Export schema only
supabase db dump --project-ref YOUR_PROJECT_REF --schema public --data-only=false > haccare-schema.sql

# Export data only
supabase db dump --project-ref YOUR_PROJECT_REF --data-only=true > haccare-data.sql
```

**Method 2: Supabase Dashboard**
1. Navigate to Database → Backups
2. Click "Generate Schema Dump"
3. Download complete SQL file

**Method 3: Direct pg_dump**
```bash
pg_dump -h db.your-project-ref.supabase.co \
        -U postgres \
        -d postgres \
        --schema-only \
        --no-owner \
        --no-privileges \
        > haccare-schema-export.sql
```

---

## 🧹 Code Cleanup Process

### Files Removed During Cleanup:
- `src/components/Management/TenantUserDebugger.tsx` - Temporary debug component
- `src/lib/tenantServiceDirectQuery.ts` - Alternative implementation not needed
- `sql-patches/fixes/fix-get-tenant-users-ambiguous-role.sql` - Superseded by final fix
- `sql-patches/fixes/fix-get-tenant-users-complete.sql` - Not needed

### Debug Code Removed:
- Console logging statements from `ManagementDashboard.tsx`
- Verbose debugging from `tenantService.ts`
- Emoji-heavy log messages converted to production-appropriate logging

### Documentation Created:
- `docs/MANAGEMENT_DASHBOARD_FIX_SUMMARY.md` - Complete fix summary
- `docs/DATABASE_EXPORT_SETUP_GUIDE.md` - Deployment guide
- This comprehensive documentation file

---

## 🚀 Deployment Environments

### Local Development with Docker
```yaml
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
      - ./sql-patches/setup:/docker-entrypoint-initdb.d/
```

### Supabase Local Development
```bash
supabase init
supabase start
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres -f sql-patches/setup/complete-database-setup.sql
```

### Production Deployment Checklist
- [ ] Run complete database setup script
- [ ] Create super admin user with secure password
- [ ] Configure environment variables
- [ ] Set up SSL/TLS certificates
- [ ] Configure backup schedule
- [ ] Set up monitoring and logging
- [ ] Test all multi-tenant functionality
- [ ] Verify RLS policies are working
- [ ] Run verification queries

---

## 🔍 Testing & Verification Queries

### Verify Database Structure
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

### Test Multi-Tenant Isolation
```sql
-- Verify tenant data separation
SELECT 
  t.name as tenant_name,
  COUNT(DISTINCT p.id) as patient_count,
  COUNT(DISTINCT tu.user_id) as user_count,
  COUNT(DISTINCT pa.id) as alert_count
FROM tenants t
LEFT JOIN patients p ON t.id = p.tenant_id
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.is_active = true
LEFT JOIN patient_alerts pa ON t.id = pa.tenant_id
GROUP BY t.id, t.name
ORDER BY t.name;
```

### Test RPC Functions
```sql
-- Test get_tenant_users function
SELECT * FROM get_tenant_users('your-tenant-id-here');

-- Verify super admin access
SELECT 
  up.email,
  up.role,
  up.is_active,
  up.created_at
FROM user_profiles up
WHERE up.role = 'super_admin';
```

---

## 🎯 Key Learnings & Best Practices

### Multi-Tenant Architecture Lessons
1. **Consistent tenant_id inclusion:** Every table that stores tenant-specific data must have a `tenant_id` column
2. **RLS Policy Design:** Use consistent patterns for RLS policies across all tables
3. **Function Development:** Always use table aliases in complex queries to avoid ambiguous column references
4. **Type Consistency:** Match function return types exactly with database column constraints

### Debugging Methodology
1. **Start with Error Messages:** PostgreSQL error messages are usually very specific
2. **Check Column Types:** Type mismatches can be subtle but cause major issues
3. **Verify RLS Policies:** Row Level Security can cause unexpected "no data" situations
4. **Test Incrementally:** Fix one issue at a time and verify before moving to the next

### Production Deployment
1. **Use Complete Setup Scripts:** Avoid manual table creation in production
2. **Implement Proper Security:** Force password changes for default accounts
3. **Test Thoroughly:** Run verification queries after every deployment
4. **Document Everything:** Maintain comprehensive documentation for future deployments

---

## 📞 Support & Maintenance

### Common Issues & Solutions
- **Empty tenant user counts:** Check if `is_active` column exists and has proper data
- **Cross-tenant data leakage:** Verify RLS policies are enabled and properly configured
- **Function type errors:** Ensure return types match database column constraints exactly
- **Authentication issues:** Verify user exists in both `auth.users` and `user_profiles` tables

### Monitoring Queries
```sql
-- Daily health check queries
-- Check tenant user counts
SELECT t.name, COUNT(tu.user_id) as active_users
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.is_active = true
GROUP BY t.id, t.name;

-- Check RLS policy effectiveness
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Monitor system performance
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;
```

---

## 📚 Related Documentation Files
- `docs/MANAGEMENT_DASHBOARD_FIX_SUMMARY.md` - Detailed fix summary
- `docs/DATABASE_EXPORT_SETUP_GUIDE.md` - Deployment guide
- `sql-patches/fixes/fix-get-tenant-users-type-mismatch.sql` - Final working RPC function
- `sql-patches/setup/complete-database-setup.sql` - Complete database setup
- `sql-patches/setup/setup-super-admin.sql` - Super admin user setup

---

**Document Version:** 1.0  
**Last Updated:** July 24, 2025  
**Status:** Production Ready ✅
