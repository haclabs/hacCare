# Admin Dashboard Setup Guide

The Admin Dashboard provides comprehensive system monitoring and user activity tracking for administrators and super administrators.

## Features

- **Active Session Monitoring**: View all currently logged-in users with their IP addresses
- **Activity Logging**: Track user actions over the past 24 hours
- **Real-time Updates**: Auto-refreshes every 30 seconds
- **Tenant-aware**: Shows tenant context for multi-tenant deployments
- **Role-based Access**: Only accessible to users with admin or super_admin roles

## Database Setup

### 1. Run the Admin Schema Migration

Execute the following SQL script in your Supabase database:

```bash
# Apply the admin dashboard schema
psql -h your-db-host -U postgres -d your-database -f sql/admin_dashboard_schema.sql
```

Or run the SQL directly in Supabase SQL editor:
- Copy contents of `sql/admin_dashboard_schema.sql`
- Execute in Supabase → SQL Editor

### 2. Verify Tables Created

The migration creates these tables:
- `user_sessions` - Tracks active user sessions with IP addresses
- `audit_logs` - Comprehensive audit trail of user activities

### 3. Functions Available

- `log_user_activity()` - Log any user action
- `create_user_session()` - Create/update user session with IP tracking
- `end_user_session()` - Properly end user session
- `cleanup_old_sessions()` - Remove sessions older than 30 days
- `cleanup_old_audit_logs()` - Remove logs older than 90 days

## Access the Admin Dashboard

### 1. User Requirements
- Must have `admin` or `super_admin` role in `user_profiles` table
- User must be active (`is_active = true`)

### 2. Navigation
- Log in with admin credentials
- Click "Admin" in the left sidebar
- Dashboard loads with current session and activity data

## Usage Examples

### Monitoring Active Sessions
- View all currently logged-in users
- See IP addresses for security monitoring
- Track last activity times
- Identify idle or suspicious sessions

### Activity Logging
- Review user actions over past 24 hours
- Filter by action type (LOGIN, VIEW_PATIENTS, etc.)
- Track resource access patterns
- Audit tenant switching for super admins

### System Statistics
- Active session count
- Recent activity volume
- System status monitoring

## Development Integration

### Automatic Activity Logging

The system automatically logs these activities:
- User logins/logouts
- Page navigation
- Alert acknowledgments
- Patient data access
- Administrative actions

### Custom Activity Logging

Add custom logging in your components:

```typescript
import { logUserActivity } from '../lib/adminService';

// Log a custom activity
await logUserActivity('CUSTOM_ACTION', 'Resource Name', resourceId, {
  additional: 'details'
});
```

### Session Tracking

Initialize session tracking on user login:

```typescript
import { initializeSessionTracking } from '../lib/adminService';

// On successful login
await initializeSessionTracking(user.tenantId);
```

## Security Considerations

### Row Level Security (RLS)
- Sessions and logs are automatically filtered by RLS policies
- Super admins see all tenant data
- Regular admins only see their tenant's data
- Regular users see only their own sessions/logs

### IP Address Tracking
- Currently uses placeholder IP addresses
- For production, implement server-side IP detection
- Consider proxy/CDN handling for accurate IPs

### Data Retention
- Sessions: Automatically cleaned after 30 days
- Audit logs: Automatically cleaned after 90 days
- Configurable retention periods in cleanup functions

## Troubleshooting

### Admin Access Denied
1. Check user role in `user_profiles` table
2. Verify `is_active = true`
3. Ensure RLS policies are applied correctly

### No Sessions/Logs Showing
1. Verify tables exist: `user_sessions`, `audit_logs`
2. Check RLS policies with `SELECT * FROM pg_policies;`
3. Ensure functions are created and accessible

### Real-time Updates Not Working
1. Check console for API errors
2. Verify 30-second refresh interval
3. Ensure database connectivity

## Production Deployment

### 1. Environment Variables
Ensure these are set in production:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

### 2. Database Permissions
Verify these permissions are granted:
```sql
GRANT SELECT, INSERT, UPDATE ON user_sessions TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
```

### 3. Monitoring Setup
- Set up alerts for failed session creation
- Monitor audit log volume
- Implement log rotation for large deployments

### 4. Performance Optimization
- Consider partitioning audit_logs by date for large volumes
- Add indexes for common query patterns
- Implement caching for frequently accessed data

## API Reference

### Admin Service Functions

#### `getActiveSessions(): Promise<UserSession[]>`
Retrieves all active user sessions with user and tenant information.

#### `getRecentAuditLogs(hours: number): Promise<AuditLog[]>`
Gets audit logs for the specified number of past hours (default: 24).

#### `logUserActivity(action: string, resource: string, resourceId?: string, details?: any): Promise<string>`
Logs a user activity with automatic session and tenant context.

#### `createUserSession(ipAddress: string, userAgent?: string, tenantId?: string): Promise<string>`
Creates or updates a user session with IP address tracking.

#### `endUserSession(): Promise<boolean>`
Ends the current user session and logs logout activity.

#### `getSystemStats(): Promise<SystemStats>`
Returns system statistics including session counts and system status.

## Next Steps

1. **IP Address Enhancement**: Implement server-side IP detection
2. **Advanced Filtering**: Add date range and user filtering options
3. **Export Functionality**: Add CSV/PDF export for audit reports
4. **Alert Integration**: Set up notifications for suspicious activities
5. **Performance Metrics**: Add response time and system performance monitoring