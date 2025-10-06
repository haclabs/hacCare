# Simulation Portal - User Flow Diagrams

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SIMULATION PORTAL                            │
│                    simulation.haccare.app                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
                    ┌────────────┴────────────┐
                    │    Authentication       │
                    │    (ProtectedRoute)     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              Not Logged In             Logged In
                    │                         │
                    ▼                         ▼
           ┌─────────────────┐     ┌──────────────────┐
           │ SimulationLogin │     │ SimulationPortal │
           └─────────────────┘     └──────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        │    Get User Simulation Assignments      │
                        │  getUserSimulationAssignments(userId)   │
                        └────────────────────┬────────────────────┘
                                             │
                ┌────────────────────────────┼────────────────────────────┐
                │                            │                            │
                │                            │                            │
           0 Assignments              1 Assignment              2+ Assignments
                │                            │                            │
                ▼                            ▼                            ▼
    ┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
    │ No Simulations Msg  │    │  Auto-Redirect (1.5s)│    │ Selection Screen    │
    │                     │    │  ┌─────────────────┐ │    │ ┌─────┐  ┌─────┐   │
    │ "Contact instructor"│    │  │ Loading Screen  │ │    │ │ Sim1│  │ Sim2│   │
    │ "Check email"       │    │  │ "Entering..."   │ │    │ └─────┘  └─────┘   │
    └─────────────────────┘    │  └─────────────────┘ │    │ ┌─────┐  ┌─────┐   │
                               │          │           │    │ │ Sim3│  │ Sim4│   │
                               │          ▼           │    │ └─────┘  └─────┘   │
                               │  ┌─────────────────┐ │    └──────────┬──────────┘
                               │  │   Simulation    │ │               │
                               │  │   Workspace     │ │               │ Click
                               │  └─────────────────┘ │               ▼
                               └──────────────────────┘    ┌─────────────────┐
                                                           │   Simulation    │
                                                           │   Workspace     │
                                                           └─────────────────┘

                    INSTRUCTOR VIEW (Admin/Instructor Role)
                                    │
                                    ▼
                    ┌───────────────────────────────────┐
                    │    Instructor Dashboard           │
                    │                                   │
                    │  ┌──────────────────────────┐    │
                    │  │  Quick Actions           │    │
                    │  │  ┌──────┐  ┌──────┐     │    │
                    │  │  │Launch│  │Manage│     │    │
                    │  │  │ New  │  │ All  │     │    │
                    │  │  └──────┘  └──────┘     │    │
                    │  └──────────────────────────┘    │
                    │                                   │
                    │  Active Simulations:              │
                    │  ┌────────────────────────┐      │
                    │  │ Sim 1: Cardiac Care    │      │
                    │  │ Role: Instructor       │      │
                    │  │ [Enter Simulation]     │      │
                    │  └────────────────────────┘      │
                    │  ┌────────────────────────┐      │
                    │  │ Sim 2: Trauma Response │      │
                    │  │ Role: Instructor       │      │
                    │  │ [Enter Simulation]     │      │
                    │  └────────────────────────┘      │
                    └───────────────────────────────────┘
```

## Student Flow - Single Assignment

```
                    ┌─────────────────────┐
                    │   Student Logs In   │
                    │   at simulation     │
                    │   .haccare.app      │
                    └──────────┬──────────┘
                               │
                               │ API Call
                               ▼
                    ┌──────────────────────┐
                    │ getUserSimulation    │
                    │ Assignments(userId)  │
                    └──────────┬───────────┘
                               │
                               │ Returns 1 simulation
                               ▼
                    ┌──────────────────────┐
                    │  Loading Screen      │
                    │                      │
                    │  [🔄 Spinner]       │
                    │  "Entering Sim..."   │
                    │  Cardiac Care        │
                    │                      │
                    │  → Redirecting you   │
                    │     now...           │
                    └──────────┬───────────┘
                               │
                               │ After 1.5 seconds
                               ▼
                    ┌──────────────────────┐
                    │  Simulation          │
                    │  Workspace           │
                    │                      │
                    │  [Patient List]      │
                    │  [Vital Signs]       │
                    │  [Medications]       │
                    │  [Documentation]     │
                    └──────────────────────┘
