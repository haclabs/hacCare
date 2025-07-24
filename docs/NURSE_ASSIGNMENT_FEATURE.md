# Tenant-Based Nurse Assignment Feature

## Overview

The patient form now includes a dropdown for selecting assigned nurses that are filtered by the current tenant. This ensures that only nurses belonging to the current tenant can be assigned to patients within that tenant.

## How It Works

### 1. **useTenantNurses Hook**

Located at: `src/hooks/useTenantNurses.ts`

This custom hook:
- Fetches nurses assigned to the current tenant
- Filters users by role (`nurse`) and active status
- Returns formatted data for dropdown usage
- Handles loading states and errors
- Provides utility functions for finding nurses

```typescript
const { nurses, loading, error, hasNurses } = useTenantNurses();
```

### 2. **Updated Patient Form**

Located at: `src/components/Patients/forms/PatientForm.tsx`

The form now includes:
- **Dropdown selection** instead of text input for assigned nurse
- **Loading state** while fetching nurses
- **Error handling** for network issues
- **Backward compatibility** for existing patients with assigned nurses not in current tenant
- **Empty state messaging** when no nurses are available

## Features

### ✅ **Tenant Isolation**
- Only shows nurses assigned to the current tenant
- Uses `tenant_users` table for proper association
- Respects tenant boundaries for security

### ✅ **User Experience**
- Clean dropdown interface with nurse names and departments
- Loading indicators during data fetch
- Clear error messages and fallback states
- Backward compatibility with existing data

### ✅ **Data Integrity**
- Validates nurse selection is required
- Shows helpful error messages when no nurses available
- Handles edge cases gracefully

## Database Schema

The feature relies on these tables:

```sql
-- Users with roles
user_profiles (
  id, email, first_name, last_name, role, 
  department, license_number, is_active
)

-- Tenant-user associations
tenant_users (
  tenant_id, user_id, assigned_at
)

-- Patient records
patients (
  ..., assigned_nurse, ...
)
```

## Usage Example

```tsx
import { useTenantNurses } from '../hooks/useTenantNurses';

const MyComponent = () => {
  const { nurses, loading, error } = useTenantNurses();

  return (
    <select>
      <option value="">Select a nurse</option>
      {nurses.map(nurse => (
        <option key={nurse.id} value={nurse.name}>
          {nurse.name} - {nurse.department}
        </option>
      ))}
    </select>
  );
};
```

## API Reference

### `useTenantNurses()`

Returns an object with:

- `nurses: NurseOption[]` - Array of available nurses
- `loading: boolean` - Loading state
- `error: string | null` - Error message if any
- `hasNurses: boolean` - Whether any nurses are available
- `refreshNurses: () => void` - Function to reload nurses
- `findNurseById: (id: string) => NurseOption | undefined`
- `findNurseByName: (name: string) => NurseOption | undefined`

### `NurseOption` Interface

```typescript
interface NurseOption {
  id: string;
  name: string;           // "First Last"
  email: string;
  department?: string;
  license_number?: string;
}
```

## Security Considerations

- ✅ Uses Row Level Security (RLS) through Supabase
- ✅ Only fetches nurses for current tenant
- ✅ Validates user permissions through existing auth system
- ✅ No exposure of sensitive data beyond what user already has access to

## Migration Notes

### For Existing Data
- Existing patients with assigned nurses will still show their current assignment
- If the assigned nurse is not in the current tenant, it shows as "(Currently assigned)"
- Administrators can reassign to active nurses in the tenant

### For New Installations
- Ensure proper tenant-user relationships are established
- Verify nurse roles are correctly assigned in user profiles
- Test the dropdown functionality with your tenant configuration

## Troubleshooting

### No Nurses Showing
1. Verify users have `role = 'nurse'` in `user_profiles`
2. Check that nurses are assigned to the tenant in `tenant_users`
3. Ensure nurses have `is_active = true`

### Loading Issues
1. Check network connectivity
2. Verify Supabase configuration
3. Review console for API errors

### Permission Errors
1. Ensure RLS policies allow reading `tenant_users` and `user_profiles`
2. Verify current user has appropriate tenant access
3. Check authentication state

## Future Enhancements

Potential improvements:
- [ ] Search/filter functionality for large nurse lists
- [ ] Bulk nurse assignment for multiple patients
- [ ] Nurse workload indicators
- [ ] Department-based filtering
- [ ] Nurse availability status
