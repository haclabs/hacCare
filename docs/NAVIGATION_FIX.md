# Navigation Fix Documentation

## Problem
After implementing the landing page with the new routing structure (`/` for landing, `/login` for auth, `/app/*` for protected routes), sidebar navigation and various "back" buttons were redirecting users to the landing page instead of staying within the application.

## Root Cause
When navigating from nested routes (like `/app/patient/123`), using relative paths (like `simulation-portal`) would append to the current path, resulting in invalid routes like `/app/patient/123/simulation-portal`. Using absolute paths (like `/patients`) would navigate to root-level routes that don't exist, sending users back to the landing page.

## Solution
All internal navigation within the protected application must use absolute paths prefixed with `/app` to ensure consistent routing regardless of the current nested route depth.

## Files Modified

### 1. Sidebar.tsx
**Location**: `src/components/Layout/Sidebar.tsx`

**Change**: Updated navigation handler to prefix all routes with `/app`
```typescript
// Before:
const relativePath = item.route.startsWith('/') ? item.route.substring(1) : item.route;
navigate(relativePath);

// After:
const appRoute = item.route.startsWith('/') 
  ? `/app${item.route}` 
  : `/app/${item.route}`;
navigate(appRoute);
```

**Impact**: "Enter Sim" button now correctly navigates to `/app/simulation-portal` from any page.

### 2. PatientDetail.tsx
**Location**: `src/components/Patients/records/PatientDetail.tsx`

**Change**: Updated back button to navigate to `/app`
```typescript
// Before:
onClick={() => navigate('/')}

// After:
onClick={() => navigate('/app')}
```

**Impact**: Back arrow from patient detail page now returns to dashboard instead of landing page.

### 3. PatientDetail.legacy.tsx
**Location**: `src/components/Patients/records/legacy/PatientDetail.legacy.tsx`

**Change**: Same as PatientDetail.tsx
```typescript
onClick={() => navigate('/app')}
```

### 4. ModularPatientDashboard.tsx
**Location**: `src/components/ModularPatientDashboard.tsx`

**Change**: Updated error state "Back to Dashboard" button
```typescript
// Before:
onClick={() => navigate('/')}

// After:
onClick={() => navigate('/app')}
```

**Impact**: Error screens now return to dashboard instead of landing page.

### 5. SimulationIndicator.tsx
**Location**: `src/components/Simulation/SimulationIndicator.tsx`

**Change**: Updated exit simulation navigation
```typescript
// Before:
navigate('/dashboard');

// After:
navigate('/app');
```

**Impact**: Exiting simulation now returns to main dashboard.

### 6. AuthCallback.tsx
**Location**: `src/components/Auth/AuthCallback.tsx`

**Change**: Updated successful OAuth redirect
```typescript
// Before:
navigate('/');

// After:
navigate('/app');
```

**Impact**: Microsoft OAuth login now correctly redirects to the application instead of landing page.

### 7. App.tsx (from previous fix)
**Location**: `src/App.tsx`

**Changes**: Made all routes relative (removed leading slashes)
- `/auth/callback` → `auth/callback`
- `/simulation-portal` → `simulation-portal`
- `/patient/:id` → `patient/:id`
- All `navigate()` calls updated to use relative paths or `/app` prefix

## Navigation Patterns

### ✅ Correct Patterns

```typescript
// Within the app - navigate to specific section
navigate('/app');

// Within the app - navigate to specific route
navigate('/app/simulation-portal');
navigate('/app/patient/123');

// To public routes (login, landing)
navigate('/login');
navigate('/');

// OAuth redirect after login
navigate('/app');
```

### ❌ Incorrect Patterns

```typescript
// These will navigate to root level (landing page)
navigate('/');          // Wrong inside app
navigate('/patients');  // Wrong - no route at root level
navigate('/dashboard'); // Wrong - no route at root level

// These will append to current path
navigate('simulation-portal');  // Wrong if on nested route
navigate('patient/123');        // Wrong if on nested route
```

## Additional Fix: SimulationPortal Full-Screen Issue

### Problem
When navigating to "Enter Sim", the SimulationPortal component would render with `min-h-screen` which created a full-screen overlay that covered the sidebar, making navigation impossible.

### Solution
Changed all instances of `min-h-screen` to `min-h-full` in SimulationPortal.tsx so it renders within the main content area instead of taking over the entire viewport.

**Files Modified:**
- `src/components/Simulation/SimulationPortal.tsx`
  - Loading state: `min-h-screen` → `min-h-full`
  - Auto-routing state: `min-h-screen` → `min-h-full`
  - Main portal view: `min-h-screen` → `min-h-full`
  - Enter simulation redirect: `window.location.href = '/dashboard'` → `window.location.href = '/app'`

## Additional Fix: Navigation from SimulationPortal

### Problem
When on the `/app/simulation-portal` route and clicking sidebar items like "Patients" or "Schedule", the URL would stay at `simulation-portal` and nothing would happen.

### Root Cause
1. Sidebar items without explicit `route` properties only called `onTabChange()` without navigating
2. The Routes didn't have an explicit `index` route for `/app`, relying only on the catch-all `*` route

### Solution
1. **Sidebar.tsx**: Updated non-route items to navigate to `/app` after changing tab state
2. **App.tsx**: Added explicit `index` route for `/app` path

```typescript
// Sidebar.tsx - Now navigates to /app for tab changes
onTabChange(item.id);
navigate('/app', { replace: false });

// App.tsx - Added index route
<Route index element={renderContent()} />
```

**Files Modified:**
- `src/components/Layout/Sidebar.tsx` - Navigate to `/app` when clicking non-route items
- `src/App.tsx` - Added `index` route to explicitly handle `/app` path

## Testing Checklist

- [x] Sidebar "Enter Sim" works from dashboard
- [x] Sidebar "Enter Sim" works from patient detail page
- [x] Sidebar "Enter Sim" works from nested routes
- [x] Back button on patient detail returns to dashboard
- [x] Error screen "Back to Dashboard" returns to dashboard
- [x] Exit simulation returns to dashboard
- [x] Microsoft OAuth login redirects to app
- [x] All sidebar menu items navigate correctly
- [x] Sidebar visible and functional on SimulationPortal page
- [x] Can navigate away from SimulationPortal using sidebar
- [x] Entering simulation redirects to correct route

## Future Considerations

1. **Relative Navigation**: Consider using React Router's relative navigation with `..` for more maintainable code
2. **Route Constants**: Define route paths as constants to avoid hardcoding strings
3. **Breadcrumbs**: Implement breadcrumb navigation for better UX on nested routes
4. **Navigation Guard**: Consider a navigation helper function that always ensures correct `/app` prefix

## Related Files

- `src/main.tsx` - Root routing configuration
- `src/components/Auth/ProtectedRoute.tsx` - Route protection wrapper
- `src/App.tsx` - Main application routing

## Date
October 14, 2025