```

## Student Flow - Multiple Assignments

```
                    ┌─────────────────────┐
                    │   Student Logs In   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌──────────────────────────────────────┐
                    │  Selection Screen                    │
                    │  "Select a Simulation"               │
                    │                                      │
                    │  ┌────────────────────────────────┐ │
                    │  │ Cardiac Care                   │ │
                    │  │ Description: Advanced cardiac  │ │
                    │  │ Role: Student                  │ │
                    │  │ Started: Oct 5, 2025           │ │
                    │  │ [Enter Simulation →]           │ │
                    │  └────────────────────────────────┘ │
                    │                                      │
                    │  ┌────────────────────────────────┐ │
                    │  │ Trauma Response                │ │
                    │  │ Description: ER trauma cases   │ │
                    │  │ Role: Student                  │ │
                    │  │ Started: Oct 4, 2025           │ │
                    │  │ [Enter Simulation →]           │ │
                    │  └────────────────────────────────┘ │
                    │                                      │
                    │  ┌────────────────────────────────┐ │
                    │  │ Pediatric Assessment           │ │
                    │  │ Description: Child assessment  │ │
                    │  │ Role: Student                  │ │
                    │  │ Started: Oct 3, 2025           │ │
                    │  │ [Enter Simulation →]           │ │
                    │  └────────────────────────────────┘ │
                    └──────────────┬───────────────────────┘
                                   │
                                   │ Click any simulation
                                   ▼
                    ┌──────────────────────┐
                    │  Chosen Simulation   │
                    │  Workspace           │
                    └──────────────────────┘
```

## Student Flow - No Assignments

```
                    ┌─────────────────────┐
                    │   Student Logs In   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌──────────────────────────────────────┐
                    │  No Active Simulations               │
                    │                                      │
                    │  [ℹ️ Alert Icon]                    │
                    │                                      │
                    │  You are not currently assigned to   │
                    │  any active simulations.             │
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │ To join a simulation:           ││
                    │  │                                 ││
                    │  │ • Contact your instructor for   ││
                    │  │   simulation access             ││
                    │  │ • Check your email for          ││
                    │  │   simulation invitations        ││
                    │  │ • Wait for your instructor to   ││
                    │  │   add you to a simulation       ││
                    │  └─────────────────────────────────┘│
                    │                                      │
                    │  Need help? Contact your instructor  │
                    └──────────────────────────────────────┘
```

## Instructor Flow

```
                    ┌─────────────────────┐
                    │  Instructor Logs In │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌──────────────────────────────────────┐
                    │  Instructor Dashboard                │
                    │  "Manage and launch simulations"     │
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │ Quick Actions                   ││
                    │  │ [▶️ Launch New Simulation]      ││
                    │  │ [👥 Manage All Simulations]     ││
                    │  └─────────────────────────────────┘│
                    │                                      │
                    │  Your Active Simulations:            │
                    │                                      │
                    │  ┌────────────────────────────────┐ │
                    │  │ Cardiac Emergency Response     │ │
                    │  │ Advanced cardiac scenarios     │ │
                    │  │ [Active] Instructor            │ │
                    │  │ Started: Oct 5, 2025           │ │
                    │  │ [Enter Simulation →]           │ │
                    │  └────────────────────────────────┘ │
                    │                                      │
                    │  ┌────────────────────────────────┐ │
                    │  │ Trauma Assessment              │ │
                    │  │ ER trauma response training    │ │
                    │  │ [Active] Instructor            │ │
                    │  │ Started: Oct 4, 2025           │ │
                    │  │ [Enter Simulation →]           │ │
                    │  └────────────────────────────────┘ │
                    └──────────┬───────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
    ┌────────────────┐ ┌────────────┐ ┌──────────────┐
    │ Enter          │ │ Launch New │ │ Manage All   │
    │ Simulation     │ │ Simulation │ │ Simulations  │
    │ Workspace      │ │ Manager    │ │              │
    └────────────────┘ └────────────┘ └──────────────┘
