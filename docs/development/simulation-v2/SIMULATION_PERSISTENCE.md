# Simulation Persistence Across Browser Refresh

## Problem

**Original Issue:**
When a student is in simulation mode and refreshes their browser, they get kicked out of the simulation and returned to their home tenant (e.g., NSG 25).

**Root Cause:**
- Tenant context is stored in React state (memory only)
- On browser refresh, React state is lost
- TenantContext reinitializes and loads the user's default home tenant
- Simulation context is not preserved

## Solution

### Multi-Layered Approach

We now use **three methods** to persist simulation context:

#### 1. **localStorage Persistence** (Dev & Production)
Stores the current simulation tenant ID in browser storage

#### 2. **Subdomain Detection** (Production Only)
At `simulation.haccare.app`, automatically loads the simulation tenant

#### 3. **Exit Simulation Function**
Allows users to manually leave simulation and return home

---

## Implementation Details

### 1. localStorage Persistence

**File:** `src/contexts/TenantContext.tsx`

#### When Entering Simulation:
```typescript
const enterSimulationTenant = async (tenantId: string) => {
  // ... fetch tenant data
  
  // Persist to localStorage
  localStorage.setItem('current_simulation_tenant', tenantId);
  console.log('💾 Simulation tenant saved to localStorage');
  
  setCurrentTenant(tenant);
  setSelectedTenantId(tenantId);
};
```

#### On App Load/Refresh:
```typescript
const loadCurrentTenant = async () => {
  // Check if user was in a simulation (survives refresh)
  const simulationTenantId = localStorage.getItem('current_simulation_tenant');
  if (simulationTenantId) {
    console.log('🎮 Restoring simulation tenant from localStorage');
    const { data: simulationTenant } = await getTenantById(simulationTenantId);
    
    if (simulationTenant && 
        (simulationTenant.is_simulation || 
         simulationTenant.tenant_type === 'simulation_active')) {
      setCurrentTenant(simulationTenant);
      setSelectedTenantId(simulationTenantId);
      return; // ✅ Simulation restored!
    } else {
      // Not a simulation anymore, clear localStorage
      localStorage.removeItem('current_simulation_tenant');
    }
  }
  
  // Otherwise, load subdomain or home tenant
  // ...
};
```

#### When Exiting Simulation:
```typescript
const exitSimulationTenant = async () => {
  // Clear from localStorage
  localStorage.removeItem('current_simulation_tenant');
  console.log('🧹 Cleared simulation tenant from localStorage');
  
  // Reload user's home tenant
  const { data: tenant } = await getCurrentUserTenant(user.id);
  setCurrentTenant(tenant);
};
```

**Benefits:**
- ✅ Works in development (localhost, Codespaces)
- ✅ Works in production
- ✅ Survives browser refresh
- ✅ Survives browser close/reopen (until cleared)
- ✅ Automatically cleans up if tenant no longer exists

**Limitations:**
- ❌ Doesn't work across different devices
- ❌ Cleared if user manually clears browser data
- ❌ Tab-specific (different tabs can have different simulations)

### 2. Subdomain Detection (Production)

**File:** `src/contexts/TenantContext.tsx`

```typescript
// In production, try to detect tenant from subdomain first
const currentSubdomain = getCurrentSubdomain();
if (currentSubdomain && process.env.NODE_ENV === 'production') {
  const { data: subdomainTenant } = await getTenantBySubdomain(currentSubdomain);
  if (subdomainTenant && !subdomainError) {
    setCurrentTenant(subdomainTenant); // ✅ Simulation tenant from subdomain
    setSelectedTenantId(subdomainTenant.id);
    return;
  }
}
```

**How It Works:**
1. User visits `simulation.haccare.app`
2. System extracts subdomain → `"simulation"`
3. Queries database: `SELECT * FROM tenants WHERE subdomain = 'simulation'`
4. Loads the simulation tenant automatically
5. User stays in simulation even after refresh

**Benefits:**
- ✅ Most reliable in production
- ✅ Works across all devices
- ✅ Works across all browser sessions
- ✅ No localStorage dependency
- ✅ URL-based (shareable)

