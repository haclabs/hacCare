# Local Testing Guide

**Purpose:** Comprehensive testing procedures for local development environment  
**Target Audience:** Developers testing features before staging/production deployment

---

## 🎯 Testing Philosophy

**Test locally first, deploy with confidence.**

Before pushing any code:
1. Test in isolation (unit)
2. Test with integration (feature)
3. Test full user flows (e2e)
4. Test edge cases
5. Test error states

---

## 🚀 Setting Up Test Environment

### Prerequisites
- Local Supabase running (`supabase status`)
- Latest production schema loaded
- Development server running (`npm run dev`)

### Quick Setup
```bash
# 1. Load latest production data
cd docs/operations/release
./dump-production.sh
./setup-local.sh

# 2. Start dev server
npm run dev

# 3. Open local apps
open http://localhost:5173        # App
open http://localhost:54323       # Supabase Studio
```

---

## 🧪 Testing Checklist

### Core Authentication Flows

#### Standard User Login
```
Test: Regular user login flow
1. Navigate to /login
2. Enter credentials (use test account)
3. Verify redirect to /app
4. Check user profile loads
5. Verify tenant context set correctly
6. Test logout
```
**Expected:** Smooth login → dashboard → logout cycle

#### Simulation-Only User Login
```
Test: simulation_only flag routing
1. Log in with simulation_only account (clsnurse@lethpolytech.ca)
2. Verify redirect to /app/simulation-portal (not /app)
3. Check simulation assignments load
4. Verify no errors in console
5. Test logout works
```
**Expected:** Direct routing to portal, assignments visible immediately

#### Session Persistence
```
Test: Session survives page refresh
1. Log in
2. Refresh page (F5)
3. Verify still logged in
4. Check no re-authentication required
```
**Expected:** User remains authenticated

---

### Simulation Features

#### Simulation Portal Loading
```
Test: Portal displays assigned simulations
1. Log in as simulation_only user
2. Verify portal loads within 3 seconds
3. Check active simulations display
4. Verify no RPC timeout errors
5. Test Quick Intro button opens modal
```
**Expected:** Fast load, no errors, assignments visible

#### Auto-Kick Timer
```
Test: Timer counts down and kicks user
1. Launch simulation as instructor
2. Set simulation duration to 5 minutes
3. Assign student user
4. Log in as student
5. Enter simulation
6. Verify timer appears in sidebar
7. Wait for timer to expire
8. Verify grace period (15 min) starts
9. Wait for grace period to end
10. Verify redirect to simulation portal
```
**Expected:** Timer → Grace period → Auto-kick to portal

#### Exit Simulation Button
```
Test: Manual exit redirects correctly
1. Enter simulation
2. Click "Exit Simulation" in sidebar
3. Confirm dialog
4. Verify redirect to /app/simulation-portal (not /app)
```
**Expected:** Clean exit to portal

#### Background Refresh
```
Test: Portal refreshes silently
1. Open simulation portal
2. Open browser console
3. Wait 15 seconds (auto-refresh interval)
4. Verify no error messages in console
5. Check "⚠️ Background refresh failed silently" appears (if timeout)
```
**Expected:** No user-visible errors

---

### User Management

#### Create User
```
Test: Admin creates new user
1. Log in as admin
2. Navigate to user management
3. Click "Add User"
4. Fill in required fields
5. Check "simulation_only" if testing simulation user
6. Submit form
7. Verify user appears in list
8. Log in with new user credentials
```
**Expected:** User created and can log in

#### Deactivate User
```
Test: Deactivate user account
1. Select active user
2. Click "Deactivate"
3. Confirm action
4. Verify user marked as inactive
5. Try to log in with deactivated user
6. Verify login fails
```
**Expected:** User cannot log in after deactivation

---

### Multi-Tenant Features

#### Tenant Switching
```
Test: User switches between tenants
1. Log in as user with multiple tenants
2. Navigate to tenant selector
3. Switch to different tenant
4. Verify tenant context changes
5. Check patient list updates
6. Verify no data from previous tenant visible
```
**Expected:** Clean tenant isolation

#### Simulation Tenant Isolation
```
Test: Simulation data is isolated
1. Create simulation
2. Add patient to simulation
3. Exit simulation
4. Verify patient not visible in home tenant
5. Re-enter simulation
6. Verify patient is visible
```
**Expected:** Complete data isolation between tenants

---

## 🐛 Error State Testing

### Network Failures

#### Offline Handling
```
Test: App handles offline gracefully
1. Open app while online
2. Open browser dev tools → Network
3. Set throttling to "Offline"
4. Try to perform actions
5. Verify friendly error messages
6. Go back online
7. Verify app recovers
```
**Expected:** Clear error messages, auto-recovery