```

## Database Query Flow

```
┌────────────────────────────────────────────────────────────┐
│  getUserSimulationAssignments(userId)                      │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  SELECT FROM simulation_participants sp                    │
│  INNER JOIN simulation_active sa                           │
│    ON sp.simulation_id = sa.id                             │
│  WHERE sp.user_id = $1                                     │
│    AND sa.status = 'active'                                │
│  ORDER BY sp.granted_at DESC                               │
└────────────────────────┬───────────────────────────────────┘
                         │
                         │ Returns array of:
                         ▼
┌────────────────────────────────────────────────────────────┐
│ [                                                          │
│   {                                                        │
│     id: 'participant-uuid',                                │
│     simulation_id: 'sim-uuid',                             │
│     role: 'student',                                       │
│     granted_at: '2025-10-05T...',                          │
│     simulation: {                                          │
│       id: 'sim-uuid',                                      │
│       name: 'Cardiac Care',                                │
│       description: '...',                                  │
│       status: 'active',                                    │
│       started_at: '2025-10-05T...',                        │
│       tenant_id: 'tenant-uuid'                             │
│     }                                                      │
│   },                                                       │
│   ...                                                      │
│ ]                                                          │
└────────────────────────────────────────────────────────────┘
```

## Security Flow (RLS)

```
                    ┌──────────────────────┐
                    │   User Makes Query   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Supabase RLS Check  │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌────────────┐  ┌────────────┐  ┌──────────┐
        │  Student   │  │ Instructor │  │  Admin   │
        └──────┬─────┘  └──────┬─────┘  └─────┬────┘
               │               │               │
               ▼               ▼               ▼
    ┌──────────────────┐ ┌───────────┐ ┌────────────┐
    │ Can see:         │ │ Can see:  │ │ Can see:   │
    │ • Own assign-    │ │ • All     │ │ • ALL      │
    │   ments only     │ │   teaching│ │   sims     │
    │ • Assigned sims  │ │   sims    │ │            │
    │                  │ │ • All     │ │ Can do:    │
    │ Cannot:          │ │   particip│ │ • Delete   │
    │ • Create sims    │ │   ants    │ │ • Override │
    │ • Delete sims    │ │           │ │ • Full     │
    │ • Add others     │ │ Can do:   │ │   control  │
    └──────────────────┘ │ • Create  │ └────────────┘
                         │ • Launch  │
                         │ • Manage  │
                         └───────────┘
```

## Deployment Flow

```
1. Database Setup
   ├── Run setup_simulation_portal_rls.sql
   │   ├── Create RLS policies
   │   ├── Grant permissions
   │   └── Verify policies
   └── ✅ Done

2. DNS Configuration
   ├── Add CNAME record
   │   └── simulation → haccare.app
   ├── Wait for propagation (24-48h)
   └── ✅ DNS resolving

3. Netlify/CDN Setup
   ├── Add domain alias
   │   └── simulation.haccare.app
   ├── Update redirects
   │   └── netlify.toml or _redirects
   ├── Provision SSL certificate
   │   └── Let's Encrypt (automatic)
   └── ✅ HTTPS working

4. Testing
   ├── Test DNS: nslookup
   ├── Test HTTPS: curl -I
   ├── Test login flow
   ├── Test auto-routing
   ├── Test RLS security
   └── ✅ All tests passing

5. Monitoring
   ├── Check Supabase logs
   ├── Monitor user feedback
   ├── Track error rates
   └── ✅ System stable
```

---

**Visual Guide Version:** 1.0
**Created:** October 6, 2025
**Purpose:** Easy-to-understand flow diagrams for simulation portal
