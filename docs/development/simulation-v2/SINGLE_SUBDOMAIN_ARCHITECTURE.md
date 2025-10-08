# Single Subdomain for Multiple Simulations

## Architecture

All simulations are accessed through a **single subdomain**: `simulation.haccare.app`

This eliminates the need to create multiple CNAMEs or Netlify domain aliases for each simulation.

## How It Works

### Single Subdomain, Multiple Simulations

```
simulation.haccare.app
         ↓
  Portal (selection)
         ↓
    User selects simulation
         ↓
  Enters specific simulation tenant
         ↓
  Dashboard with simulation patients
```

### Flow Diagram

```
┌─────────────────────────────────┐
│  simulation.haccare.app         │
│  (Single DNS CNAME)             │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│  Simulation Portal              │
│  - List user's assignments      │
│  - Select which simulation      │
└────────────┬────────────────────┘
             ↓
      ┌──────┴───────┐
      │              │
  Simulation A   Simulation B
  (Tenant 123)   (Tenant 456)
      │              │
      ↓              ↓
  Dashboard      Dashboard
  (A patients)   (B patients)
```

## Implementation

### 1. DNS Configuration (One Time)

**Single CNAME Record:**
```
Type: CNAME
Name: simulation
Target: haccare.netlify.app
```

That's it! No additional DNS records needed for each simulation.

### 2. Netlify Configuration (One Time)

**Single Domain Alias:**
```
Domain Alias: simulation.haccare.app
```

No additional configuration per simulation.

### 3. Code Changes

#### TenantContext.tsx - Skip Subdomain Detection for Simulation Portal

**Before (Problem):**
```typescript
// Would try to load tenant by subdomain "simulation"
// But there's no single "simulation" tenant!
const currentSubdomain = getCurrentSubdomain(); // "simulation"
if (currentSubdomain && process.env.NODE_ENV === 'production') {
  const { data: subdomainTenant } = await getTenantBySubdomain(currentSubdomain);
  // This would fail or load wrong tenant
}
```

**After (Fixed):**
```typescript
// Skip subdomain detection for "simulation" portal
const currentSubdomain = getCurrentSubdomain();
if (currentSubdomain && 
    currentSubdomain !== 'simulation' &&  // ← NEW: Skip portal subdomain
    process.env.NODE_ENV === 'production') {
  console.log('🔍 Checking subdomain tenant:', currentSubdomain);
  const { data: subdomainTenant } = await getTenantBySubdomain(currentSubdomain);
  if (subdomainTenant && !subdomainError) {
    // Load tenant for OTHER subdomains (e.g., "hospital1.haccare.app")
    setCurrentTenant(subdomainTenant);
    return;
  }
}

// Continue with localStorage check or user's home tenant
```

**Why:**
- `simulation.haccare.app` hosts **multiple** simulations
- Each simulation has its own tenant (Trauma Sim, Cardiac Sim, etc.)
- Tenant is determined by **user selection**, not subdomain
- Only localStorage or user assignment determines tenant

#### App.tsx - Smart Redirect Logic

**Before (Problem):**
```typescript
// Would redirect root "/" to portal
// Then when navigating to dashboard, would redirect AGAIN
// Infinite loop!
if (isSimulationSubdomain && !currentPath.startsWith('/simulation-portal')) {
  navigate('/simulation-portal', { replace: true });
}
```

**After (Fixed):**
```typescript
// Redirect ONLY if not on portal, dashboard, or patient pages
if (isSimulationSubdomain && 
    !currentPath.startsWith('/simulation-portal') && 
    !currentPath.startsWith('/dashboard') &&      // ← NEW: Allow dashboard
    !currentPath.startsWith('/patient')) {        // ← NEW: Allow patient pages
  console.log('🎮 Simulation subdomain detected, redirecting to portal...');
  navigate('/simulation-portal', { replace: true });
}
```

**Why:**
- Initial visit → Redirect to portal ✅
- After entering simulation → Allow navigation to dashboard ✅
- Viewing patients → Allow navigation ✅
- No infinite loops ✅

#### SimulationPortal.tsx - Navigate to Dashboard After Entry

**Before (Problem):**
```typescript
// Navigated to root "/"
window.location.href = '/';
// This triggered App.tsx redirect back to portal → Loop!
```

**After (Fixed):**
```typescript
// Navigate directly to dashboard
window.location.href = '/dashboard';
// Dashboard is allowed by App.tsx redirect logic → No loop!
```

**Why:**
- `/dashboard` shows simulation patients in context
- Bypasses portal redirect logic
- Full page reload ensures all contexts refresh

## User Experience

### Scenario 1: Student with One Simulation

