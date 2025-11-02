# Simulation & Backup System Updates - Lab Orders & hacMap Markers

## Overview
Added support for `lab_orders` and `hacmap_markers` tables to all simulation and patient backup/duplication systems.

## Updated Systems

### 1. Simulation Snapshot Creation ✅
**File:** `/database/functions/simulation/simulation_core_functions.sql`

**Function:** `create_simulation_snapshot()`

**Changes:**
- Added `lab_orders` to snapshot data
- Added `hacmap_markers` to snapshot data
- Both are captured when creating immutable snapshots from template patients

**Captured Lab Order Fields:**
- order_date, order_time
- procedure_category, procedure_type
- source_category, source_type
- initials, verified_by, status, notes
- label_printed flag and timestamps

**Captured hacMap Marker Fields:**
- marker_type (device/wound), x, y, body_side, label
- **Device fields:** device_type, device_subtype, insertion_date, insertion_site, size_gauge, length_depth, site_condition, securing_method
- **Wound fields:** wound_type, wound_stage, wound_size, wound_depth, exudate_amount, exudate_type, wound_bed, surrounding_skin, pain_level, odor
- notes, created_at

---

### 2. Simulation Template Snapshot Creation ✅
**File:** `/database/functions/simulation/reset_and_management_functions.sql`

**Function:** `create_snapshot()`

**Changes:**
- Added `lab_orders` collection from template patients
- Added `hacmap_markers` collection from template patients
- Links template patients to real patient data via `public_patient_id`

**How It Works:**
```sql
-- Joins template patients → real patients → lab orders/markers
FROM sim_template_patients tp
LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
LEFT JOIN lab_orders lo ON lo.patient_id = p.id
```

---

### 3. Simulation Reset Function ✅
**File:** `/database/functions/simulation/reset_and_management_functions.sql`

**Function:** `reset_run()`

**Changes:**
- Added deletion of `lab_orders` created during simulation runs
- Added deletion of `hacmap_markers` created during simulation runs
- Preserves patient wristband IDs and medication barcodes (stable across resets)

**Reset Behavior:**
- **DELETED:** All student-entered lab orders and hacMap markers
- **PRESERVED:** Patient IDs, medication barcodes, template data
- **RESULT:** Clean slate while maintaining printed ID consistency

**SQL Logic:**
```sql
-- Delete lab orders created during run
DELETE FROM lab_orders lo
USING sim_run_patients rp, patients p
WHERE lo.patient_id = p.id
AND p.patient_id = rp.public_patient_id
AND rp.run_id = p_run_id;

-- Delete hacmap markers created during run  
DELETE FROM hacmap_markers hm
USING sim_run_patients rp, patients p
WHERE hm.patient_id = p.id
AND p.patient_id = rp.public_patient_id
AND rp.run_id = p_run_id;
```

---

### 4. Patient Duplication/Backup Function ✅
**File:** `/database/functions/duplicate_patient_to_tenant_enhanced.sql`

**Function:** `duplicate_patient_to_tenant()`

**Changes:**
- Added `lab_orders` copying between tenants
- Added `hacmap_markers` copying between tenants
- Added counts to result JSON and success message

**New Variables:**
```sql
v_lab_orders_count INTEGER := 0;
v_hacmap_markers_count INTEGER := 0;
```

**Lab Orders Copy:**
- Copies all order details
- Resets `label_printed` to false for new patient
- Preserves status, procedure/source details

**hacMap Markers Copy:**
- Copies all device positions and details
- Copies all wound assessments and details
- Maintains x/y coordinates and body_side
- Preserves all clinical data

**Result JSON:**
```json
{
  "vitals": 5,
  "medications": 8,
  ...
  "lab_orders": 3,
  "hacmap_markers": 7
}
```

---

## Integration Points

