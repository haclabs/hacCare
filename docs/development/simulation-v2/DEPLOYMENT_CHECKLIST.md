# Simulation Portal - Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [x] SimulationPortal.tsx component created
- [x] SimulationRouter.tsx component created
- [x] getUserSimulationAssignments() function added to simulationService.ts
- [x] Route added to App.tsx for /simulation-portal
- [x] All TypeScript compilation errors resolved
- [x] No console errors in development

### Documentation
- [x] IMPLEMENTATION_SUMMARY.md created
- [x] SIMULATION_PORTAL.md created
- [x] USER_FLOW_DIAGRAMS.md created
- [x] NETLIFY_SUBDOMAIN_SETUP.md created
- [x] README_SIMULATION_PORTAL.md created
- [x] setup_simulation_portal_rls.sql created

## Database Setup

### RLS Policies (Run in Supabase SQL Editor)
- [ ] Copy contents of `setup_simulation_portal_rls.sql`
- [ ] Open Supabase SQL Editor
- [ ] Paste and execute SQL
- [ ] Verify no errors in execution
- [ ] Test policies work correctly:
  ```sql
  -- Test as student
  SELECT * FROM simulation_participants WHERE user_id = 'STUDENT_USER_ID';
  -- Should only see own assignments
  
  -- Test as instructor
  SELECT * FROM simulation_participants WHERE user_id = 'INSTRUCTOR_USER_ID';
  -- Should see all assignments
  ```

### Verify Tables Exist
- [ ] `simulation_participants` table exists
- [ ] `simulation_active` table exists
- [ ] `simulation_templates` table exists
- [ ] `simulation_history` table exists
- [ ] `user_profiles` table exists with role column

### Check Indexes (Optional but Recommended)
```sql
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_simulation_participants_user_id 
  ON simulation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_simulation_participants_simulation_id 
  ON simulation_participants(simulation_id);

CREATE INDEX IF NOT EXISTS idx_simulation_active_status 
  ON simulation_active(status);
```

- [ ] User ID index created
- [ ] Simulation ID index created
- [ ] Status index created

## DNS Configuration

### Add CNAME Record
- [ ] Log into DNS provider (e.g., Cloudflare, Namecheap)
- [ ] Navigate to DNS management for haccare.app
- [ ] Add new CNAME record:
  - **Type:** CNAME
  - **Name:** simulation
  - **Value:** haccare.app (or Netlify URL)
  - **TTL:** 3600 (or Auto)
  - **Proxy Status:** DNS only (if using Cloudflare)
- [ ] Save changes
- [ ] Note: DNS propagation takes 24-48 hours

### Verify DNS Resolution
```bash
# Wait at least 1 hour, then test:
nslookup simulation.haccare.app

# Should return IP address of haccare.app
```

- [ ] DNS resolves to correct IP
- [ ] No NXDOMAIN errors

## Netlify/CDN Configuration

### Add Domain Alias (Netlify Dashboard)
- [ ] Log into Netlify
- [ ] Select haccare.app site
- [ ] Go to Domain Management
- [ ] Click "Add domain alias"
- [ ] Enter: `simulation.haccare.app`
- [ ] Save changes

### Update netlify.toml
- [ ] Open `netlify.toml` in code editor
- [ ] Add redirect rules:
  ```toml
  [[redirects]]
    from = "https://simulation.haccare.app/*"
    to = "/index.html"
    status = 200
    force = false
  ```
- [ ] Commit and push changes
- [ ] Verify Netlify rebuilds site

### SSL Certificate
- [ ] Wait for DNS propagation (24-48 hours)
- [ ] Netlify auto-provisions SSL certificate
- [ ] Go to Netlify → Domain Settings → HTTPS
- [ ] Verify certificate status shows "Active"
- [ ] If not, click "Verify DNS configuration"
- [ ] Then click "Provision certificate"

### Test HTTPS
```bash
curl -I https://simulation.haccare.app

# Expected response:
# HTTP/2 200
# content-type: text/html
```

- [ ] HTTPS responds with 200
- [ ] No certificate errors
- [ ] Page loads correctly

## Application Testing

### Development Environment
- [ ] Test `/simulation-portal` route in localhost
- [ ] Test with `?simulation=true` query parameter
- [ ] Verify auto-routing logic works
- [ ] Check browser console for errors

### Production Environment

