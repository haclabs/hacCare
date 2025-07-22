# Multi-Tenant Setup Guide for hacCare Platform

This guide explains how to set up and use the multi-tenant functionality in the hacCare platform.

## Overview

The hacCare platform now supports multiple organizations (tenants) with complete data isolation. Each organization has its own:
- Patient records
- User accounts  
- Vital signs data
- Patient notes
- Alerts and notifications

## Database Setup

### 1. Run the Migration

Execute the migration SQL in your Supabase project:

```sql
-- Located in: supabase/migrations/001_add_organizations_and_tenant_support.sql
```

This migration will:
- Create the `organizations` table
- Add `organization_id` columns to existing tables
- Set up Row Level Security (RLS) policies
- Create helper functions and triggers

### 2. Seed Test Data

Run the seed script to create sample organizations:

```sql
-- Located in: supabase/seeds/001_organizations_test_data.sql
```

This creates:
- General Hospital
- Pediatric Care Center  
- Emergency Medical Services

## User Roles

### Super Admin
- Can view and manage all organizations
- Can switch between organizations to view different tenant data
- Can create, edit, and delete organizations
- Access to tenant management panel

### Admin
- Can manage users within their organization
- Cannot access other organizations' data

### Nurse
- Can view and manage patients within their organization
- Cannot access other organizations' data

## Features

### Tenant Management UI

Super admins can access the tenant management panel at `/admin/tenants`:

1. **Organization Overview**: View all organizations with statistics
2. **Organization Switching**: Switch between organizations to view different tenant data
3. **CRUD Operations**: Create, edit, and delete organizations
4. **Statistics**: View user count, patient count, and active patient count per organization

### Data Isolation

- **Row Level Security**: Database-level security prevents cross-tenant data access
- **Query Filtering**: All queries automatically filter by organization
- **Context-Aware**: UI automatically updates when switching organizations

### Organization Switching

Super admins can switch between organizations:
1. Navigate to Tenant Management
2. Click "Switch To" on any organization card
3. All patient data will update to show only that organization's data

## Configuration

### Environment Variables

Ensure your `.env` file has the correct Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### User Setup

1. Create users in Supabase Auth
2. Assign them to organizations via the `user_profiles` table
3. Set appropriate roles (`nurse`, `admin`, `super_admin`)

## API Changes

### Patient Service

The patient service now accepts an optional `organizationId` parameter:

```typescript
// Fetch all patients for current organization
const patients = await fetchPatients(organizationId);

// Create patient with organization assignment
const newPatient = await createPatient({
  ...patientData,
  organization_id: organizationId
});
```

### React Query Hooks

Query hooks are now organization-aware:

```typescript
// Automatically filters by current organization
const { data: patients } = usePatients();

// Query keys include organization ID for proper caching
const queryKey = ['patients', organizationId];
```

## Security Considerations

1. **RLS Policies**: All tenant data is protected by Row Level Security
2. **Role Validation**: UI elements are hidden based on user roles
3. **API Filtering**: Server-side filtering prevents data leaks
4. **Context Isolation**: Organization context is properly managed

## Testing

### Manual Testing

1. Create test users in different organizations
2. Log in as different users and verify data isolation
3. Test super admin organization switching
4. Verify RLS enforcement in database

### Test Data

The seed script creates sample data for testing:
- Multiple organizations with different specialties
- Sample patients assigned to different organizations
- Test users with various roles

## Troubleshooting

### Common Issues

1. **Users can't see any data**: Check organization assignment in `user_profiles`
2. **Super admin can't switch**: Verify role is set to `super_admin`
3. **RLS errors**: Check policy configuration in Supabase
4. **Missing patients**: Ensure `organization_id` is set on patient records

### Database Verification

```sql
-- Check organization assignments
SELECT u.email, u.role, o.name as organization
FROM user_profiles u
LEFT JOIN organizations o ON u.organization_id = o.id;

-- Check patient distribution
SELECT o.name, COUNT(p.*) as patient_count
FROM organizations o
LEFT JOIN patients p ON o.id = p.organization_id
GROUP BY o.id, o.name;
```

## Migration from Single-Tenant

If upgrading from a single-tenant setup:

1. Run the migration to add organization support
2. Create a default organization
3. Assign all existing users to the default organization
4. Update all existing patient records with the organization ID
5. Test the upgrade thoroughly before production deployment

## Support

For technical support or questions about the multi-tenant implementation, please refer to the hacCare documentation or contact the development team.