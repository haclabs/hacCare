# Simulation Subdomain Routing Fix

## Problem

When visiting `simulation.haccare.app`, the app loaded the regular login page instead of the simulation portal.

**Root Cause:**
- DNS CNAME was configured correctly ✅
- Netlify domain alias was added correctly ✅
- netlify.toml redirect was configured correctly ✅
- **BUT** the React app didn't check the subdomain at the top level ❌

The app only routed to `SimulationRouter` when the **path** was `/simulation-portal`, but when visiting `simulation.haccare.app`, you're at the **root path** `/`, so it showed the regular app.

## Solution

Added subdomain detection in `App.tsx` that automatically redirects to `/simulation-portal` when the app detects it's running on the simulation subdomain.

### Code Change

**File:** `src/App.tsx`

```typescript
// Added imports
import { useState, lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

function App() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Detect simulation subdomain and redirect to simulation portal
  useEffect(() => {
    const hostname = window.location.hostname;
    const isSimulationSubdomain = hostname.startsWith('simulation.');
    
    if (isSimulationSubdomain && !location.pathname.startsWith('/simulation-portal')) {
      console.log('🎮 Simulation subdomain detected, redirecting to portal...');
      navigate('/simulation-portal', { replace: true });
    }
  }, [location, navigate]);
  
  // ... rest of app
}
```

## How It Works Now

### Complete Flow

```
1. User visits: https://simulation.haccare.app
   ↓
2. DNS CNAME resolves to Netlify
   ↓
3. Netlify serves /index.html (React app)
   ↓
4. React app loads at root path "/"
   ↓
5. App.tsx useEffect runs
   ↓
6. Detects: hostname.startsWith('simulation.') → TRUE
   ↓
7. Checks: location.pathname is "/" (not /simulation-portal)
   ↓
8. Executes: navigate('/simulation-portal', { replace: true })
   ↓
9. React Router navigates to /simulation-portal
   ↓
10. SimulationRouter component loads
   ↓
11. If authenticated: Shows SimulationPortal
    If not: Shows SimulationLogin
   ↓
12. TenantContext detects subdomain and loads simulation tenant
   ↓
13. ✅ User in simulation!
```

### Visual Flow Diagram

```
simulation.haccare.app
         ↓
    DNS (CNAME)
         ↓
    Netlify Server
         ↓
    index.html
         ↓
    App.tsx loads
         ↓
  ┌──────────────────┐
  │ useEffect Check  │
  │ Is subdomain     │
  │ simulation.*?    │
  └────────┬─────────┘
           ↓ YES
  ┌──────────────────┐
  │ navigate to      │
  │ /simulation-     │
  │ portal           │
  └────────┬─────────┘
           ↓
  ┌──────────────────┐
  │ SimulationRouter │
  │ Component        │
  └────────┬─────────┘
           ↓
    ┌─────┴─────┐
    │           │
  Logged In?  Not Logged
    │           │
    ↓           ↓
SimulationPortal  SimulationLogin
```

## Testing

### Before Fix
```
Visit: https://simulation.haccare.app
Result: Shows regular login page (wrong!)
```

### After Fix
```
Visit: https://simulation.haccare.app
Console: "🎮 Simulation subdomain detected, redirecting to portal..."
Result: Shows SimulationLogin (correct!)
```

### Test Cases

#### Test 1: Not Logged In
1. Visit `https://simulation.haccare.app`
2. Should see **SimulationLogin** page
3. Console shows: `🎮 Simulation subdomain detected, redirecting to portal...`

#### Test 2: Already Logged In
1. Login at main site first
2. Visit `https://simulation.haccare.app`
3. Should see **SimulationPortal** with simulation assignments
4. Auto-routes based on assignments (1 = auto-enter, 2+ = selection)

#### Test 3: Main Domain Still Works
1. Visit `https://haccare.app` (or www.haccare.app)
2. Should see **regular login/dashboard** (not simulation)
3. No redirect occurs

#### Test 4: Direct Path Access
1. Visit `https://simulation.haccare.app/patient/123`
2. Redirect should occur → `/simulation-portal`
3. Then SimulationRouter handles auth/routing