**Limitations:**
- ❌ Only works in production (subdomain disabled in dev)
- ❌ Requires proper DNS configuration
- ❌ Requires subdomain to match tenant record

### 3. Exit Simulation Function

**File:** `src/contexts/TenantContext.tsx` + `SimulationIndicator.tsx`

#### Context Function:
```typescript
const exitSimulationTenant = async () => {
  console.log('🚪 Exiting simulation tenant...');
  
  // Clear localStorage
  localStorage.removeItem('current_simulation_tenant');
  
  // Load user's home tenant
  const { data: tenant } = await getCurrentUserTenant(user.id);
  setCurrentTenant(tenant);
  setSelectedTenantId(tenant?.id || null);
  
  console.log('✅ Returned to home tenant:', tenant?.name);
};
```

#### UI Component (SimulationIndicator):
```typescript
const handleExitSimulation = async () => {
  if (window.confirm('Are you sure you want to exit this simulation?')) {
    try {
      setIsExiting(true);
      await exitSimulationTenant();
      navigate('/dashboard'); // Go to home dashboard
    } catch (error) {
      console.error('Error exiting simulation:', error);
      alert('Failed to exit simulation. Please try again.');
    } finally {
      setIsExiting(false);
    }
  }
};
```

#### UI Display:
```tsx
{/* Exit Simulation Button */}
<div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
  <button
    onClick={handleExitSimulation}
    disabled={isExiting}
    className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded text-xs font-medium"
  >
    <LogOut className="h-3 w-3" />
    <span>{isExiting ? 'Exiting...' : 'Exit Simulation'}</span>
  </button>
</div>
```

**Benefits:**
- ✅ User-controlled exit
- ✅ Confirmation dialog (prevents accidental exits)
- ✅ Clears localStorage
- ✅ Returns to home tenant
- ✅ Visual feedback (loading state)

---

## User Experience

### Development Mode (localhost / Codespaces)

#### **Scenario 1: Student Enters Simulation**
1. Login to `/simulation-portal`
2. Click "Enter Simulation"
3. **localStorage saved:** `current_simulation_tenant = "sim-123"`
4. Switched to simulation tenant

#### **Scenario 2: Student Refreshes Browser**
1. Browser refreshes
2. TenantContext loads
3. **Checks localStorage:** Finds `current_simulation_tenant = "sim-123"`
4. Fetches tenant by ID
5. Verifies it's still a simulation
6. **Restores simulation context** ✅
7. Student stays in simulation!

#### **Scenario 3: Student Clicks "Exit Simulation"**
1. Clicks Exit button in SimulationIndicator
2. Confirmation dialog appears
3. User confirms
4. **localStorage cleared**
5. Home tenant loaded (NSG 25)
6. Navigated to `/dashboard`
7. Back to regular mode ✅

### Production Mode (simulation.haccare.app)

#### **Scenario 1: Student Visits Subdomain**
1. User navigates to `https://simulation.haccare.app`
2. TenantContext loads
3. **Detects subdomain:** `"simulation"`
4. Queries: `SELECT * FROM tenants WHERE subdomain = 'simulation'`
5. Loads simulation tenant automatically
6. **Both localStorage AND subdomain active** ✅

#### **Scenario 2: Student Refreshes at Subdomain**
1. Browser refreshes at `https://simulation.haccare.app`
2. TenantContext checks localStorage first → Finds simulation
3. **Restores from localStorage immediately** (faster)
4. Subdomain check would also work as backup
5. Double-secured persistence ✅

#### **Scenario 3: Student Opens New Tab**
1. Already at `https://simulation.haccare.app`
2. Opens new tab → same URL
3. New tab has separate localStorage (might be empty initially)
4. **Subdomain detection kicks in**
5. Loads simulation tenant from subdomain
6. Both tabs in simulation ✅

---

## Persistence Priority (Load Order)

```
1. localStorage Check
   ↓ (if found)
   Load simulation tenant
   ↓ (if not found or invalid)
   
2. Subdomain Check (production only)
   ↓ (if found)
   Load tenant by subdomain
   ↓ (if not found)
   
3. User's Home Tenant
   Load getCurrentUserTenant()
   ↓
   User in regular mode
```

