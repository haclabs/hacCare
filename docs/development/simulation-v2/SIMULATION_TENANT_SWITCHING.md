# Simulation Tenant Switching Fix

## Problem

When users logged into the simulation portal and selected/entered a simulation, they remained in their regular tenant (e.g., NSG 25) instead of switching to the isolated simulation tenant. This meant they saw their regular patient list instead of the simulation patients.

**Error Symptoms:**
- User enters simulation successfully
- Simulation indicator shows correctly in sidebar
- But current tenant remains the user's home tenant (NSG 25)
- Patient list shows regular patients, not simulation patients

## Root Cause

The SimulationPortal component was navigating to `/simulation/${simulationId}` without switching the user's active tenant context to the simulation's tenant. The existing `switchToTenant` function in TenantContext was restricted to super_admin users only.

## Solution

### 1. Added `enterSimulationTenant` Function to TenantContext

Created a new tenant switching function specifically for simulations that's available to **all users** (not just super_admins):

**File:** `src/contexts/TenantContext.tsx`

```typescript
/**
 * Enter a simulation tenant (available to all users with simulation access)
 * This allows users to switch to simulation tenants they're assigned to
 */
const enterSimulationTenant = async (tenantId: string) => {
  try {
    setLoading(true);
    setError(null);

    console.log('🎮 Entering simulation tenant:', tenantId);

    // Fetch the tenant data
    const { data: tenant, error: tenantError } = await getTenantById(tenantId);
    if (tenantError) {
      throw new Error(tenantError.message);
    }

    if (!tenant) {
      throw new Error('Simulation tenant not found');
    }

    // Update state to simulation tenant
    setSelectedTenantId(tenantId);
    setCurrentTenant(tenant);
    
    console.log('✅ Successfully entered simulation tenant:', tenant.name);
  } catch (err) {
    console.error('Error entering simulation tenant:', err);
    setError(err instanceof Error ? err.message : 'Failed to enter simulation');
    throw err;
  } finally {
    setLoading(false);
  }
};
```

**Key Differences from `switchToTenant`:**
- ✅ No super_admin restriction
- ✅ Available to all authenticated users
- ✅ Designed for simulation participant access
- ✅ Simpler - doesn't require super admin service layer

### 2. Updated SimulationPortal Component

Modified the simulation entry flow to switch tenants before navigation:

**File:** `src/components/Simulation/SimulationPortal.tsx`

#### Changes Made:

1. **Import the new function:**
```typescript
const { enterSimulationTenant } = useTenant();
```

2. **Created `enterSimulation` function:**
```typescript
const enterSimulation = async (tenantId: string, simulationName: string) => {
  try {
    setEnteringSimulation(true);
    console.log('🔄 Switching to simulation tenant:', tenantId);
    await enterSimulationTenant(tenantId);
    console.log('✅ Entered simulation:', simulationName);
    // Navigate to dashboard which will now show simulation patients
    navigate('/dashboard');
  } catch (err: any) {
    console.error('Error entering simulation:', err);
    setError(err.message || 'Failed to enter simulation');
  } finally {
    setEnteringSimulation(false);
  }
};
```

3. **Updated auto-routing logic:**
```typescript
if (data.length === 1) {
  const assignment = data[0];
  console.log('🎯 Auto-routing to single simulation:', assignment.simulation.name);
  setTimeout(async () => {
    await enterSimulation(assignment.simulation.tenant_id, assignment.simulation.name);
  }, 1500);
}
```

4. **Updated manual selection:**
```typescript
const handleJoinSimulation = (assignment: SimulationAssignment) => {
  enterSimulation(assignment.simulation.tenant_id, assignment.simulation.name);
};
```

5. **Updated navigation destination:**
- **Before:** `navigate(\`/simulation/${simulationId}\`)` (non-existent route)
- **After:** `navigate('/dashboard')` (shows simulation patients in context)

### 3. Added Loading State

Added `enteringSimulation` state to show appropriate loading message:

```typescript
const [enteringSimulation, setEnteringSimulation] = useState(false);

if (authLoading || loading || enteringSimulation) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">
          {enteringSimulation ? 'Entering simulation...' : 'Loading simulation portal...'}
        </p>
      </div>
    </div>
  );
}
```

## User Flow After Fix

### Single Simulation Assignment (Auto-route)

1. User logs into simulation.haccare.app
2. System detects single simulation assignment
3. Shows portal briefly (1.5s)
4. **Switches to simulation tenant** ✨
5. Navigates to /dashboard
6. Dashboard shows **simulation patients** ✅
7. Sidebar shows SimulationIndicator with countdown ✅

### Multiple Simulation Assignments (Selection)

1. User logs into simulation.haccare.app
2. System shows simulation selection grid
3. User clicks "Enter Simulation" button
4. **Switches to simulation tenant** ✨
5. Navigates to /dashboard
6. Dashboard shows **simulation patients** ✅
7. Sidebar shows SimulationIndicator with countdown ✅

## Database Context

The `simulation_active` table contains:
- `id` - Simulation instance ID
- `tenant_id` - **The isolated simulation tenant** (where simulation patients exist)
- `status` - 'running', 'pending', etc.
- Other metadata

