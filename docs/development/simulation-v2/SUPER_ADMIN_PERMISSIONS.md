# Tenant Isolation & Super Admin Permissions

## How Tenant Isolation Works

### For Regular Users (Students, Nurses, Doctors)

**Automatic tenant_id assignment:**

```typescript
// User enters simulation
await enterSimulationTenant('sim-tenant-123');

// User records vitals (doesn't specify tenant_id)
await supabase.from('patient_vitals').insert({
  patient_id: 'PT12345',
  temperature: 98.6,
  heart_rate: 72
  // NO tenant_id specified
});

// ✅ Trigger automatically sets tenant_id = 'sim-tenant-123'
// ✅ RLS allows because tenant_id matches user's profile
// ✅ User can ONLY insert into their assigned tenant
```

**Cannot bypass:**
- User's tenant_id comes from `user_profiles.tenant_id`
- Trigger always uses this value
- User **cannot** insert into different tenant
- Attempting to do so raises an exception

### For Super Admins

**Can work across tenants:**

```typescript
// Super admin can explicitly set tenant_id
await supabase.from('patient_vitals').insert({
  patient_id: 'PT12345',
  temperature: 98.6,
  heart_rate: 72,
  tenant_id: 'any-tenant-id' // ← Explicitly set different tenant
});

// ✅ Trigger checks: Is user super_admin?
// ✅ If yes: Allow insert with explicit tenant_id
// ✅ If no: Raise exception (cannot insert into different tenant)
```

## Permission Matrix

| User Role | Auto tenant_id? | Can specify different tenant_id? | Use Case |
|-----------|----------------|----------------------------------|----------|
| **Student** | ✅ Yes (from profile) | ❌ No (exception) | Simulation participation |
| **Nurse** | ✅ Yes (from profile) | ❌ No (exception) | Production patient care |
| **Doctor** | ✅ Yes (from profile) | ❌ No (exception) | Production patient care |
| **Admin** | ✅ Yes (from profile) | ❌ No (exception) | Facility management |
| **Super Admin** | ✅ Yes (from profile) | ✅ Yes (allowed) | Cross-tenant operations |

## Code Logic (Detailed)

### Scenario 1: Regular User, No tenant_id Provided

```sql
-- User: Student (tenant_id = 'production-123')
INSERT INTO patient_vitals (patient_id, temperature) 
VALUES ('PT001', 98.6);
-- NO tenant_id provided

-- Trigger logic:
IF NEW.tenant_id IS NULL THEN
  -- Get user's tenant from profile
  v_tenant_id = 'production-123'
  NEW.tenant_id = 'production-123'
  -- ✅ Insert proceeds with tenant_id = 'production-123'
END IF;
```

**Result:** ✅ Insert succeeds with user's tenant_id

### Scenario 2: Regular User, Different tenant_id Provided

```sql
-- User: Student (tenant_id = 'production-123')
INSERT INTO patient_vitals (patient_id, temperature, tenant_id) 
VALUES ('PT001', 98.6, 'different-tenant-456');
-- Trying to insert into different tenant!

-- Trigger logic:
ELSE -- tenant_id was explicitly provided
  v_tenant_id = 'production-123' -- User's actual tenant
  
  IF NEW.tenant_id != v_tenant_id THEN -- 'different-tenant-456' != 'production-123'
    -- Check if super_admin
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      -- User is NOT super_admin
      RAISE EXCEPTION 'Cannot insert into different tenant. User tenant: production-123, Attempted: different-tenant-456'
    END IF;
  END IF;
```

**Result:** ❌ Exception raised, insert fails

### Scenario 3: Super Admin, Different tenant_id Provided

```sql
-- User: Super Admin (tenant_id = 'admin-tenant-999')
INSERT INTO patient_vitals (patient_id, temperature, tenant_id) 
VALUES ('PT001', 98.6, 'simulation-tenant-456');
-- Super admin explicitly setting different tenant

-- Trigger logic:
ELSE -- tenant_id was explicitly provided
  v_tenant_id = 'admin-tenant-999' -- Super admin's tenant
  
  IF NEW.tenant_id != v_tenant_id THEN -- 'simulation-tenant-456' != 'admin-tenant-999'
    -- Check if super_admin
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin') THEN
      RAISE EXCEPTION -- This line won't execute
    ELSE
      -- User IS super_admin
      -- ✅ Allow the insert with explicit tenant_id
    END IF;
  END IF;
```