#### Test 1: Unauthenticated User
- [ ] Go to `https://simulation.haccare.app`
- [ ] Should show SimulationLogin component
- [ ] Login form displays correctly
- [ ] Can enter credentials

#### Test 2: Student with Single Assignment
- [ ] Create test student in user_profiles
- [ ] Assign to ONE active simulation
- [ ] Login at simulation.haccare.app
- [ ] Should see loading screen with simulation name
- [ ] Should auto-redirect after 1.5 seconds
- [ ] Should land in simulation workspace

#### Test 3: Student with Multiple Assignments
- [ ] Create test student
- [ ] Assign to TWO active simulations
- [ ] Login at simulation.haccare.app
- [ ] Should see selection screen
- [ ] Both simulations display correctly
- [ ] Can click card to enter simulation
- [ ] Clicking enters correct simulation

#### Test 4: Student with No Assignments
- [ ] Create test student
- [ ] Do NOT assign to any simulations
- [ ] Login at simulation.haccare.app
- [ ] Should see "No Active Simulations" message
- [ ] Message is clear and helpful
- [ ] Instructions are displayed

#### Test 5: Instructor Dashboard
- [ ] Login as instructor or admin
- [ ] Should see dashboard immediately (no auto-redirect)
- [ ] Quick action buttons display
- [ ] Active simulations list shows
- [ ] Can click "Launch New Simulation"
- [ ] Can click "Manage All Simulations"
- [ ] Can click individual simulation cards

### Security Testing

#### Test RLS - Student Access
- [ ] Login as Student A (assigned to Sim 1)
- [ ] Open browser dev tools → Network tab
- [ ] Check API calls to simulation_participants
- [ ] Verify response only includes Sim 1
- [ ] Login as Student B (assigned to Sim 2)
- [ ] Verify Student B only sees Sim 2

#### Test RLS - Instructor Access
- [ ] Login as instructor
- [ ] Verify can see all simulations they're teaching
- [ ] Verify can see all participants
- [ ] Try to access another instructor's simulation
- [ ] Should be allowed (instructors see all)

#### Test RLS - Cross-Tenant
- [ ] Login as Student A in Simulation 1
- [ ] Try to manually navigate to Simulation 2 (different tenant)
- [ ] Should be blocked by RLS
- [ ] Should not be able to see patient data from Sim 2

### Performance Testing

#### Load Time
- [ ] Test portal load time (target: < 2 seconds)
- [ ] Use browser dev tools → Network → Reload
- [ ] Check "Load" time in Network tab
- [ ] Optimize if > 2 seconds

#### Query Performance
- [ ] Open browser dev tools → Network
- [ ] Login and load portal
- [ ] Find getUserSimulationAssignments API call
- [ ] Check response time (target: < 500ms)
- [ ] If slow, add database indexes

#### Auto-Redirect Timing
- [ ] Login with single assignment
- [ ] Time from portal load to redirect
- [ ] Should be exactly 1.5 seconds
- [ ] User should see simulation name during wait

### Cross-Browser Testing
- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (latest version)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Mobile Testing
- [ ] Test on iPhone (portrait)
- [ ] Test on iPhone (landscape)
- [ ] Test on Android phone (portrait)
- [ ] Test on Android phone (landscape)
- [ ] Test on iPad (portrait)
- [ ] Test on iPad (landscape)
- [ ] Verify touch interactions work
- [ ] Verify cards are tappable
- [ ] Verify text is readable

## Monitoring Setup

### Application Monitoring
- [ ] Add error tracking (Sentry, LogRocket, etc.)
- [ ] Track portal page views
- [ ] Track auto-redirect events
- [ ] Track simulation selection events
- [ ] Monitor API error rates

### Database Monitoring
- [ ] Check Supabase logs for RLS violations
- [ ] Monitor query performance
- [ ] Set up alerts for slow queries
- [ ] Monitor authentication failures

### User Analytics (Optional)
```typescript
// Add to SimulationPortal.tsx
useEffect(() => {
  // Track portal visit
  analytics.track('simulation_portal_viewed', {
    user_id: user.id,
    assignments_count: assignments.length,
    user_role: profile?.role
  });
}, []);
```

- [ ] Track portal visits
- [ ] Track auto-redirects
- [ ] Track simulation selections
- [ ] Track time spent on portal

## Post-Deployment Verification