The `simulation_participants` table links:
- `user_id` - The actual user (e.g., nsg25@lethpolytech.ca)
- `simulation_id` - The simulation they're assigned to
- `role` - 'student' or 'instructor'

When a user enters a simulation, we switch their **current tenant context** from their home tenant (e.g., NSG 25) to the **simulation's tenant_id**.

## Security Considerations

### RLS Policies

The simulation tenant switching is secure because:

1. **Users can only see simulations they're assigned to**
   - Query filters by `user_id` in `getUserSimulationAssignments`
   - RLS policies on `simulation_participants` enforce access

2. **Tenant data is fetched with proper RLS**
   - `getTenantById` uses Supabase RLS policies
   - Users can only fetch tenant data they have access to

3. **No privilege escalation**
   - `enterSimulationTenant` doesn't grant admin rights
   - Just changes the active tenant context
   - User permissions remain the same (nurse, doctor, etc.)

### Access Control Flow

```
User (nsg25) → simulation_participants (RLS: user_id) → simulation_active → tenant_id
                                                              ↓
                                                         getTenantById (RLS)
                                                              ↓
                                                      setCurrentTenant()
```

## Testing

### Test Case 1: Single Simulation Auto-Route

1. **Setup:** User assigned to one running simulation
2. **Login:** simulation.haccare.app
3. **Expected:** Auto-switches tenant and shows simulation dashboard
4. **Verify:** `currentTenant.id === assignment.simulation.tenant_id`

### Test Case 2: Multiple Simulations Selection

1. **Setup:** User assigned to 2+ running simulations
2. **Login:** simulation.haccare.app
3. **Action:** Click "Enter Simulation" on one
4. **Expected:** Switches to that simulation's tenant
5. **Verify:** `currentTenant.id === selected_simulation.tenant_id`

### Test Case 3: No Simulations

1. **Setup:** User with no simulation assignments
2. **Login:** simulation.haccare.app
3. **Expected:** Helpful message (no tenant switch)
4. **Verify:** Remains in home tenant

### Test Case 4: Instructor Access

1. **Setup:** Admin/super_admin user
2. **Login:** simulation.haccare.app
3. **Expected:** Instructor dashboard with all simulations
4. **Action:** Enter simulation
5. **Verify:** Switches to simulation tenant correctly

## Console Logs for Debugging

When entering a simulation, you should see:

```
🔄 Switching to simulation tenant: 4b181815-24ae-44cb-9128-e74fefb35e13
🎮 Entering simulation tenant: 4b181815-24ae-44cb-9128-e74fefb35e13
✅ Successfully entered simulation tenant: Trauma Code Blue Simulation
✅ Entered simulation: Trauma Code Blue Simulation
```

Then in TenantContext logs:
```
🏢 TENANT CONTEXT: Current tenant: Trauma Code Blue Simulation
Current Tenant: {id: '4b181815-24ae-44cb-9128-e74fefb35e13', name: 'Trauma Code Blue Simulation', ...}
```

## Related Files

- `src/contexts/TenantContext.tsx` - Added `enterSimulationTenant`
- `src/components/Simulation/SimulationPortal.tsx` - Updated entry logic
- `src/components/Simulation/SimulationIndicator.tsx` - Shows active simulation
- `src/services/simulationService.ts` - Queries user assignments

## Next Steps

### Potential Enhancements

1. **Exit Simulation Button**
   - Allow users to leave simulation and return to home tenant
   - Store original tenant ID before entering simulation
   - Restore on exit

2. **Simulation Session Timeout**
   - Auto-exit when simulation ends (based on `ends_at`)
   - Show countdown warning before auto-exit
   - Redirect to portal with summary

3. **Multiple Concurrent Simulations**
   - Allow users in multiple simulations simultaneously
   - Quick-switch between simulation tenants
   - Show all active simulations in dropdown

4. **Simulation Navigation Guard**
   - Prevent navigation to non-simulation routes while in simulation
   - Or show warning modal before leaving simulation
   - Preserve simulation state on return

## Troubleshooting

### Issue: Still seeing home tenant patients

**Check:**
1. Verify `enterSimulationTenant` is being called (console logs)
2. Check if `currentTenant.id` matches `simulation.tenant_id`
3. Verify simulation has correct `tenant_id` in database
4. Check RLS policies allow tenant access

### Issue: "Failed to enter simulation"

**Possible causes:**
1. Simulation tenant doesn't exist
2. User lacks RLS permissions on tenants table
3. Network/Supabase connection issue

**Debug:**
- Check browser console for detailed error
- Verify tenant exists: `SELECT * FROM tenants WHERE id = 'simulation_tenant_id'`
- Check RLS policies on tenants table

### Issue: User can't see simulation patients

**After entering simulation, check:**
1. Current tenant ID is correct
2. Patients table RLS filters by tenant_id
3. Simulation patients exist: `SELECT * FROM patients WHERE tenant_id = 'simulation_tenant_id'`

## Summary

This fix ensures that when users enter a simulation through the portal, they are properly switched to the simulation's isolated tenant context. This allows them to see simulation patients, work within the simulation environment, and have their actions isolated from their home tenant.

**Key Achievement:** ✅ Users now experience true simulation isolation with proper tenant context switching.
