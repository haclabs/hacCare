# System Logging for Super Admin Monitoring

## Overview

Comprehensive logging system that captures errors, user actions, navigation, and system events. Only accessible by super admin users.

## Features

- **Automatic Error Capture**: Catches React errors, unhandled promise rejections, and global errors
- **User Action Tracking**: Log specific user actions throughout the app
- **Navigation Logging**: Track where users go in the application
- **API Call Monitoring**: Log all API requests/responses
- **Rich Context**: Captures user info, tenant, browser details, URLs, and more
- **Real-time Monitoring**: Auto-refresh logs every 10 seconds
- **Search & Filter**: Filter by level, type, time range
- **Export**: Download logs as CSV
- **Maintenance**: Delete old logs to manage database size

## Setup

### 1. Run Database Migration

```bash
psql -h your-supabase-host -U postgres -d postgres -f database/migrations/create_system_logs.sql
```

Or in Supabase SQL Editor:
- Copy contents of `database/migrations/create_system_logs.sql`
- Paste and run in SQL Editor

### 2. Wrap App with Error Boundary

Update `src/main.tsx` or `src/App.tsx`:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import { systemLogger } from './services/monitoring/systemLogger';

function App() {
  return (
    <ErrorBoundary>
      {/* Your app content */}
    </ErrorBoundary>
  );
}
```

### 3. Add System Logs to Admin Menu

Update your admin navigation to include:

```tsx
import { SystemLogsViewer } from './features/admin/components/monitoring/SystemLogsViewer';

// In your admin routes:
{
  path: 'system-logs',
  element: <SystemLogsViewer />
}
```

## Usage

### Logging Errors

```tsx
import { systemLogger } from './services/monitoring/systemLogger';

try {
  await fetchPatientData(patientId);
} catch (error) {
  systemLogger.error('Failed to load patient', error, {
    component: 'PatientDetail',
    patientId
  });
}
```

### Logging User Actions

```tsx
systemLogger.action('medication_administered', {
  component: 'MARModule',
  medicationId: medication.id,
  patientId: patient.id,
  data: {
    medication: medication.name,
    dosage: medication.dosage
  }
});
```

### Logging Navigation

```tsx
// Automatic with React Router:
import { useLocation } from 'react-router-dom';

useEffect(() => {
  systemLogger.navigation(location.pathname);
}, [location]);
```

### Logging API Calls

```tsx
const endpoint = '/api/patients';
const method = 'POST';
const requestData = { name: 'John Doe' };

try {
  const response = await fetch(endpoint, {
    method,
    body: JSON.stringify(requestData)
  });
  const data = await response.json();
  
  systemLogger.apiCall(endpoint, method, requestData, data);
} catch (error) {
  systemLogger.apiCall(endpoint, method, requestData, null, error);
}
```

### Logging Authentication Events

```tsx
systemLogger.auth('login_success', {
  userId: user.id,
  tenantId: tenant.id
});

systemLogger.auth('tenant_switched', {
  fromTenant: oldTenant.id,
  toTenant: newTenant.id
});
```

### Logging Permission Denied

```tsx
systemLogger.permissionDenied('patient_record', 'edit', {
  patientId: patient.id,
  attemptedAction: 'update_diagnosis'
});
```

### Logging Validation Errors

```tsx
systemLogger.validationError('email', 'Invalid email format', {
  component: 'UserForm',
  value: email
});
```

### Logging Performance Metrics

```tsx
const startTime = performance.now();
await expensiveOperation();
const duration = performance.now() - startTime;

