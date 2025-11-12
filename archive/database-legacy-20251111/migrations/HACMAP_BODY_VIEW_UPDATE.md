# hacMap Body View & Simulation Integration Update

## Overview
This update adds support for front/back body view tracking in hacMap and integrates hacMap data into the simulation system.

## Problem Solved
**Issue**: When placing a wound/device on the front view of a body part (e.g., left leg), it would show on BOTH front and back views with identical region names in tooltips, causing confusion.

**Root Cause**: Legs, thighs, and feet were marked as `view: 'both'` in the region definitions, but the database didn't track which view a marker was actually placed on.

## Database Changes

### 1. New Column: `avatar_locations.body_view`
```sql
ALTER TABLE avatar_locations
ADD COLUMN IF NOT EXISTS body_view TEXT;
```

- **Type**: `TEXT` (nullable)
- **Values**: `'front'`, `'back'`, or `NULL`
- **Purpose**: Track which body view (front/back) a marker was placed on
- **Behavior**: 
  - `NULL` = Legacy markers (will show on both views if region is marked as 'both')
  - `'front'` = Only shows when front view is active
  - `'back'` = Only shows when back view is active

### 2. New Column: `wounds.entered_by`
```sql
ALTER TABLE wounds 
ADD COLUMN IF NOT EXISTS entered_by TEXT;
```

- **Type**: `TEXT` (nullable)
- **Purpose**: Track which nurse/clinician documented the wound
- **Matches**: Similar to `devices.inserted_by` field

## Application Changes

### TypeScript Types Updated
- `AvatarLocation` - Added `body_view?: 'front' | 'back'`
- `Marker` - Added `bodyView?: 'front' | 'back'`
- `Coordinates` - Added `view?: 'front' | 'back'`
- `CreateAvatarLocationInput` - Added `body_view?: 'front' | 'back'`
- `Wound` - Added `entered_by?: string`
- `CreateWoundInput` - Added `entered_by?: string`
- `UpdateWoundInput` - Added `entered_by?: string`

### Frontend Components Updated
- **AvatarCanvas.tsx**: 
  - Passes current view when creating markers
  - Filters markers by `bodyView` to only show on correct view
  - Enhanced filter logic: checks `bodyView` first, falls back to region definition
  
- **AvatarBoard.tsx**: 
  - Passes `body_view` when creating avatar locations
  
- **WoundForm.tsx**: 
  - Added "Entered By (Nurse/Clinician Name)" input field
  - Saves `entered_by` with wound data

- **api.ts**:
  - Maps `body_view` from database when fetching markers
  - Includes `bodyView` in marker objects

## Simulation System Integration

### Functions Updated

#### 1. `create_simulation_snapshot()` (simulation_core_functions.sql)
**Before**: Referenced non-existent `hacmap_markers` table
**After**: Captures real hacMap data structure:
```jsonb
{
  "hacmap": {
    "locations": [...],  // avatar_locations with body_view
    "devices": [...],     // devices linked to locations
    "wounds": [...]       // wounds with entered_by field
  }
}
```

#### 2. `create_snapshot()` (reset_and_management_functions.sql)  
**Before**: Referenced non-existent `hacmap_markers` table
**After**: Captures hacMap data from template patients:
- Joins `sim_template_patients` → `patients` → hacMap tables
- Stores full location, device, and wound details in snapshot

