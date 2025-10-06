# Simulation Portal - Architecture & Implementation

## Overview

The Simulation Portal provides a dedicated entry point for simulation users at `simulation.haccare.app`. It implements intelligent auto-routing based on user roles and simulation assignments, creating a seamless experience for both instructors and students.

## Architecture

### 1. **Subdomain Routing**
- **Production**: `simulation.haccare.app` → Simulation Portal
- **Development**: `?simulation` param or `/simulation-portal` path
- **Main App**: `haccare.app` → Standard application

### 2. **Components**

#### **SimulationPortal.tsx**
Main component that handles the portal logic:

```typescript
- Auto-detects user's simulation assignments
- Routes based on number of assignments:
  * 0 assignments (student) → Show "no simulations" message
  * 1 assignment → Auto-redirect to simulation after 1.5s
  * 2+ assignments → Show selection screen
  * Instructor → Show dashboard with quick actions
```

**Features:**
- Real-time simulation assignment loading
- Auto-routing for single assignments
- Simulation selection for multiple assignments
- Quick launch for instructors
- Helpful messages for unassigned users

#### **SimulationRouter.tsx**
Handles subdomain detection and authentication routing:

```typescript
- Checks if user is on simulation subdomain
- Redirects unauthenticated users to SimulationLogin
- Routes authenticated users to SimulationPortal
```

#### **SimulationLogin.tsx**
Already existed - specialized login for simulation access

### 3. **Service Layer**

#### **getUserSimulationAssignments(userId)**
```typescript
// Returns all active simulations for a user with full details
- Queries: simulation_participants joined with simulation_active
- Filters: Only active simulations
- Returns: Array with simulation details and user's role
```

### 4. **User Experience Flows**

#### **Student Flow**
1. Navigate to `simulation.haccare.app`
2. Login with credentials
3. **Auto-routing logic:**
   - ✅ **One simulation** → Auto-redirect to simulation workspace
   - ⚡ **Multiple simulations** → Choose from list
   - ❌ **No simulations** → Friendly message with instructions

#### **Instructor Flow**
1. Navigate to `simulation.haccare.app`
2. Login with credentials
3. See dashboard with:
   - Active simulations list (teaching)
   - "Launch New Simulation" button
   - "Manage All Simulations" button
4. Click simulation → Enter workspace
5. Or launch new simulation → Opens SimulationManager

## Implementation Details

### Database Schema

```sql
-- User assignments to simulations
simulation_participants (
  id UUID PRIMARY KEY,
  simulation_id UUID REFERENCES simulation_active(id),
  user_id UUID REFERENCES auth.users(id),
  role simulation_role ('instructor' | 'student'),
  granted_at TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users(id),
  last_accessed_at TIMESTAMPTZ
)

-- Active simulations
simulation_active (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  status TEXT,
  started_at TIMESTAMPTZ,
  tenant_id UUID REFERENCES tenants(id)
)
```

### Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/simulation-portal` | SimulationPortal | Main entry point |
| `/simulation/:id` | Simulation Workspace | Active simulation |
| `/simulations` | SimulationManager | Admin/instructor management |

### Key Features

#### **1. Auto-Routing**
```typescript
if (assignments.length === 1) {
  // Show loading screen with simulation name
  // Auto-redirect after 1.5 seconds
  setTimeout(() => navigate(`/simulation/${id}`), 1500);
}
```

#### **2. Role-Based UI**
```typescript
const isInstructor = profile?.role === 'admin' || profile?.role === 'instructor';

// Different UI for instructors vs students
if (isInstructor) {
  // Show management options
} else {
  // Show assigned simulations only
}
```

#### **3. Real-Time Updates**
- Uses React Query for automatic refetching
- Updates when assignments change
- Reflects simulation status changes

## Configuration

### Netlify/Vercel Setup
```toml
# netlify.toml
[[redirects]]
  from = "https://simulation.haccare.app/*"
  to = "/simulation-portal/:splat"
  status = 200

# Or DNS alias:
simulation.haccare.app → CNAME → haccare.app
```

### Environment Variables
```env
# No new variables needed - uses existing Supabase config
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Testing Guide

### 1. **Test Single Assignment (Student)**
```sql
-- Create simulation
SELECT launch_simulation(...);

-- Assign ONE student
INSERT INTO simulation_participants (simulation_id, user_id, role, granted_by)
VALUES ('sim-id', 'student-id', 'student', 'admin-id');

-- Expected: Student logs in → Auto-redirects to simulation
```

### 2. **Test Multiple Assignments (Student)**
```sql
-- Assign student to TWO simulations
INSERT INTO simulation_participants (...) VALUES (...); -- Sim 1
INSERT INTO simulation_participants (...) VALUES (...); -- Sim 2

-- Expected: Student logs in → Sees selection screen with both
```

### 3. **Test No Assignments (Student)**
```sql
-- Don't assign student to any simulation
-- Expected: Student logs in → Sees friendly "no simulations" message
```

### 4. **Test Instructor View**
```sql
-- Login as admin/instructor
-- Expected: Sees dashboard with:
--   - Active simulations they're teaching
--   - Quick launch button
--   - Manage button
```

## Security Considerations

### 1. **Row-Level Security (RLS)**
```sql
-- Users can only see their own assignments
CREATE POLICY simulation_participants_select ON simulation_participants
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM user_profiles WHERE role IN ('admin', 'instructor')
    )
  );
```

### 2. **Tenant Isolation**
- Each simulation has its own tenant_id
- All patient data scoped to tenant
- RLS enforces tenant boundaries

### 3. **Authentication**
- Protected by ProtectedRoute component
- Redirects unauthenticated users to login
- Maintains session across subdomain

## Future Enhancements

### Planned Features
1. **Simulation Invitations** - Email invites with links
2. **QR Code Entry** - Quick join via QR code
3. **Live Status** - Real-time participant presence
4. **Push Notifications** - Simulation start/update alerts
5. **Mobile App Support** - Native mobile experience

### Performance Optimizations
1. **Caching** - Cache assignments with React Query
2. **Prefetching** - Prefetch simulation data on portal load
3. **Lazy Loading** - Load simulation details on demand

## Troubleshooting

### Issue: "No simulations found"
**Solution:** Check simulation_participants table - ensure user is assigned

### Issue: "Auto-redirect not working"
**Solution:** Check browser console for navigation errors, verify simulation_id is valid

### Issue: "Portal shows wrong role"
**Solution:** Verify user_profiles.role is correctly set (admin/instructor/nurse)

### Issue: "Can't access simulation"
**Solution:** Check RLS policies and tenant_id matching

## API Reference

### Service Functions

```typescript
// Get user's active simulation assignments
getUserSimulationAssignments(userId: string): Promise<SimulationAssignment[]>

// Update last accessed timestamp
updateParticipantAccess(simulationId: string): Promise<void>

// Add participants to simulation
addSimulationParticipants(
  simulationId: string,
  participants: Array<{ user_id: string; role: string }>
): Promise<void>
```

## Deployment Checklist

- [ ] Configure `simulation.haccare.app` DNS/alias
- [ ] Test subdomain routing in production
- [ ] Verify SSL certificate covers subdomain
- [ ] Test auto-routing with real users
- [ ] Verify RLS policies are active
- [ ] Test instructor quick launch
- [ ] Test student auto-redirect
- [ ] Monitor error logs for issues

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database RLS policies
3. Test with different user roles
4. Review Supabase logs
5. Check network tab for API calls

---

**Last Updated:** October 6, 2025
**Version:** 2.0
**Status:** Ready for Testing ✅
