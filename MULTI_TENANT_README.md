# Multi-Tenant Management Dashboard

This document describes the multi-tenant architecture and management dashboard implementation for the hacCare hospital management system.

## Overview

The multi-tenant system allows a single application instance to serve multiple hospital organizations (tenants) while maintaining complete data isolation and customization for each tenant.

## Architecture Components

### 1. Tenant Management (`/src/lib/tenantService.ts`)
- **CRUD operations** for tenant management
- **User-tenant association** management
- **Dashboard statistics** aggregation
- **Permission-based access** control

### 2. Management Dashboard (`/src/components/Management/ManagementDashboard.tsx`)
- **System-wide statistics** overview
- **Tenant listing** with status indicators
- **Create/Edit/Delete** tenant operations
- **User management** per tenant
- **Real-time monitoring** capabilities

### 3. Tenant CRUD (`/src/components/Management/TenantCRUD.tsx`)
- **Advanced tenant management** interface
- **Search and filtering** capabilities
- **Bulk operations** support
- **User assignment** management

### 4. Multi-Tenant Patient Service (`/src/lib/multiTenantPatientService.ts`)
- **Tenant-scoped** patient operations
- **Data isolation** enforcement
- **Audit logging** integration
- **Performance optimization**

### 5. Tenant Context (`/src/contexts/TenantContext.tsx`)
- **Tenant state management**
- **User tenant detection**
- **Multi-tenant admin** identification
- **Error handling**

## Database Schema

### Tenants Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7),
  settings JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_user_id UUID NOT NULL,
  subscription_plan VARCHAR(20) NOT NULL DEFAULT 'basic',
  max_users INTEGER NOT NULL DEFAULT 10,
  max_patients INTEGER NOT NULL DEFAULT 100
);
```

### Tenant Users Table
```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, user_id)
);
```

### Updated Existing Tables
All existing tables (patients, patient_vitals, patient_notes, etc.) should include:
```sql
ALTER TABLE patients ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE patient_vitals ADD COLUMN tenant_id UUID REFERENCES tenants(id);
-- ... for all relevant tables
```

## Access Control

### Role Hierarchy
1. **Super Admin** - Full system access, can manage all tenants
2. **Tenant Admin** - Full access within their tenant
3. **Doctor** - Patient and medical data access within tenant
4. **Nurse** - Patient care and vital signs access within tenant
5. **Viewer** - Read-only access within tenant

### Permission System
```typescript
const permissions = {
  admin: [
    'patients:read', 'patients:write', 'patients:delete',
    'users:read', 'users:write', 'users:delete',
    'medications:read', 'medications:write', 'medications:delete',
    'alerts:read', 'alerts:write',
    'settings:read', 'settings:write'
  ],
  doctor: [
    'patients:read', 'patients:write',
    'medications:read', 'medications:write',
    'alerts:read', 'alerts:write'
  ],
  nurse: [
    'patients:read', 'patients:write',
    'medications:read', 'medications:write',
    'alerts:read', 'alerts:write'
  ],
  viewer: ['patients:read', 'alerts:read']
};
```

## Features

### Management Dashboard Features
- **Real-time Statistics**: Total tenants, active tenants, users, patients
- **System Health Monitoring**: Database connectivity, performance metrics
- **Tenant Management**: Create, edit, delete, and manage tenant settings
- **User Management**: Assign users to tenants with specific roles
- **Billing Integration**: Subscription plan management and usage tracking

### Tenant Isolation
- **Data Separation**: All queries automatically filter by tenant_id
- **User Isolation**: Users can only access their assigned tenant's data
- **Custom Branding**: Logo, colors, and settings per tenant
- **Feature Toggles**: Enable/disable features per subscription plan

### Multi-Tenant Patient Service
- **Automatic Filtering**: All operations scoped to current tenant
- **Validation**: Prevents cross-tenant data access
- **Performance**: Optimized queries with proper indexing
- **Audit Trail**: Complete logging of all operations

## Usage Examples

### Creating a New Tenant
```typescript
const newTenant = await createTenant({
  name: "General Hospital",
  subdomain: "general-hospital",
  subscription_plan: "premium",
  max_users: 50,
  max_patients: 500,
  admin_user_id: "user-uuid",
  settings: {
    timezone: "America/New_York",
    features: {
      advanced_analytics: true,
      medication_management: true,
      barcode_scanning: true
    }
  }
});
```

### Using Multi-Tenant Patient Hook
```typescript
function PatientList() {
  const { patients, createPatient, isLoading } = useMultiTenantPatients();
  
  const handleCreatePatient = async (patientData) => {
    await createPatient(patientData); // Automatically scoped to current tenant
  };
  
  return (
    <div>
      {patients.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}
```

### Tenant Context Usage
```typescript
function MyComponent() {
  const { currentTenant, isMultiTenantAdmin } = useTenant();
  
  if (isMultiTenantAdmin) {
    return <ManagementDashboard />;
  }
  
  return (
    <div>
      <h1>Welcome to {currentTenant?.name}</h1>
      <PatientList />
    </div>
  );
}
```

## Security Considerations

### Data Isolation
- All database queries include tenant_id filters
- Row-level security policies enforce tenant boundaries
- API endpoints validate tenant access rights

### Authentication & Authorization
- JWT tokens include tenant context
- Role-based permissions per tenant
- Session management with tenant validation

### Audit & Compliance
- Complete audit trail for all operations
- HIPAA compliance with tenant isolation
- Data export/import capabilities per tenant

## Performance Optimizations

### Database Indexing
```sql
CREATE INDEX idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX idx_patient_vitals_tenant_patient ON patient_vitals(tenant_id, patient_id);
CREATE INDEX idx_tenant_users_tenant_user ON tenant_users(tenant_id, user_id);
```

### Query Optimization
- Composite indexes on tenant_id + frequently queried columns
- Connection pooling per tenant
- Caching strategies for tenant settings

### Resource Management
- Subscription-based limits enforcement
- Usage monitoring and alerting
- Auto-scaling based on tenant load

## Development Guidelines

### Adding New Features
1. Always include tenant_id in data models
2. Use multi-tenant service functions
3. Validate tenant access in API endpoints
4. Test with multiple tenant scenarios

### Testing Strategy
- Unit tests with tenant isolation
- Integration tests across tenants
- Load testing with multiple tenants
- Security testing for data leakage

### Deployment Considerations
- Environment-specific tenant configurations
- Migration scripts for existing data
- Backup and restore per tenant
- Monitoring and alerting setup

## Future Enhancements

### Planned Features
- **Custom Domains**: tenant.yourdomain.com support
- **API Keys**: Tenant-specific API access
- **White Labeling**: Complete UI customization
- **Advanced Analytics**: Tenant performance metrics
- **Backup Management**: Automated tenant backups

### Scalability Improvements
- **Database Sharding**: Distribute tenants across databases
- **Microservices**: Tenant-specific service instances
- **CDN Integration**: Tenant-specific static assets
- **Geographic Distribution**: Multi-region deployment

This multi-tenant architecture provides a robust foundation for scaling the hacCare application to serve multiple healthcare organizations while maintaining security, performance, and compliance requirements.