**Result:** ✅ Insert succeeds with explicit tenant_id

### Scenario 4: Super Admin, No tenant_id Provided

```sql
-- User: Super Admin (tenant_id = 'admin-tenant-999')
INSERT INTO patient_vitals (patient_id, temperature) 
VALUES ('PT001', 98.6);
-- NO tenant_id provided, even though super admin

-- Trigger logic:
IF NEW.tenant_id IS NULL THEN
  -- Get user's tenant from profile (even for super admin)
  v_tenant_id = 'admin-tenant-999'
  NEW.tenant_id = 'admin-tenant-999'
  -- ✅ Insert proceeds with super admin's own tenant_id
END IF;
```

**Result:** ✅ Insert succeeds with super admin's tenant_id

## Super Admin Use Cases

### Use Case 1: Setting Up Simulations

```typescript
// Super admin creates simulation tenant and patients
const { data: simTenant } = await supabase
  .from('tenants')
  .insert({
    name: 'Trauma Simulation',
    tenant_type: 'simulation_active',
    is_simulation: true
  });

// Super admin can insert patients into simulation tenant
await supabase.from('patients').insert({
  patient_id: 'SIM001',
  first_name: 'John',
  last_name: 'Doe',
  tenant_id: simTenant.id // ← Explicit tenant_id
});

// ✅ Allowed because super_admin
```

### Use Case 2: Copying Data Between Tenants

```typescript
// Super admin migrates patient data from old tenant to new tenant
const oldTenantPatients = await supabase
  .from('patients')
  .select('*')
  .eq('tenant_id', 'old-tenant-123');

for (const patient of oldTenantPatients) {
  // Insert into new tenant
  await supabase.from('patients').insert({
    ...patient,
    tenant_id: 'new-tenant-456' // ← Different tenant
  });
}

// ✅ Allowed because super_admin
```

### Use Case 3: Cross-Tenant Analytics

```typescript
// Super admin queries data across all tenants
const allVitals = await supabase
  .rpc('get_all_vitals_as_super_admin'); // Custom RPC

// Super admin can see production AND simulation data
// Regular users cannot
```

## Security Features

### Defense in Depth

**Layer 1: Trigger (This)**
- Validates tenant_id on INSERT
- Allows super_admin bypass
- Cannot be circumvented (SECURITY DEFINER)

**Layer 2: RLS Policies**
- Filters SELECT queries by tenant_id
- Prevents viewing other tenants' data
- Super admin RPC functions for cross-tenant access

**Layer 3: Application Logic**
- TenantContext manages current tenant
- UI only shows current tenant's data
- Services use tenant-aware queries

**Layer 4: Audit Logs**
- Log all super admin cross-tenant operations
- Track unusual tenant_id patterns
- Alert on suspicious activity

### What Super Admins Can Do