### Immediate Checks (Within 1 Hour)
- [ ] Portal loads on simulation.haccare.app
- [ ] HTTPS works without warnings
- [ ] Login flow works
- [ ] Auto-routing works for single assignment
- [ ] Selection screen works for multiple assignments
- [ ] No console errors
- [ ] No 404 errors in Network tab

### 24-Hour Checks
- [ ] DNS fully propagated globally
- [ ] SSL certificate stable
- [ ] No user-reported issues
- [ ] No error spikes in logs
- [ ] Performance metrics within targets

### 1-Week Checks
- [ ] User feedback collected
- [ ] No major bugs reported
- [ ] Performance remains stable
- [ ] RLS working correctly
- [ ] Analytics data looks normal

## Rollback Plan (If Needed)

### Quick Rollback
If critical issues found:
1. [ ] Remove DNS CNAME record
2. [ ] Remove Netlify domain alias
3. [ ] Revert code changes to App.tsx
4. [ ] Redeploy previous version
5. [ ] Notify users of temporary downtime

### Partial Rollback
If only portal has issues:
1. [ ] Keep DNS/Netlify as is
2. [ ] Update SimulationPortal to show maintenance message
3. [ ] Users can still access main app at haccare.app
4. [ ] Fix issues, redeploy

## Success Criteria

### Must Have (Go/No-Go)
- ✅ Portal loads without errors
- ✅ Authentication works
- ✅ RLS prevents unauthorized access
- ✅ Auto-routing works for students
- ✅ Instructor dashboard displays
- ✅ HTTPS certificate valid
- ✅ No data leaks between tenants

### Should Have
- ✅ Load time < 2 seconds
- ✅ Query time < 500ms
- ✅ Mobile responsive
- ✅ Works in all major browsers
- ✅ Analytics tracking enabled

### Nice to Have
- ⭐ Custom 404 page for simulation subdomain
- ⭐ Loading animations smooth
- ⭐ Keyboard navigation works
- ⭐ Accessible (WCAG AA compliant)

## Communication Plan

### Pre-Launch
- [ ] Notify instructors of new portal
- [ ] Send email with simulation.haccare.app URL
- [ ] Provide quick start guide
- [ ] Schedule training session (optional)

### Launch Day
- [ ] Announce portal is live
- [ ] Share user guide
- [ ] Be available for support
- [ ] Monitor for issues

### Post-Launch
- [ ] Collect user feedback
- [ ] Address any issues quickly
- [ ] Share success metrics
- [ ] Plan next iterations

## Documentation Updates

### Update Existing Docs
- [ ] Update main README with portal info
- [ ] Update user documentation
- [ ] Update instructor guide
- [ ] Update API documentation

### Create New Docs
- [x] Simulation Portal README
- [x] Implementation Summary
- [x] User Flow Diagrams
- [x] Deployment Guide
- [ ] User Training Materials
- [ ] Video Tutorial (optional)

## Training Materials Needed

### For Students
- [ ] "How to Access Your Simulation" guide
- [ ] Video: Logging in and selecting simulations
- [ ] FAQ: Common issues and solutions

### For Instructors
- [ ] "Managing Simulation Access" guide
- [ ] Video: Assigning students to simulations
- [ ] Video: Using the instructor dashboard

### For Admins
- [ ] Technical documentation
- [ ] Troubleshooting guide
- [ ] Database query examples

## Final Sign-Off

### Technical Lead
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Performance acceptable
- [ ] Security verified

### Product Owner
- [ ] Features meet requirements
- [ ] User experience approved
- [ ] Documentation complete

### DevOps/Infrastructure
- [ ] DNS configured correctly
- [ ] SSL certificate active
- [ ] Monitoring in place
- [ ] Rollback plan ready

### Security Team
- [ ] RLS policies reviewed
- [ ] No data leaks possible
- [ ] Authentication secure
- [ ] HTTPS enforced

---

## Deployment Decision

**Status:** [ ] APPROVED FOR DEPLOYMENT / [ ] NEEDS MORE WORK / [ ] DELAYED

**Approved By:** _________________

**Date:** _________________

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Next Steps After Approval:**
1. Execute database setup
2. Configure DNS
3. Update Netlify
4. Test thoroughly
5. Monitor closely
6. Collect feedback
7. Iterate and improve

**Estimated Deployment Time:** 2-4 hours (excluding DNS propagation)

**Support Contact:** Available 24/7 for first 48 hours post-launch
