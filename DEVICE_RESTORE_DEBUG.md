# Device Restore Debugging - Deployment Instructions

## Issue
Devices are not copying from template snapshot to active simulation, even though:
- ✅ Devices exist in template (2 devices confirmed)
- ✅ Devices exist in snapshot JSON
- ✅ Wounds copy successfully (same parent relationship via location_id)
- ✅ Avatar_locations copy successfully
- ✅ Patient duplication workflow works correctly for devices

## Root Cause Investigation
The snapshot contains devices, so the issue must be in the `restore_snapshot_to_tenant` function. Possible causes:
1. Silent error during device INSERT (caught by exception handler)
2. Foreign key mapping failure (location_id not found in v_id_mapping)
3. Data type mismatch (arrays like orientation, securement_method)
4. Missing column in devices table schema

## Changes Made
Enhanced `database/fix_restore_snapshot_SCHEMA_AGNOSTIC.sql` with comprehensive logging:

1. **Record Count Logging**: Shows how many records being processed per table
2. **Device-Specific Debug**: Logs each device being processed with type and location_id
3. **Foreign Key Mapping Tracking**: Shows old→new location_id mappings for devices
4. **Missing Mapping Warnings**: Alerts if a device's location_id is not found in the ID mapping
5. **Enhanced Error Messages**: Includes full SQL and record data when INSERT fails

## Deployment Steps

1. **Deploy Updated Function**:
   ```sql
   -- Run this file in Supabase SQL Editor
   \i /workspaces/hacCare/database/fix_restore_snapshot_SCHEMA_AGNOSTIC.sql
   ```

2. **Launch a Test Simulation**:
   - Go to template "CLS Testing"
   - Click "Launch Simulation"
   - Switch to active simulation tenant
   - Check if devices appear in hacMap

3. **Check Logs for Errors**:
   ```sql
   -- In Supabase, view function execution logs
   -- Look for messages starting with:
   -- 🔧 Processing device: ...
   -- 🗺️  Mapped device.location_id: ...
   -- ⚠️  Device location_id NOT FOUND in mapping!
   -- ⚠️  Failed to insert into devices: ...
   ```

4. **Verify Results**:
   ```sql
   -- Check if devices were created in active simulation
   SELECT 
     d.id,
     d.type,
     d.location_id,
     al.region_key,
     al.body_view
   FROM devices d
   LEFT JOIN avatar_locations al ON d.location_id = al.id
   WHERE d.tenant_id = '<ACTIVE_SIMULATION_TENANT_ID>'
   ORDER BY d.created_at;
   ```

## Expected Log Output

### Success Case:
```
📦 Restoring avatar_locations (5 records)...
✅ Restored 5 records to avatar_locations
📦 Restoring devices (2 records)...
🔧 Processing device: type=iv-peripheral, location_id=0adcb61d-8c58-4686-9851-20b66aa57d1b
🗺️  Mapped device.location_id: 0adcb61d-... → <new-uuid>
🔧 Processing device: type=iv-peripheral, location_id=2dcc4b77-cb8c-4882-81dd-46a5c7c3a99b
🗺️  Mapped device.location_id: 2dcc4b77-... → <new-uuid>
✅ Restored 2 records to devices
```

### Failure Case (Missing Mapping):
```
📦 Restoring devices (2 records)...
🔧 Processing device: type=iv-peripheral, location_id=0adcb61d-8c58-4686-9851-20b66aa57d1b
⚠️  Device location_id 0adcb61d-... NOT FOUND in mapping!
```

### Failure Case (SQL Error):
```
📦 Restoring devices (2 records)...
🔧 Processing device: type=iv-peripheral, location_id=0adcb61d-...
⚠️  Failed to insert into devices: <error message> | SQL: INSERT INTO devices (...)
⚠️  Record data: {"id": "...", "type": "iv-peripheral", ...}
```

## Diagnostic Queries

Use these queries to gather debugging information:

```sql
-- 1. Check snapshot contains devices
SELECT 
  name,
  snapshot_data ? 'devices' as has_devices,
  jsonb_array_length(snapshot_data->'devices') as count
FROM simulation_templates
WHERE name = 'CLS Testing';

-- 2. Check devices table schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'devices'
ORDER BY ordinal_position;

-- 3. Check template has devices
SELECT COUNT(*) as device_count
FROM devices
WHERE tenant_id = '0e2e0717-d44e-444f-ac24-85b83379fbf2';

-- 4. After launch, check active simulation has devices
SELECT COUNT(*) as device_count
FROM devices
WHERE tenant_id = '<ACTIVE_SIM_TENANT_ID>';

-- 5. Compare avatar_locations vs devices restoration
SELECT 
  'avatar_locations' as table_name,
  COUNT(*) as count
FROM avatar_locations
WHERE tenant_id = '<ACTIVE_SIM_TENANT_ID>'
UNION ALL
SELECT 
  'devices' as table_name,
  COUNT(*) as count
FROM devices
WHERE tenant_id = '<ACTIVE_SIM_TENANT_ID>'
UNION ALL
SELECT 
  'wounds' as table_name,
  COUNT(*) as count
FROM wounds
WHERE tenant_id = '<ACTIVE_SIM_TENANT_ID>';
```

## Next Steps Based on Findings

### If logs show "location_id NOT FOUND":
- Problem: avatar_locations not processed before devices
- Solution: Verify dependency ordering in restore function (should be correct)

### If logs show SQL INSERT error:
- Problem: Column mismatch or data type issue
- Solution: Compare snapshot device columns vs actual devices table schema

### If logs show devices processed but COUNT = 0:
- Problem: Devices inserted but filtered out by RLS
- Solution: Check RLS policies on devices table

### If no device logs appear at all:
- Problem: Devices not in snapshot or wrong table name
- Solution: Verify snapshot_data->'devices' contains records

## Snapshot Data Confirmed
Template "CLS Testing" snapshot contains:
- ✅ 5 avatar_locations
- ✅ 2 devices (iv-peripheral type)
- Location IDs in devices: 0adcb61d-..., 2dcc4b77-...
- Both location IDs exist in avatar_locations snapshot