1. Visit `https://simulation.haccare.app`
2. Login (or already logged in)
3. Portal detects **1 assignment** → Auto-enters after 1.5s
4. Switches to simulation tenant (localStorage saved)
5. Navigates to `/dashboard`
6. Sees simulation patients ✅

**Console Output:**
```
🎮 Simulation subdomain detected, redirecting to portal...
🎯 Auto-routing to single simulation: Trauma Code Blue
🔄 Switching to simulation tenant: abc-123
💾 Simulation tenant saved to localStorage
✅ Entered simulation: Trauma Code Blue
```

### Scenario 2: Student with Multiple Simulations

1. Visit `https://simulation.haccare.app`
2. Login
3. Portal shows **selection screen** with 2+ simulations
4. Student clicks "Enter Simulation" on one
5. Switches to that simulation's tenant
6. Navigates to `/dashboard`
7. Sees that simulation's patients ✅

### Scenario 3: Instructor Managing Simulations

1. Visit `https://simulation.haccare.app`
2. Login as admin/super_admin
3. Portal shows **instructor dashboard**
4. Can enter any simulation to monitor
5. Can switch between simulations
6. Manage simulation settings ✅

### Scenario 4: Refresh During Simulation

1. Student in simulation at `/dashboard`
2. Refreshes browser (F5)
3. **localStorage check** restores simulation tenant
4. TenantContext loads correct simulation
5. Dashboard still shows simulation patients ✅
6. No redirect to portal (dashboard path allowed)

### Scenario 5: Visit Root While in Simulation

1. Student in simulation
2. Manually navigates to `/` (root)
3. App.tsx detects simulation subdomain
4. Redirects to `/simulation-portal`
5. Portal shows current simulation or selection
6. Can continue or exit simulation

## Tenant Detection Priority

```
1. localStorage Check
   ↓ (simulation tenant found?)
   YES → Load simulation tenant
   NO ↓
   
2. Subdomain Check
   ↓ (is subdomain "simulation"?)
   YES → Skip (multiple sims use this subdomain)
   NO ↓ Check other subdomains
   
3. User's Home Tenant
   Load getCurrentUserTenant()
   ↓
   Portal shows simulation assignments
```

## Navigation Flow

### Initial Visit to simulation.haccare.app

```
URL: https://simulation.haccare.app/
         ↓
App.tsx useEffect:
  - Detects simulation subdomain ✓
  - Path is "/" (not portal/dashboard/patient)
  - navigate('/simulation-portal', { replace: true })
         ↓
SimulationRouter renders:
  - Not logged in? → SimulationLogin
  - Logged in? → SimulationPortal
         ↓
SimulationPortal loads:
  - Fetches user's simulation assignments
  - 1 assignment? → Auto-enter
  - 2+ assignments? → Show selection
  - 0 assignments? → Show message
```

### After Entering Simulation

```
Student clicks "Enter Simulation"
         ↓
enterSimulation(tenantId, name):
  1. enterSimulationTenant(tenantId)
  2. localStorage.setItem('current_simulation_tenant', tenantId)
  3. window.location.href = '/dashboard'
         ↓
Page reloads at /dashboard
         ↓
App.tsx useEffect:
  - Detects simulation subdomain ✓
  - Path is "/dashboard" ✓
  - NO redirect (dashboard is allowed)
         ↓
TenantContext loads:
  - Checks localStorage → Finds simulation tenant
  - Restores simulation context
         ↓
Dashboard renders with simulation patients ✅
```

## Why This Architecture?

### ✅ Benefits

1. **Single DNS Entry**
   - One CNAME record: `simulation → haccare.netlify.app`
   - No need to create DNS entries per simulation

2. **Single Netlify Config**
   - One domain alias: `simulation.haccare.app`
   - No need to configure each simulation

3. **Scalable**
   - Create 100 simulations? Still just one subdomain
   - Add users to simulations? No infrastructure changes

4. **User-Friendly**
   - Single URL to remember: `simulation.haccare.app`
   - Works for all simulations
   - Clear separation from main app

5. **Maintainable**
   - All simulation routing in one place
   - Consistent user experience
   - Easy to update/improve

### 🚫 What Doesn't Work (and Why We Don't Want It)

**Individual Subdomains Per Simulation:**
```
❌ trauma-sim.haccare.app  → Requires DNS CNAME
❌ cardiac-sim.haccare.app → Requires DNS CNAME
❌ peds-sim.haccare.app    → Requires DNS CNAME
...
```

**Problems:**
- Need to create DNS record for each sim
- Need to add Netlify alias for each sim
- Difficult to scale to hundreds of simulations
- DNS propagation delays for new simulations
- More complex routing logic

## Testing

### Test 1: Initial Visit (Not Logged In)

