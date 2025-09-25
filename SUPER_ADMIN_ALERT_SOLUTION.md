# Super Admin Alert Management Solution

## 🔍 Problem Identified
Super admin users (like Heather) were getting RLS (Row-Level Security) policy violations when trying to create alerts across tenants:

```
Error creating missing vitals alert: {
  code: '42501', 
  details: null, 
  hint: null, 
  message: 'new row violates row-level security policy for table "patient_alerts"'
}
```

## 🛠️ Root Cause
The `patient_alerts` table has RLS policies that prevent cross-tenant access, even for super admins. When Heather is switched to a specific tenant (like NSG25) but creates alerts for patients, the system tries to create alerts with the patient's tenant_id, but RLS policies block this because Heather's session context might be in a different tenant.

## ✅ Solution Implemented

### 1. **Super Admin RPC Functions** (`create_super_admin_alert_functions.sql`)
Created two SECURITY DEFINER functions that bypass RLS policies:

#### `create_alert_for_tenant()`
- **Purpose**: Allows super admins to create alerts across any tenant
- **Security**: Validates the calling user has "Super Admin" role before proceeding
- **Features**: 
  - Bypasses RLS policies using SECURITY DEFINER
  - Prevents duplicate alerts (same patient, type, message within 1 hour)
  - Returns structured JSON response with success/error status
  - Automatically sets default expiration (24 hours)

#### `acknowledge_alert_for_tenant()`  
- **Purpose**: Allows super admins to acknowledge alerts across any tenant
- **Security**: Validates the calling user has "Super Admin" role before proceeding
- **Features**: Bypasses RLS policies for alert acknowledgment

### 2. **Enhanced Alert Service** (`alertService.ts`)
Updated the `createAlert()` and `acknowledgeAlert()` functions with intelligent fallback:

#### Smart Creation Process:
1. **Try Standard Insert First**: Attempts normal database insert
2. **Detect RLS Violation**: If error code `42501` (RLS policy violation) occurs
3. **Fallback to Super Admin RPC**: Automatically calls `create_alert_for_tenant()`
4. **Seamless Experience**: User never sees the underlying complexity

#### Smart Acknowledgment Process:
1. **Try Standard Update First**: Attempts normal database update  
2. **Detect RLS Violation**: If error code `42501` occurs
3. **Fetch Alert Tenant**: Gets the alert's tenant_id for RPC call
4. **Fallback to Super Admin RPC**: Calls `acknowledge_alert_for_tenant()`

## 🔒 Security Features

### Role-Based Access Control
Both RPC functions verify the calling user has "Super Admin" role:
```sql
SELECT EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = calling_user_id
  AND r.name = 'Super Admin'
) INTO is_super_admin;
```

### Audit Trail
- Alert acknowledgments track `acknowledged_by` user ID
- All operations logged with timestamps
- RPC functions include comprehensive error handling

### Data Validation
- Required parameters validated before processing
- Duplicate prevention built-in
- Tenant existence verification

## 📋 Deployment Steps

### 1. Execute SQL Script
Run `create_super_admin_alert_functions.sql` in Supabase SQL Editor to create the RPC functions.

### 2. Updated Code
The `alertService.ts` file has been updated with the enhanced functions - no additional deployment needed.

### 3. Test the Solution
1. Login as Heather (super admin)
2. Switch to NSG25 tenant
3. Navigate to a patient that should trigger vitals alerts
4. Verify alerts are created without RLS errors

## ✨ Expected Results

### Before Fix:
```
❌ Error creating missing vitals alert: {code: '42501', message: 'new row violates row-level security policy for table "patient_alerts"'}
```

### After Fix:
```
🔐 RLS blocked standard insert, trying super admin RPC...
✅ Alert created via super admin RPC: [alert-id]
```

## 🧠 How It Works

1. **Transparent Operation**: Users experience no change in functionality
2. **Automatic Escalation**: System automatically uses super admin privileges when needed
3. **Security Maintained**: Only verified super admins can use cross-tenant functions
4. **Performance Optimized**: Standard operations still use fast direct database calls
5. **Fallback Pattern**: RPC functions only used when RLS blocks standard operations

## 📝 Usage Notes

- No changes needed to existing alert-creating code
- Functions work seamlessly across all tenants
- Super admin role verification ensures security
- Comprehensive logging for troubleshooting
- Compatible with existing alert management UI

This solution maintains security while enabling super admins to perform their cross-tenant administrative duties without RLS policy violations.