## Edge Cases Handled

### ✅ Already on /simulation-portal
```typescript
if (isSimulationSubdomain && !location.pathname.startsWith('/simulation-portal')) {
  // Only redirects if NOT already on simulation portal path
}
```

**Why:** Prevents infinite redirect loop

### ✅ Regular Domain Access
```typescript
const isSimulationSubdomain = hostname.startsWith('simulation.');
// Only true for simulation.haccare.app, not haccare.app
```

**Why:** Main app works normally

### ✅ Deep Links in Simulation
If someone shares: `https://simulation.haccare.app/simulation-portal/some-path`
- Path already starts with `/simulation-portal`
- No redirect occurs
- Works as expected

### ✅ Development Mode
In development (localhost, Codespaces):
- `hostname.startsWith('simulation.')` → FALSE
- No redirect occurs
- Use `/simulation-portal` path directly

## Configuration Summary

For simulation subdomain to work, you need **all three layers**:

### ✅ Layer 1: DNS (External)
```
CNAME: simulation → haccare.netlify.app
```

### ✅ Layer 2: Netlify (Platform)
```
Domain alias: simulation.haccare.app
netlify.toml: Redirect to /index.html
```

### ✅ Layer 3: React App (Code) - **THIS WAS MISSING!**
```typescript
// App.tsx - Now added!
useEffect(() => {
  if (hostname.startsWith('simulation.')) {
    navigate('/simulation-portal');
  }
}, [location]);
```

## Deployment

### Update Required
Push this change to trigger Netlify rebuild:

```bash
git add src/App.tsx
git commit -m "Fix: Add subdomain detection redirect for simulation.haccare.app"
git push origin main
```

### Verify Deployment
1. Wait for Netlify build to complete (~2-3 minutes)
2. Visit `https://simulation.haccare.app`
3. Should now redirect to simulation portal ✅

### DNS Propagation
If you just added the CNAME record:
- Wait 5-10 minutes for DNS propagation
- Clear browser cache (Ctrl+Shift+R)
- Try in incognito/private window

## Troubleshooting

### Issue: Still seeing regular login

**Check 1: DNS Propagation**
```bash
nslookup simulation.haccare.app
# Should return Netlify IP address
```

**Check 2: Netlify Build**
- Check Netlify dashboard
- Ensure latest commit is deployed
- Check build logs for errors

**Check 3: Browser Cache**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or try incognito/private window

**Check 4: Console Logs**
- Open browser DevTools (F12)
- Look for: `🎮 Simulation subdomain detected, redirecting to portal...`
- If you don't see this, the code may not be deployed

### Issue: Redirect loop

**Symptom:** Page keeps refreshing, console shows redirect over and over

**Fix:** Check that the condition includes:
```typescript
!location.pathname.startsWith('/simulation-portal')
```

This prevents redirecting when already on the target path.

### Issue: Main site also redirects

**Symptom:** `haccare.app` redirects to simulation portal

**Check:** Make sure the condition is:
```typescript
hostname.startsWith('simulation.')
// NOT just: hostname.includes('simulation')
```

## Alternative Approach (Not Used)

We could have used React Router's location-based rendering without redirect:

```typescript
// Not recommended - requires checking subdomain everywhere
const isSimulation = window.location.hostname.startsWith('simulation.');

return isSimulation ? <SimulationRouter /> : <NormalApp />
```

**Why we didn't use this:**
- Would require checking subdomain in many places
- SimulationRouter already handles its own routing
- Redirect approach is cleaner and more explicit
- Better URL structure (clear /simulation-portal path)

## Summary

**Before:**
- ❌ `simulation.haccare.app` → Regular login
- ❌ No automatic routing
- ❌ Users confused

**After:**
- ✅ `simulation.haccare.app` → Simulation portal
- ✅ Automatic redirect on subdomain detection
- ✅ Clear console logging
- ✅ Works with existing simulation routing

**Key Achievement:** The simulation subdomain now works as intended, automatically routing users to the simulation portal without requiring manual path entry.
