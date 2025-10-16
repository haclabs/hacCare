# Simulation Metrics Tracking Fix

## Problem Found

The simulation debrief report was not displaying all metrics correctly because the database function `calculate_simulation_metrics()` was tracking different fields than what the UI expected.

## Field Mismatches

### ❌ What Was Being Tracked (OLD)
```sql
{
  "medications_administered": 5,
  "vitals_recorded": 12,
  "notes_created": 8,
  "alerts_created": 4,         -- ❌ Wrong name!
  "assessments_completed": 2,
  "total_patients": 3,
  "activity_count": 45         -- ❌ Wrong location!
}
```

### ✅ What UI Expects (from TypeScript interface)
```typescript
export interface SimulationMetrics {
  medications_administered: number;  // ✅ Correct
  vitals_recorded: number;           // ✅ Correct
  notes_created: number;             // ✅ Correct
  alerts_generated: number;          // ❌ Was "alerts_created"
  alerts_acknowledged: number;       // ❌ MISSING!
  total_actions: number;             // ❌ Was in activity_summary
  unique_participants: number;       // ❌ MISSING!
  // Optional fields
  alert_response_time_avg?: number;
  medication_accuracy?: number;
  documentation_completeness?: number;
}
```

## UI Display Expectations

The debrief report (`DebriefReportModal.tsx`) displays:
1. **Total Actions** - `historyRecord.metrics.total_actions`
2. **Medications Admin** - `historyRecord.metrics.medications_administered`
3. **Vitals Recorded** - `historyRecord.metrics.vitals_recorded`
4. **Alerts Generated** - `historyRecord.metrics.alerts_generated`
5. **Notes Created** - `historyRecord.metrics.notes_created`
6. **Unique Participants** - `historyRecord.metrics.unique_participants`

## Issues Found

### 1. Field Name Mismatch
- **Problem**: Database used `alerts_created` but UI expects `alerts_generated`
- **Impact**: Alert count showing as 0 or undefined

### 2. Missing Acknowledged Alerts
- **Problem**: No tracking of how many alerts were acknowledged
- **Impact**: Can't measure response effectiveness

### 3. Missing Total Actions
- **Problem**: `total_actions` was in `activity_summary` not `metrics`
- **Impact**: "Total Actions" showing as 0 in debrief

### 4. Missing Unique Participants
- **Problem**: No count of unique students who participated
- **Impact**: "Unique Participants" showing as 0

## Solution

Created migration: `fix_simulation_metrics_tracking.sql`

### New Metrics Being Tracked

**Required fields (displayed in UI):**
- ✅ `medications_administered` - Count of meds with last_administered set
- ✅ `vitals_recorded` - Count of all vitals entries
- ✅ `notes_created` - Count of all patient notes
- ✅ `alerts_generated` - Count of all alerts (renamed from alerts_created)
- ✅ `alerts_acknowledged` - Count of acknowledged alerts (NEW!)
- ✅ `total_actions` - Count from simulation_activity_log (MOVED!)
- ✅ `unique_participants` - Distinct users in activity log (NEW!)

**Bonus fields (for future use):**
- `assessments_completed` - Wound assessments
- `total_patients` - Number of patients in simulation
- `diabetic_records` - Blood glucose tracking entries
- `bowel_records` - Bowel movement records
- `doctors_orders` - Orders placed
- `handover_notes` - SBAR handover notes
- `alert_acknowledgement_rate` - Percentage of alerts acknowledged

## How to Apply Fix

### Option 1: Supabase SQL Editor (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `docs/development/database/migrations/fix_simulation_metrics_tracking.sql`
3. Run the migration
4. Complete any active simulation to test

### Option 2: Command Line
```bash
psql "$DATABASE_URL" -f docs/development/database/migrations/fix_simulation_metrics_tracking.sql
```

## Testing the Fix

1. **Start a new simulation** or use an existing one
2. **Perform various actions:**
   - Administer medications (scan barcodes)
   - Record vitals
   - Create patient notes
   - Generate alerts (e.g., overdue meds)
   - Acknowledge some alerts
3. **Complete the simulation**
4. **View the debrief report**
5. **Verify all metrics display:**
   - Total Actions should show count > 0
   - Medications Admin should show medications given
   - Vitals Recorded should show vitals entries
   - Alerts Generated should show total alerts
   - Notes Created should show notes written
   - Unique Participants should show number of students

## Expected Results

### Before Fix
```
Performance Metrics:
- Total Actions: 0 ❌
- Medications Admin: 5 ✅
- Vitals Recorded: 12 ✅
- Alerts Generated: 0 ❌ (was alerts_created)
- Notes Created: 8 ✅
- Unique Participants: 0 ❌
```

### After Fix
```
Performance Metrics:
- Total Actions: 45 ✅
- Medications Admin: 5 ✅
- Vitals Recorded: 12 ✅
- Alerts Generated: 8 ✅
- Notes Created: 8 ✅
- Unique Participants: 3 ✅
```

## Additional Metrics Available

The new function also tracks these bonus metrics (not currently displayed):
- Alert acknowledgement rate (percentage)
- Assessments completed
- Diabetic records
- Bowel records
- Doctors orders
- Handover notes

These can be easily added to the UI later by updating `DebriefReportModal.tsx`.

## Related Files

- **Migration**: `docs/development/database/migrations/fix_simulation_metrics_tracking.sql`
- **Database Function**: `calculate_simulation_metrics(uuid)`
- **TypeScript Type**: `src/types/simulation.ts` → `SimulationMetrics`
- **UI Component**: `src/components/Simulation/DebriefReportModal.tsx`
- **Complete Function**: Database function `complete_simulation(uuid)` calls this

## Notes

- The fix is backward compatible - old history records will show 0 for missing fields
- Future simulations will track all metrics correctly
- The `alerts_acknowledged` metric helps measure response effectiveness
- The `unique_participants` metric helps with group size analysis
- Alert acknowledgement rate is calculated automatically (percentage of alerts that were acknowledged)

## Prevention

To avoid this in the future:
1. Always check TypeScript interfaces match database function output
2. Test debrief reports after any schema changes
3. Keep `SimulationMetrics` interface in sync with `calculate_simulation_metrics()`
4. Add integration tests for simulation completion