```bash
# Visit root
curl -I https://simulation.haccare.app/

# Expected:
# - Redirects to /simulation-portal
# - Shows SimulationLogin
```

**In Browser:**
1. Visit `https://simulation.haccare.app`
2. Should see **SimulationLogin** page
3. Console: `🎮 Simulation subdomain detected, redirecting to portal...`

### Test 2: Portal Selection

```bash
# Login and check assignments
# Should see portal with simulations
```

**In Browser:**
1. Login at simulation subdomain
2. Should see **Simulation Portal**
3. Shows your simulation assignments
4. Can select and enter simulation

### Test 3: Dashboard Navigation (No Loop)

```bash
# After entering simulation
# Navigate to dashboard
# Should NOT redirect back to portal
```

**In Browser:**
1. Enter a simulation
2. URL changes to `/dashboard`
3. Should see **Dashboard with simulation patients**
4. No redirect loop
5. Console: No additional redirect messages

### Test 4: Refresh Persistence

```bash
# Refresh while at dashboard
# Should stay in simulation
```

**In Browser:**
1. In simulation at `/dashboard`
2. Press F5 (refresh)
3. Console: `🎮 Restoring simulation tenant from localStorage`
4. Should see **same simulation dashboard**
5. No redirect to portal

### Test 5: Manual Root Navigation

```bash
# Navigate to root while in simulation
# Should redirect to portal
```

**In Browser:**
1. In simulation at `/dashboard`
2. Manually navigate to `/`
3. App detects simulation subdomain
4. Redirects to `/simulation-portal`
5. Portal shows current simulation context

## Troubleshooting

### Issue: "Entering simulation..." infinite loop

**Symptoms:**
- After login, page keeps showing "Entering simulation..."
- Console shows repeated redirects
- Never reaches dashboard

**Cause:**
- Navigation to root `/` instead of `/dashboard`
- App.tsx redirect logic doesn't allow root path

**Fix:**
```typescript
// In SimulationPortal.tsx
window.location.href = '/dashboard'; // Not '/'
```

✅ **Already fixed in latest code**

### Issue: Regular login instead of SimulationLogin

**Symptoms:**
- At `simulation.haccare.app`
- Shows regular login, not simulation-branded

**Possible Causes:**

1. **Not redirecting to /simulation-portal**
   - Check App.tsx useEffect
   - Should detect subdomain and redirect

2. **SimulationRouter not rendering SimulationLogin**
   - Check if user is null
   - Should show SimulationLogin when !user

**Check:**
```javascript
// Console should show:
🎮 Simulation subdomain detected, redirecting to portal...

// If not, App.tsx redirect isn't working
```

### Issue: Tenant loads from subdomain (wrong)

**Symptoms:**
- Console shows: "Checking subdomain tenant: simulation"
- Tries to load tenant by subdomain
- Fails or loads wrong tenant

**Cause:**
- TenantContext trying to load tenant named "simulation"

**Fix:**
```typescript
// In TenantContext.tsx
if (currentSubdomain && 
    currentSubdomain !== 'simulation' && // ← Check this line exists
    process.env.NODE_ENV === 'production') {
  // Load tenant by subdomain
}
```

✅ **Already fixed in latest code**

### Issue: Can't navigate in simulation

**Symptoms:**
- Every click redirects back to portal
- Can't view patients
- Can't access other pages

**Cause:**
- App.tsx redirect is too aggressive
- Doesn't allow dashboard/patient paths

**Fix:**
```typescript
// In App.tsx
if (isSimulationSubdomain && 
    !currentPath.startsWith('/simulation-portal') && 
    !currentPath.startsWith('/dashboard') &&     // ← Check these
    !currentPath.startsWith('/patient')) {       // ← exist
  navigate('/simulation-portal');
}
```

✅ **Already fixed in latest code**

## Summary

**Key Changes:**

1. ✅ TenantContext skips subdomain detection for "simulation"
2. ✅ App.tsx allows dashboard/patient paths in simulation
3. ✅ SimulationPortal navigates to `/dashboard` not `/`
4. ✅ Single subdomain hosts all simulations
5. ✅ No infinite loops
6. ✅ No additional DNS configuration per simulation

**User Experience:**

- Visit `simulation.haccare.app` → Portal
- Select simulation → Dashboard with simulation patients
- Refresh → Stays in simulation
- Navigate → No redirects/loops
- Exit → Returns to home tenant

**Infrastructure:**

- **1 DNS CNAME** for unlimited simulations
- **1 Netlify alias** for all simulations  
- **localStorage + user assignments** determine specific simulation
- **Scalable** to thousands of simulations

This architecture provides a clean, maintainable, and scalable solution for hosting multiple simulations under a single subdomain!
