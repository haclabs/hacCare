# Simulation Sub-Tenant Architecture Implementation Plan

## Overview
This document outlines the implementation of a **sub-tenant simulation system** that creates isolated simulation environments using the existing multi-tenant architecture. Each simulation gets its own sub-tenant with dedicated users who only see simulation data.

## Architecture Benefits

### ✅ **Complete Data Isolation**
- Simulation users are "born" into simulation mode
- No risk of accessing live patient data
- Clean separation between live and simulation environments

### ✅ **Leverage Existing Infrastructure**
- Uses existing RLS (Row Level Security) policies
- Reuses all existing UI components and services
- No duplication of core functionality

### ✅ **Scalable and Secure**
- Each simulation is its own isolated environment
- Auto-cleanup prevents data accumulation
- Audit trails are maintained per simulation

### ✅ **No Context Switching Required**
- Users login directly to simulation environment
- No need to "enter/exit" simulation mode
- Eliminates confusion and security risks

## Database Schema

### 1. **Enhanced Tenants Table**
```sql
ALTER TABLE tenants 
ADD COLUMN parent_tenant_id UUID REFERENCES tenants(id),
ADD COLUMN tenant_type TEXT DEFAULT 'institution' CHECK (tenant_type IN ('institution', 'simulation')),
ADD COLUMN simulation_id UUID REFERENCES active_simulations(id),
ADD COLUMN auto_cleanup_at TIMESTAMP;
```

### 2. **Simulation Users Tracking**
```sql
CREATE TABLE simulation_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'nurse')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(simulation_tenant_id, username)
);
```

### 3. **Automated Functions**
- `create_simulation_subtenant()` - Creates sub-tenant for simulation
- `add_simulation_user()` - Adds users with appropriate permissions
- `cleanup_expired_simulations()` - Automatic cleanup of expired simulations

## Implementation Workflow

### Phase 1: Database Setup ✅
1. **Run SQL migrations**
   ```bash
   # Apply the simulation sub-tenant schema
   psql -f /workspaces/hacCare/sql/create_simulation_subtenant_system.sql
   ```

2. **Verify RLS policies**
   - Simulation users only see simulation data
   - Regular users cannot see simulation data
   - Cross-tenant access is prevented

### Phase 2: Service Layer ✅
1. **SimulationSubTenantService** - Complete service for managing simulation environments
2. **Integration with existing services** - Ensure all services respect tenant context
3. **User authentication** - Simulation users authenticate to their sub-tenant

### Phase 3: UI Components
1. **SimulationSubTenantManager** ✅ - Admin interface for managing simulations
2. **Update existing components** - Remove anonymous access logic
3. **User assignment interface** - Easy user management for simulations

### Phase 4: Authentication Integration
1. **Remove anonymous access** - Clean up all anonymous access code
2. **Simulation login flow** - Direct login to simulation sub-tenant
3. **Context detection** - Automatic detection of simulation environment

## Migration from Anonymous Access

### Remove Anonymous Access Code
1. **Database cleanup**
   ```sql
   -- Remove anonymous access columns and policies
   ALTER TABLE active_simulations DROP COLUMN IF EXISTS allow_anonymous_access;
   ALTER TABLE active_simulations DROP COLUMN IF EXISTS sim_access_key;
   DROP POLICY IF EXISTS "Allow anonymous access to public simulations" ON active_simulations;
   ```

2. **Frontend cleanup**
   - Remove simulation link generation
   - Remove anonymous user handling
   - Clean up ProtectedRoute for simulation context

### Update Simulation Creation Workflow
1. **New workflow**: Template → Sub-tenant → Users → Launch
2. **User management**: Add/remove users from simulation
3. **Credentials generation**: Download login info for simulation users

## User Experience

### For Administrators
1. **Create Simulation**
   - Choose simulation template
   - Add users (students, nurses, instructors)
   - Generate login credentials
   - Launch simulation environment

2. **Manage Active Simulations**
   - View all running simulations
   - Add/remove users from simulations
   - Monitor simulation activity
   - End simulations and cleanup

### For Simulation Users
1. **Simple Login**
   - Receive email/username and password
   - Login directly to simulation environment
   - No confusion about "simulation mode"

2. **Isolated Experience**
   - Only see simulation patients and data
   - Use all normal hacCare functionality
   - Cannot access live patient data

## Security Considerations

### ✅ **Data Isolation**
- RLS policies ensure complete data separation
- Simulation users cannot see live data
- Live users cannot see simulation data

### ✅ **Audit Trail**
- All simulation actions are logged
- User assignment is tracked
- Simulation lifecycle is auditable

### ✅ **Access Control**
- Role-based permissions within simulations
- Time-limited access (auto-cleanup)
- No elevated privileges in simulation mode

## Implementation Steps

### Step 1: Apply Database Changes
```bash
cd /workspaces/hacCare
psql -h your-db-host -d your-db -f sql/create_simulation_subtenant_system.sql
```

### Step 2: Update Services
- ✅ SimulationSubTenantService created
- Update AuthContext to detect simulation tenants
- Update existing services to respect tenant boundaries

### Step 3: Update UI
- ✅ SimulationSubTenantManager component created
- Remove anonymous access UI elements
- Add user assignment interfaces

### Step 4: Testing
- Test simulation creation workflow
- Verify data isolation
- Test user assignment and login
- Validate cleanup processes

## File Structure
```
/sql/
  ├── create_simulation_subtenant_system.sql ✅
  └── migrate_from_anonymous_access.sql (to create)

/src/lib/
  ├── simulationSubTenantService.ts ✅
  └── [existing services] (to update)

/src/components/Simulation/
  ├── SimulationSubTenantManager.tsx ✅
  ├── SimulationUserAssignment.tsx (to create)
  └── SimulationLoginForm.tsx (to create)
```

## Next Steps
1. **Apply database migrations** 
2. **Update AuthContext** for simulation tenant detection
3. **Test simulation creation** with SimulationSubTenantManager
4. **Remove anonymous access** code and policies
5. **Update simulation dashboard** to use new sub-tenant system

This architecture provides a robust, secure, and scalable solution for simulation management without the complexity and security risks of anonymous access.