#### 3. `duplicate_patient_to_tenant()`
**Before**: Tried to copy `hacmap_markers` table (didn't exist)
**After**: Properly copies all hacMap data:
1. Copies `avatar_locations` with `body_view` field
2. Creates ID mapping (old location ID → new location ID)
3. Copies `devices` with remapped `location_id`
4. Copies `wounds` with remapped `location_id` and `entered_by`

**New Parameter**: `p_include_hacmap BOOLEAN DEFAULT TRUE`

## Migration Files

### Primary Migration
**File**: `add_body_view_and_hacmap_to_simulations.sql`
- Adds `body_view` column to `avatar_locations`
- Adds `entered_by` column to `wounds`
- Updates both simulation snapshot functions
- Complete, ready-to-run SQL

### Duplication Function Fix
**File**: `duplicate_patient_hacmap_fix.sql`
- Replaces `hacmap_markers` reference with proper table structure
- Adds `p_include_hacmap` parameter
- Implements location ID remapping
- Updates result JSON structure

## Deployment Steps

### 1. Run Database Migration
```sql
-- Connect to your Supabase project and run:
\i database/migrations/add_body_view_and_hacmap_to_simulations.sql
```

### 2. Update Duplication Function
```sql
-- Run the duplication function update:
\i database/functions/duplicate_patient_hacmap_fix.sql
```

### 3. Deploy Frontend
```bash
# Frontend changes are already in the codebase
npm run build
# Deploy to your hosting platform
```

### 4. Verify Installation
```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'avatar_locations' 
AND column_name = 'body_view';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wounds' 
AND column_name = 'entered_by';

-- Test new marker placement
INSERT INTO avatar_locations (
  tenant_id, patient_id, region_key, 
  x_percent, y_percent, body_view, created_by
) VALUES (
  'your-tenant-id', 'test-patient-id', 'left-leg',
  45, 85, 'front', 'your-user-id'
);
```

## Backward Compatibility

### Legacy Markers (body_view = NULL)
- Existing markers without `body_view` will continue to work
- They will show on both front and back views (original behavior)
- Only new markers placed after migration will have view-specific placement

### Migration Path
To update existing markers:
1. Query markers on ambiguous regions (legs, thighs, feet)
2. Manually review placement
3. Update `body_view` field as needed
4. Or simply leave as NULL and re-place markers when needed

## Testing Checklist

- [ ] Place device on front left leg - verify shows only on front
- [ ] Place wound on back right thigh - verify shows only on back  
- [ ] Toggle between front/back views - verify markers filter correctly
- [ ] Hover over marker - verify tooltip shows correct region name
- [ ] Drag marker to new position - verify position updates
- [ ] Add wound with "Entered By" name - verify saves to database
- [ ] Create simulation snapshot - verify hacMap data included
- [ ] Launch simulation from snapshot - verify markers appear
- [ ] Reset simulation - verify markers restore correctly
- [ ] Duplicate patient - verify hacMap data copies with location remapping

## Rollback Plan

If issues arise:

```sql
-- Remove new columns (data will be lost)
ALTER TABLE avatar_locations DROP COLUMN IF EXISTS body_view;
ALTER TABLE wounds DROP COLUMN IF EXISTS entered_by;

-- Revert to previous function versions
-- (Keep backups of your original functions)
```

## Files Modified

### Database
- `database/migrations/add_body_view_and_hacmap_to_simulations.sql` (NEW)
- `database/functions/duplicate_patient_hacmap_fix.sql` (NEW)
- `database/migrations/add_entered_by_to_wounds.sql` (UPDATED - now includes both columns)

### Frontend
- `src/types/hacmap.ts`
- `src/features/hacmap/components/AvatarCanvas.tsx`
- `src/features/hacmap/AvatarBoard.tsx`
- `src/features/hacmap/api.ts`
- `src/features/hacmap/forms/WoundForm.tsx`

## Technical Notes

### Why TEXT Instead of ENUM for body_view?
- Flexibility for future values (e.g., '3d', 'internal')
- Consistent with `region_key` column design
- Avoids enum migration complexity
- Nullable for backward compatibility

### Location ID Remapping Strategy
When duplicating patients, location IDs must be remapped because:
1. UUIDs are unique - can't reuse source location IDs
2. Devices and wounds reference locations by ID
3. Using JSONB map for O(1) lookup during remapping
4. Loop through locations first, build map, then copy related records

### Snapshot Strategy
Simulation snapshots store complete JSONB state including:
- All location coordinates and body_view
- All device details linked to location IDs
- All wound assessments linked to location IDs
- Allows point-in-time restoration
- No complex joins needed during simulation runtime

## Support

For questions or issues:
1. Check migration logs for errors
2. Verify table columns exist with correct types
3. Test with single marker before bulk operations
4. Check browser console for frontend errors
5. Review Supabase logs for database function errors

## Version Compatibility

- **Minimum Supabase Version**: PostgreSQL 14+
- **Node Version**: 18+
- **TypeScript**: 5.0+
- **React**: 18+