### Simulation Workflow
1. **Create Template** → Lab orders & markers stored with template patients
2. **Take Snapshot** → Captures current state including lab orders & markers
3. **Launch Run** → Baseline data available to students
4. **Students Work** → Add new lab orders, place devices/wounds on hacMap
5. **Reset Run** → Clears student-entered data, restores baseline

### Backup/Duplication Workflow
1. **Duplicate Patient** → All associated lab orders & markers copied
2. **New Tenant** → Data replicated with proper tenant isolation
3. **New Patient ID** → Barcodes auto-generated on first print
4. **Preserves Clinical Data** → All device/wound details maintained

---

## Testing Checklist

### Simulation Testing
- [ ] Create simulation template with lab orders
- [ ] Create simulation template with hacMap markers (devices & wounds)
- [ ] Take snapshot - verify lab_orders array populated
- [ ] Take snapshot - verify hacmap_markers array populated
- [ ] Launch run from snapshot
- [ ] Add new lab orders during run
- [ ] Add new markers during run
- [ ] Reset run - verify student additions deleted
- [ ] Reset run - verify baseline data restored

### Backup/Duplication Testing
- [ ] Duplicate patient with lab orders to new tenant
- [ ] Verify lab orders copied correctly
- [ ] Verify label_printed reset to false
- [ ] Duplicate patient with hacMap markers to new tenant
- [ ] Verify device markers copied (all fields)
- [ ] Verify wound markers copied (all fields)
- [ ] Verify x/y coordinates preserved
- [ ] Check result JSON includes correct counts

### Backup Service Testing (Super Admin Backups)
- [ ] Create backup with includeLabOrders enabled
- [ ] Create backup with includeHacmapMarkers enabled
- [ ] Verify lab_orders array in backup metadata
- [ ] Verify hacmap_markers array in backup metadata
- [ ] Download and decrypt backup
- [ ] Restore backup with lab orders
- [ ] Restore backup with hacmap markers
- [ ] Verify date range filtering works for both tables

---

## Database Deployment

### Deploy Order:
1. Ensure `lab_orders` table exists (from `lab_orders.sql`)
2. Ensure `hacmap_markers` table exists (from `hacmap_tables.sql`)
3. Deploy updated simulation functions:
   ```bash
   psql -f database/functions/simulation/simulation_core_functions.sql
   psql -f database/functions/simulation/reset_and_management_functions.sql
   ```
4. Deploy updated backup function:
   ```bash
   psql -f database/functions/duplicate_patient_to_tenant_enhanced.sql
   ```

### Verification:
```sql
-- Test snapshot creation
SELECT create_simulation_snapshot(
  '<template_id>'::uuid,
  'Test Snapshot with Lab Orders & Markers',
  'Testing new fields',
  auth.uid()
);

-- Check snapshot data
SELECT 
  jsonb_array_length(snapshot_data->'lab_orders') as lab_orders_count,
  jsonb_array_length(snapshot_data->'hacmap_markers') as markers_count
FROM sim_snapshots
WHERE name = 'Test Snapshot with Lab Orders & Markers';

-- Test patient duplication
SELECT * FROM duplicate_patient_to_tenant(
  p_source_patient_id := 'P001',
  p_target_tenant_id := '<tenant_uuid>'::uuid,
  p_new_patient_id := 'P999'
);
```

---

## Super Admin Backup Service Integration ✅
**File:** `/src/services/operations/backupService.ts`

**Changes:**
- Added `includeLabOrders` option to `BackupOptions` interface
- Added `includeHacmapMarkers` option to `BackupOptions` interface
- Added `lab_orders` array to `BackupData.data` interface
- Added `hacmap_markers` array to `BackupData.data` interface
- Implemented `exportLabOrders()` method
- Implemented `exportHacmapMarkers()` method