---

## Testing

### Test 1: localStorage Persistence in Dev

1. **Enter Simulation:**
```
// Console output:
🎮 Entering simulation tenant: abc-123
💾 Simulation tenant saved to localStorage
✅ Successfully entered simulation tenant: Trauma Code Blue
```

2. **Check localStorage:**
```javascript
localStorage.getItem('current_simulation_tenant')
// Returns: "abc-123"
```

3. **Refresh Browser (F5 or Ctrl+R)**

4. **Verify Restoration:**
```
// Console output:
🎮 Restoring simulation tenant from localStorage: abc-123
✅ Simulation tenant restored: Trauma Code Blue
```

5. **Check Tenant:**
```javascript
console.log(currentTenant.name); // "Trauma Code Blue"
console.log(currentTenant.id);   // "abc-123"
```

### Test 2: Exit Simulation

1. **In Simulation:**
```javascript
console.log(currentTenant.name); // "Trauma Code Blue"
localStorage.getItem('current_simulation_tenant'); // "abc-123"
```

2. **Click "Exit Simulation" in Sidebar**

3. **Confirm Dialog → Click OK**

4. **Verify Exit:**
```
// Console output:
🚪 Exiting simulation tenant...
🧹 Cleared simulation tenant from localStorage
✅ Returned to home tenant: NSG 25
```

5. **Check State:**
```javascript
console.log(currentTenant.name); // "NSG 25"
localStorage.getItem('current_simulation_tenant'); // null
```

### Test 3: Subdomain Detection (Production)

1. **Deploy to Netlify**

2. **Configure DNS:**
```
CNAME record:
simulation.haccare.app → haccare.netlify.app
```

3. **Visit Subdomain:**
```
https://simulation.haccare.app
```

4. **Check Console:**
```
// Console output:
🌐 Subdomain Detection Debug: { subdomain: 'simulation', ... }
✅ Tenant loaded from subdomain: Simulation Tenant
```

5. **Refresh Page**

6. **Verify Persistence:**
```
// Should see BOTH:
🎮 Restoring simulation tenant from localStorage
(and subdomain also detected as backup)
```

### Test 4: Expired Simulation Cleanup

1. **Simulation Ends (Manual DB Update):**
```sql
DELETE FROM simulation_active WHERE id = 'sim-123';
-- or
UPDATE tenants SET tenant_type = 'production' WHERE id = 'sim-123';
```

2. **User Refreshes Browser**

3. **Check Console:**
```
// Console output:
🎮 Restoring simulation tenant from localStorage: sim-123
⚠️ Stored tenant is no longer a simulation, clearing
// or
⚠️ Simulation tenant not found, clearing localStorage
```

4. **Verify Cleanup:**
```javascript
localStorage.getItem('current_simulation_tenant'); // null
console.log(currentTenant.name); // "NSG 25" (home tenant)
```

---

## Security Considerations

### Validation on Every Load

```typescript
// Always verify the tenant is STILL a simulation
if (simulationTenant.is_simulation || 
    simulationTenant.tenant_type === 'simulation_active') {
  // ✅ Valid simulation
} else {
  // ❌ Not a simulation anymore, clear localStorage
  localStorage.removeItem('current_simulation_tenant');
}
```

**Why This Matters:**
- Simulations can end/expire
- Tenants can be deleted
- Tenant type can change
- Prevents stuck simulation state

### User Assignment Verification

The localStorage only stores the **tenant ID**, not permissions. Access is still controlled by:

1. **RLS Policies** - User must be in `simulation_participants`
2. **Tenant Lookup** - Tenant must exist in database
3. **Type Check** - Tenant must be `simulation_active`
4. **Status Check** - Simulation must be `running`

**No security bypass possible** ✅

---

## Edge Cases Handled

### ✅ Edge Case 1: User in Multiple Simulations

**Problem:** User is assigned to 2+ simulations, localStorage has one, they select another.