systemLogger.performance('expensive_operation', duration, {
  component: 'Dashboard',
  recordCount: records.length
});
```

## Automatic Logging

The system automatically captures:

1. **Unhandled Promise Rejections**
   ```tsx
   // Automatically logged:
   Promise.reject('Something went wrong');
   ```

2. **Global JavaScript Errors**
   ```tsx
   // Automatically logged:
   throw new Error('Unexpected error');
   ```

3. **React Component Errors**
   ```tsx
   // Caught by ErrorBoundary:
   const MyComponent = () => {
     throw new Error('Component error');
   };
   ```

## Viewing Logs (Super Admin Only)

1. Navigate to **Admin Dashboard** → **System Logs**
2. Use filters to narrow down logs:
   - **Level**: error, warn, security, info, debug
   - **Type**: error, action, navigation, api_call, auth, permission_denied
   - **Time Range**: 1h, 6h, 24h, 7d, 30d
3. Search by user, component, error message, URL
4. Click any log to see full details
5. Enable **Auto-Refresh** for real-time monitoring
6. Export logs as CSV for external analysis

## Log Maintenance

### Delete Old Logs

From System Logs viewer:
- Click "Delete logs older than 7 days"
- Or 30 days, 90 days

### Database Query (Manual)

```sql
-- Delete logs older than 30 days
DELETE FROM system_logs
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Check log count by level
SELECT log_level, COUNT(*) as count
FROM system_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY log_level
ORDER BY count DESC;

-- Find error-prone components
SELECT component, COUNT(*) as error_count
FROM system_logs
WHERE log_level = 'error'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY component
ORDER BY error_count DESC
LIMIT 10;
```

## Security

- **RLS Policies**: Only super_admin users can view logs
- **Anyone Can Insert**: Allows error logging from all users
- **Sensitive Data**: Avoid logging passwords, tokens, or PHI
- **Tenant Isolation**: Logs are tagged with tenant_id

## Best Practices

### DO:
- ✅ Log errors with full context
- ✅ Log important user actions (medication admin, patient updates)
- ✅ Include component names for easy debugging
- ✅ Log API failures with request/response data
- ✅ Use appropriate log levels

### DON'T:
- ❌ Log passwords or authentication tokens
- ❌ Log excessive debug info in production
- ❌ Log PHI (Protected Health Information) directly
- ❌ Log every single action (causes noise)

## Troubleshooting

### Logs Not Appearing

1. Check if table exists:
   ```sql
   SELECT * FROM system_logs LIMIT 1;
   ```

2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'system_logs';
   ```

3. Check user role:
   ```sql
   SELECT role FROM user_profiles WHERE id = auth.uid();
   ```

### Performance Issues

If logs table grows too large:

```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('system_logs'));

-- Create partition by date (advanced)
-- Consider implementing table partitioning for large deployments
```

## Integration Examples

### Simulation Portal Error Handling

```tsx
// In SimulationPortal.tsx
try {
  const assignments = await getSimulationAssignments();
  setSimulations(assignments);
} catch (error) {
  systemLogger.error('Failed to load simulation assignments', error, {
    component: 'SimulationPortal',
    action: 'load_assignments'
  });
  setError('Unable to load simulations');
}
```

### Patient Detail Error Handling

```tsx
// In PatientDetail.tsx
useEffect(() => {
  systemLogger.navigation(`/app/patient/${id}`);
  
  const loadPatient = async () => {
    try {
      const patient = await fetchPatient(id);
      setPatient(patient);
    } catch (error) {
      systemLogger.error('Failed to load patient', error, {
        component: 'PatientDetail',
        patientId: id
      });
    }
  };
  
  loadPatient();
}, [id]);
```

### Login Flow Tracking

```tsx
// In LoginForm.tsx
const handleLogin = async (credentials) => {
  try {
    const result = await signIn(credentials);
    
    systemLogger.auth('login_success', {
      userId: result.user.id,
      method: 'password'
    });
    
    window.location.href = '/app';
  } catch (error) {
    systemLogger.auth('login_failed', {
      email: credentials.email,
      error: error.message
    });
  }
};
```

## Support

For questions or issues:
1. Check logs in System Logs viewer
2. Search for error patterns
3. Export CSV and analyze in spreadsheet
4. Review component stack traces
5. Check browser console for additional context