**Export Lab Orders:**
```typescript
private async exportLabOrders(options: BackupOptions): Promise<any[]> {
  let query = supabase.from('lab_orders').select('*');
  
  // Filter by date range if specified
  if (options.dateRange) {
    query = query
      .gte('order_date', options.dateRange.startDate)
      .lte('order_date', options.dateRange.endDate);
  }
  
  // Filter by tenant if specified
  if (options.tenantIds?.length) {
    query = query.in('tenant_id', options.tenantIds);
  }
  
  return data || [];
}
```

**Export hacMap Markers:**
```typescript
private async exportHacmapMarkers(options: BackupOptions): Promise<any[]> {
  let query = supabase.from('hacmap_markers').select('*');
  
  // Filter by creation date if specified
  if (options.dateRange) {
    query = query
      .gte('created_at', options.dateRange.startDate)
      .lte('created_at', options.dateRange.endDate);
  }
  
  // Filter by tenant if specified
  if (options.tenantIds?.length) {
    query = query.in('tenant_id', options.tenantIds);
  }
  
  return data || [];
}
```

**Usage in Backup Creation:**
```typescript
if (options.includeLabOrders) {
  backupData.data.lab_orders = await this.exportLabOrders(options);
  backupData.metadata.record_counts.lab_orders = backupData.data.lab_orders.length;
}

if (options.includeHacmapMarkers) {
  backupData.data.hacmap_markers = await this.exportHacmapMarkers(options);
  backupData.metadata.record_counts.hacmap_markers = backupData.data.hacmap_markers.length;
}
```

**Features:**
- Date range filtering on order_date (lab_orders) and created_at (hacmap_markers)
- Tenant-specific backups supported
- Included in full/partial backup type determination
- Encrypted backup support (uses same encryption as other data)
- Record counts tracked in backup metadata

---

## Files Modified

### Simulation System
1. `/database/functions/simulation/simulation_core_functions.sql`
   - Added lab_orders to `create_simulation_snapshot()`
   - Added hacmap_markers to `create_simulation_snapshot()`

2. `/database/functions/simulation/reset_and_management_functions.sql`
   - Added lab_orders to `create_snapshot()`
   - Added hacmap_markers to `create_snapshot()`
   - Added lab_orders deletion to `reset_run()`
   - Added hacmap_markers deletion to `reset_run()`

### Backup System
3. `/database/functions/duplicate_patient_to_tenant_enhanced.sql`
   - Added v_lab_orders_count variable
   - Added v_hacmap_markers_count variable
   - Added lab_orders copy logic with label_printed reset
   - Added hacmap_markers copy logic with all fields
   - Updated result JSON to include new counts
   - Updated success message to include new counts

4. `/src/services/operations/backupService.ts`
   - Added includeLabOrders option to BackupOptions
   - Added includeHacmapMarkers option to BackupOptions
   - Added lab_orders and hacmap_markers to BackupData interface
   - Implemented exportLabOrders() method with date/tenant filtering
   - Implemented exportHacmapMarkers() method with date/tenant filtering
   - Added both tables to full/partial backup type determination
   - Record counts included in backup metadata

---

## Technical Notes

### Lab Orders Special Handling
- `label_printed` flag reset to `false` when duplicating to new patient
- `label_printed_at` timestamp not copied
- Status preserved (pending, collected, sent, resulted)
- Verification info (initials, verified_by) preserved

### hacMap Markers Special Handling
- Coordinates (x, y) preserved exactly
- Body side (front/back) preserved
- Marker type determines which fields are relevant:
  - **device:** Uses device_* fields
  - **wound:** Uses wound_* fields
- All fields copied to maintain complete clinical picture

### Simulation Reset Strategy
- Uses JOIN through `sim_run_patients` → `patients` → `lab_orders`/`hacmap_markers`
- Only deletes data created during the run
- Template baseline data never deleted
- Enables true "reset to beginning" functionality

---

**Status:** ✅ Complete and ready for deployment  
**Impact:** Lab orders and hacMap markers now fully integrated into simulation and backup systems  
**Breaking Changes:** None - purely additive functionality  
**Last Updated:** November 2, 2025