**Solution:**
```typescript
enterSimulationTenant(newTenantId);
// Overwrites localStorage with new simulation
localStorage.setItem('current_simulation_tenant', newTenantId);
```

### ✅ Edge Case 2: Simulation Deleted While User Active

**Problem:** Simulation ends/deleted while user has it in localStorage.

**Solution:**
```typescript
// On refresh, tenant fetch returns null
if (!simulationTenant) {
  console.log('⚠️ Simulation tenant not found, clearing localStorage');
  localStorage.removeItem('current_simulation_tenant');
  // Falls back to home tenant
}
```

### ✅ Edge Case 3: User Clears Browser Data

**Problem:** User clears cookies/localStorage manually.

**Solution:**
- **Production:** Subdomain detection still works
- **Development:** User returns to home tenant (expected behavior)
- Can re-enter simulation from portal

### ✅ Edge Case 4: Multiple Tabs/Windows

**Problem:** User opens simulation in multiple tabs.

**Solution:**
- Each tab has separate React state
- All share same localStorage
- All tabs restore same simulation
- Independent navigation per tab ✅

### ✅ Edge Case 5: Super Admin in Simulation

**Problem:** Super admin enters simulation, should they stay in simulation mode?

**Solution:**
```typescript
// loadCurrentTenant checks localStorage BEFORE super admin logic
// So even super admins get simulation restoration
// But they can always use switchToTenant() to override
```

---

## Migration & Deployment

### No Database Changes Required

✅ No schema updates
✅ No data migration
✅ No RLS policy changes
✅ Fully backwards compatible

### Deployment Steps

#### 1. Deploy Code (Automatic)
```bash
git push origin main
# Netlify auto-deploys
```

#### 2. Configure DNS (One-Time)
```
Add CNAME record in your DNS provider:
Host: simulation
Value: haccare.netlify.app
TTL: 300 (or Auto)
```

#### 3. Add Domain Alias in Netlify
```
1. Netlify Dashboard → Domain Settings
2. Add domain alias: simulation.haccare.app
3. Wait for SSL certificate (auto-provisioned)
```

#### 4. Test Subdomain
```
Visit: https://simulation.haccare.app
Should automatically load simulation tenant
```

### Rollback Plan

If issues arise, simply revert the commits:
```bash
git revert <commit-hash>
git push origin main
```

**No data corruption risk** - localStorage is client-side only.

---

## Future Enhancements

### Potential Improvements

1. **Simulation Session Timeout**
```typescript
localStorage.setItem('simulation_entered_at', Date.now());
// On load, check if > 8 hours old, auto-exit
```

2. **Remember Last Simulation**
```typescript
// After exiting, store in separate key
localStorage.setItem('last_simulation_id', tenantId);
// Show "Return to Simulation" button
```

3. **Offline Support**
```typescript
// Cache simulation data in IndexedDB
// Allow offline simulation review
```

4. **Cross-Device Sync**
```typescript
// Store simulation state in database (optional)
// For users who switch devices mid-simulation
```

---

## Summary

### Question: "Will subdomain fix the refresh issue?"

**Answer: YES, but we added localStorage as well for maximum reliability!**

| Environment | Method | Survives Refresh | Notes |
|-------------|--------|------------------|-------|
| **Development** | localStorage | ✅ YES | Added in this fix |
| **Production** | Subdomain + localStorage | ✅ YES | Double protection |

### What Changed

**Before:**
- ❌ Refresh → Lost simulation context
- ❌ User kicked back to home tenant
- ❌ Had to re-enter simulation

**After:**
- ✅ Refresh → Simulation context restored
- ✅ User stays in simulation
- ✅ Works in dev AND production
- ✅ Exit button for manual return

### Key Achievements

1. **localStorage persistence** - Works everywhere (dev + prod)
2. **Subdomain detection** - Works in production
3. **Exit simulation button** - User-controlled exit
4. **Automatic cleanup** - Handles expired simulations
5. **Security maintained** - All RLS policies still enforced

**Student experience:**
- Enter simulation once
- Work for hours
- Refresh as needed
- Context preserved ✅
- Exit when done