✅ **Insert data into any tenant** (with explicit tenant_id)
✅ **Query data across tenants** (via super admin RPC functions)
✅ **Migrate data between tenants** (with explicit tenant_id)
✅ **Set up simulations** (create simulation tenants and patients)
✅ **Troubleshoot issues** (access any tenant's data)
✅ **Generate reports** (aggregate cross-tenant analytics)

### What Super Admins Cannot Do

❌ **Accidentally leak data** (still need explicit tenant_id)
❌ **Bypass audit logs** (all operations logged)
❌ **Disable RLS** (database enforces it)
❌ **Access without authentication** (still requires valid session)

## Simulation Workflow (with Super Admin)

### Setup Phase (Super Admin)

```typescript
// 1. Super admin creates simulation template
const template = await createSimulationTemplate({
  name: 'Trauma Code Blue',
  // ... template config
});

// 2. Super admin launches simulation (creates simulation tenant)
const simulation = await launchSimulation({
  template_id: template.id,
  scheduled_start: '2025-10-07T10:00:00Z'
});

// 3. Super admin adds patients to simulation tenant
await supabase.from('patients').insert({
  patient_id: 'SIM001',
  first_name: 'Jane',
  last_name: 'Trauma',
  tenant_id: simulation.tenant_id // ← Super admin can set this
});

// ✅ Super admin can set up simulation in any tenant
```

### Student Phase (Regular User)

```typescript
// 1. Student enters simulation
await enterSimulationTenant(simulation.tenant_id);

// 2. Student records vitals
await supabase.from('patient_vitals').insert({
  patient_id: 'SIM001',
  temperature: 98.6
  // NO tenant_id - trigger sets it automatically
});

// ✅ Trigger sets tenant_id = simulation.tenant_id
// ✅ Student can ONLY insert into simulation tenant
// ❌ Student CANNOT insert into production tenant
```

### Cleanup Phase (Super Admin)

```typescript
// Super admin can cleanup across tenants
await supabase.rpc('cleanup_simulation_data', {
  tenant_id: simulation.tenant_id
});

// ✅ Super admin can delete data from any tenant
```

## Testing Super Admin Permissions

### Test 1: Super Admin Cross-Tenant Insert

```sql
-- Login as super_admin
-- Verify role in user_profiles

-- Try to insert into different tenant
INSERT INTO patient_vitals (
  patient_id,
  temperature,
  heart_rate,
  tenant_id  -- Explicit tenant_id
) VALUES (
  (SELECT id FROM patients LIMIT 1),
  98.6,
  72,
  'different-tenant-id'
);

-- Expected: ✅ Success (super admin can bypass)
```

### Test 2: Regular User Cross-Tenant Insert

```sql
-- Login as regular user (student/nurse)
-- Verify role is NOT super_admin

-- Try to insert into different tenant
INSERT INTO patient_vitals (
  patient_id,
  temperature,
  heart_rate,
  tenant_id  -- Explicit tenant_id
) VALUES (
  (SELECT id FROM patients LIMIT 1),
  98.6,
  72,
  'different-tenant-id'
);

-- Expected: ❌ Exception - "Cannot insert into different tenant"
```

### Test 3: Super Admin Auto tenant_id

```sql
-- Login as super_admin

-- Insert WITHOUT specifying tenant_id
INSERT INTO patient_vitals (
  patient_id,
  temperature,
  heart_rate
  -- NO tenant_id
) VALUES (
  (SELECT id FROM patients LIMIT 1),
  98.6,
  72
);

-- Expected: ✅ Success - uses super admin's own tenant_id
```

## Recommendations

### For Super Admins

1. **Always be explicit** when working across tenants
   ```typescript
   // Good - explicit
   await supabase.from('patients').insert({ ...data, tenant_id: targetTenantId });
   
   // Bad - implicit (uses your tenant_id)
   await supabase.from('patients').insert({ ...data });
   ```

2. **Log cross-tenant operations**
   ```typescript
   console.log(`Super admin inserting into tenant: ${targetTenantId}`);
   await logAuditEvent('cross_tenant_insert', { tenant_id: targetTenantId });
   ```

3. **Use dedicated functions** for cross-tenant work
   ```typescript
   // Create super admin specific functions
   async function insertIntoSimulationTenant(data, simTenantId) {
     if (!isSuperAdmin()) throw new Error('Unauthorized');
     return await supabase.from('patients').insert({ ...data, tenant_id: simTenantId });
   }
   ```

### For Regular Users

1. **Never specify tenant_id** - let trigger handle it
   ```typescript
   // Good - no tenant_id
   await supabase.from('patient_vitals').insert({ temperature: 98.6 });
   
   // Bad - will fail unless you're super admin
   await supabase.from('patient_vitals').insert({ temperature: 98.6, tenant_id: 'xyz' });
   ```

2. **Trust the context** - TenantContext manages your tenant
   ```typescript
   // Current tenant is automatically used
   const currentTenant = useTenant();
   // All inserts use currentTenant.id automatically
   ```

## Summary

| Aspect | Regular User | Super Admin |
|--------|--------------|-------------|
| **Auto tenant_id** | ✅ Always from profile | ✅ From profile if not specified |
| **Explicit tenant_id** | ❌ Raises exception | ✅ Allowed |
| **Cross-tenant insert** | ❌ Blocked | ✅ Allowed |
| **Cross-tenant query** | ❌ Blocked by RLS | ✅ Via RPC functions |
| **Bypass protection** | ❌ Cannot bypass | ✅ Can bypass with explicit value |
| **Audit logging** | ✅ Logged | ✅ Logged with super admin flag |

**Key Takeaway:** Super admins can bypass tenant restrictions by **explicitly** setting `tenant_id`, but they still get automatic tenant assignment if they don't specify it. This provides flexibility for admin tasks while maintaining security for normal operations.