#### Timeout Handling
```
Test: RPC timeout behavior
1. Open portal (triggers RPC call)
2. If times out (rare), verify:
   - User sees "slow connection" message
   - Retry button appears
   - No console spam
```
**Expected:** Graceful degradation

---

### Data Validation

#### Invalid Inputs
```
Test: Form validation works
1. Open any form (user creation, etc.)
2. Try to submit empty form
3. Verify validation messages appear
4. Enter invalid email format
5. Verify email validation works
6. Enter mismatched passwords
7. Verify password validation works
```
**Expected:** All validation rules enforced

#### Permission Violations
```
Test: Unauthorized access blocked
1. Log in as standard user
2. Try to access admin-only URLs directly
3. Verify redirect or 403 error
4. Check no sensitive data leaked
```
**Expected:** Access denied gracefully

---

## 📊 Performance Testing

### Load Times
```
Test: Pages load quickly
1. Open app in Incognito (fresh state)
2. Measure load times:
   - Login page: < 1s
   - Dashboard: < 2s
   - Simulation portal: < 3s
   - Patient detail: < 2s
3. Check Network tab for slow requests
4. Verify no requests > 5s
```
**Expected:** Fast, responsive UI

### Memory Leaks
```
Test: No memory leaks on long sessions
1. Open app
2. Navigate between pages repeatedly
3. Monitor memory in Chrome Task Manager
4. Verify memory stabilizes (doesn't grow infinitely)
```
**Expected:** Stable memory usage

---

## 🔍 Database Testing

### RPC Functions
```
Test: All functions work correctly
1. Open Supabase Studio: http://localhost:54323
2. Go to SQL Editor
3. Test each function:

-- Test get_user_simulation_assignments
SELECT get_user_simulation_assignments('user-uuid-here');

-- Test deactivate_user
SELECT deactivate_user('user-uuid-here');

-- Test find_user_by_email
SELECT find_user_by_email('test@example.com');

4. Verify results match expectations
5. Check for errors
```
**Expected:** All functions return valid data

### Data Integrity
```
Test: Foreign key constraints work
1. Try to create orphaned record (invalid FK)
2. Verify database rejects it
3. Delete parent record
4. Verify cascade deletes children (if configured)
```
**Expected:** Referential integrity maintained

---

## 🎨 UI/UX Testing

### Responsive Design
```
Test: Works on different screen sizes
1. Open app
2. Open Chrome DevTools (F12)
3. Toggle device toolbar (Ctrl+Shift+M)
4. Test on:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
5. Verify no layout breaks
6. Check all buttons accessible
```
**Expected:** Responsive at all sizes

### Accessibility
```
Test: Keyboard navigation works
1. Open app
2. Try to navigate using only Tab key
3. Verify focus indicators visible
4. Test Enter key on buttons
5. Test Escape key closes modals
```
**Expected:** Fully keyboard accessible

---

## 📝 Test Data Setup

### Creating Test Users

```sql
-- Run in Supabase SQL Editor

-- Standard user
INSERT INTO user_profiles (id, email, first_name, last_name, role, simulation_only)
VALUES (
  gen_random_uuid(),
  'test.user@example.com',
  'Test',
  'User',
  'user',
  false
);

-- Simulation-only user
INSERT INTO user_profiles (id, email, first_name, last_name, role, simulation_only)
VALUES (
  gen_random_uuid(),
  'test.sim@example.com',
  'Test',
  'Simulation',
  'user',
  true
);

-- Admin user
INSERT INTO user_profiles (id, email, first_name, last_name, role, simulation_only)
VALUES (
  gen_random_uuid(),
  'test.admin@example.com',
  'Test',
  'Admin',
  'admin',
  false
);
```

### Creating Test Simulation
```sql
-- Create active simulation
INSERT INTO simulation_active (id, name, template_id, tenant_id, status, starts_at, ends_at)
VALUES (
  gen_random_uuid(),
  'Test Simulation',
  (SELECT id FROM simulation_templates LIMIT 1),
  (SELECT id FROM tenants LIMIT 1),
  'running',
  NOW(),
  NOW() + INTERVAL '1 hour'
);

-- Assign user to simulation
INSERT INTO simulation_participants (simulation_id, user_id, role)
VALUES (
  (SELECT id FROM simulation_active WHERE name = 'Test Simulation'),
  (SELECT id FROM user_profiles WHERE email = 'test.sim@example.com'),
  'student'
);
```

---

## ✅ Sign-Off

Before marking a feature as "ready for staging":

- [ ] All core flows tested
- [ ] All error states tested
- [ ] Performance acceptable
- [ ] No console errors
- [ ] No memory leaks
- [ ] Responsive design verified
- [ ] Database functions tested
- [ ] Test data cleaned up

**Tested By:** _______________  
**Date:** _______________  
**Feature:** _______________  
**Status:** ☐ Pass ☐ Fail  

**Notes:**
_________________________________________________
_________________________________________________
