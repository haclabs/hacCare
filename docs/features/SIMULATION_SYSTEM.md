# Simulation System - How It Works

## Overview

The simulation system allows nursing students to practice clinical skills on virtual patients. Faculty create template scenarios, launch simulations for different class sessions, and review student work via debrief reports.

## Architecture

### Database Functions (PostgreSQL)

Located in: `/supabase/migrations/`

Three core functions power the system:

#### 1. `save_template_snapshot_v2(template_id)`
Creates a baseline snapshot of a template's clinical data.
- Captures all patient vitals, medications, orders, notes, etc.
- Stores as JSONB in `simulation_templates.snapshot_data`
- Schema-agnostic: auto-discovers tables

#### 2. `restore_snapshot_to_tenant_v2(tenant_id, snapshot)`  
Resets a simulation to its original template state.
- **Deletes** all student work (vitals, meds, notes, etc.)
- **Restores** baseline data from template
- Used between class sessions

#### 3. `complete_simulation(simulation_id, activities)`
Marks simulation complete and saves student work to history.
- Stores activities snapshot in `simulation_history.student_activities`
- Creates timestamped history record for debrief reports

### Frontend Services (TypeScript)

Located in: `/src/services/simulation/`

#### `simulationService.ts`
Main simulation lifecycle:
- `launchSimulation()` - Start new sim from template
- `resetSimulationForNextSession()` - Clear data between sessions  
- `completeSimulation()` - Save to history with activities

#### `studentActivityService.ts`
Student activity tracking:
- `getStudentActivitiesBySimulation()` - Query clinical tables for student work
- Aggregates: vitals, medications, labs, notes, devices, wounds, etc.
- Groups by student name
- Returns summary with counts

## Data Flow

### 1. Template Creation
```
Faculty creates template patient(s)
   ↓
Adds baseline vitals, meds, orders
   ↓
Clicks "Save Template"
   ↓
save_template_snapshot_v2() captures all data
   ↓
Snapshot stored in simulation_templates.snapshot_data
```

### 2. Simulation Launch
```
Faculty clicks "Launch Simulation"
   ↓
launchSimulation() called
   ↓
Creates new tenant_id for isolation
   ↓
restore_snapshot_to_tenant_v2() copies template data
   ↓
Simulation ready for students
```

### 3. Student Work
```
Students log in with simulation code
   ↓
Record vitals, administer meds, add notes
   ↓
Data saved to clinical tables with:
  - tenant_id (simulation isolation)
  - student_name (tracking)
  - patient_id (which patient)
   ↓
Work accumulates in real-time
```

### 4. Simulation Completion
```
Faculty clicks "Complete Simulation"
   ↓
Frontend calls getStudentActivitiesBySimulation()
   ↓
Queries ALL clinical tables for student_name data
   ↓
Aggregates work by student
   ↓
Calls complete_simulation(id, activities)
   ↓
Activities stored in simulation_history.student_activities
   ↓
Debrief report available
```

### 5. Simulation Reset (Between Classes)
```
Faculty clicks "Reset Simulation"
   ↓
resetSimulationForNextSession() called
   ↓
restore_snapshot_to_tenant_v2() runs:
  1. DELETES all student work (vitals, meds, notes, etc.)
  2. RESTORES template baseline (prescribed meds, initial data)
  3. CLEARS student_name fields (sets to NULL)
  4. EXCLUDES medication_administrations (never restored)
   ↓
Simulation ready for next class (clean slate)
```

## Key Tables

### `simulation_templates`
Template definitions with baseline snapshots.
- `snapshot_data` - JSONB of all clinical data
- `tenant_id` - Template's isolated data space

### `simulation_active`  
Currently running simulations.
- `tenant_id` - Simulation's isolated data space
- `template_id` - Which template it's based on
- `status` - running, paused, completed

### `simulation_history`
Completed simulations with student work.
- `student_activities` - JSONB array of all student work
- Used for debrief reports

### Clinical Tables (Student Work)
All have `tenant_id` for isolation and `student_name` for tracking:
- `patient_vitals`
- `medication_administrations` 
- `patient_notes`
- `lab_orders` / `lab_results`
- `doctors_orders`
- `devices`
- `wounds`
- `bowel_records`
- And more...

## Student Activity Tracking

### Which Field Tracks Students?

Most tables use `student_name` TEXT field:
- patient_vitals
- medication_administrations  
- lab_orders
- patient_notes
- handover_notes
- bowel_records
- diabetic_records

Some tables use `created_by` UUID instead:
- devices (links to user_profiles.id)
- wounds (links to user_profiles.id)

### How Activities Are Queried

`getStudentActivitiesBySimulation()` queries each clinical table:
```typescript
// Example: Vitals query
const { data: vitals } = await supabase
  .from('patient_vitals')
  .select('*')
  .eq('tenant_id', simulation.tenant_id)
  .not('student_name', 'is', null);
```

Groups results by student name, counts entries per type.

### How Activities Are Stored

When completing, activities are captured and stored:
```typescript
const activities = await getStudentActivitiesBySimulation(simId);
// activities = [
//   { studentName: "John Doe", totalEntries: 15, vitals: [...], medications: [...] },
//   { studentName: "Jane Smith", totalEntries: 12, vitals: [...], labs: [...] }
// ]

await completeSimulation(simId, activities);
// Stores in simulation_history.student_activities as JSONB
```

### How Debrief Reports Work

`DebriefReportModal.tsx`:
1. Checks if `historyRecord.student_activities` exists (snapshot)
2. If yes: Use stored snapshot ✅ (correct data)
3. If no: Query fresh (fallback for old records)

This prevents showing wrong data if simulation was reset after completion.

## Important: Reset Behavior

### What Gets Deleted
When you reset a simulation, **ALL student work is deleted**:
- ✅ `medication_administrations` - Student administered meds
- ✅ `patient_vitals` - Student recorded vitals
- ✅ `patient_notes` - Student notes
- ✅ `lab_orders` / `lab_results` - Student labs
- ✅ `doctors_orders` - Student order acknowledgments
- ✅ All other student-generated clinical records

### What Gets Restored
Only **template baseline data** is restored:
- ✅ `patient_medications` - Prescribed meds (MAR)
- ✅ Any initial orders/notes from template setup
- ⚠️ **student_name fields are cleared** (set to NULL)
- ❌ `medication_administrations` is **NEVER restored** (100% student work)

### Why student_name Is Cleared
Even for baseline data (like initial vitals from the template), the `student_name` field is set to NULL during restoration. This prevents any old tracking data from appearing in the next session's debrief report.

**Example:** If your template has baseline vitals with `student_name: "Setup Admin"`, after reset those vitals are restored but `student_name` becomes `NULL`.

## Troubleshooting

### Issue: "Old data shows after reset"

**Possible causes:**
1. Reset function failing (check browser console)
2. Old data from before fix was deployed
3. Debrief using fresh query instead of snapshot

**Check:**
```javascript
// Browser console should show:
"🔄 Reset for tenant <uuid>: Delete + Restore baseline"
"🗑️ Deleted X from patient_vitals"
"🗑️ Deleted Y from medication_administrations"
// ... etc
"✅ Done: X deleted, Y restored"
```

If no delete output, reset function is failing.

**One-time cleanup (if needed):**
If you have old medication_administrations with student_name filled in from before the fix, run:
```sql
UPDATE medication_administrations SET student_name = NULL WHERE student_name IS NOT NULL;
```

### Issue: "Student activities missing"

**Check:**
1. `simulation_history.student_activities` is not null
2. Clinical tables have `student_name` populated
3. Complete function received activities parameter

**Verify in DB:**
```sql
SELECT student_activities 
FROM simulation_history 
WHERE id = '<history-id>';
-- Should return JSONB array, not null
```

### Issue: "Field errors on forms"

Some forms tried to save `student_name` to tables without that column:
- `devices` - Uses `created_by` (UUID)
- `wounds` - Uses `created_by` (UUID)

Check form code doesn't reference `student_name` for these tables.

## File Locations

### Live Code
- Migrations: `/supabase/migrations/202511*.sql`
- Services: `/src/services/simulation/`
- Components: `/src/features/simulation/components/`
- Types: `/src/types/supabase.ts`

### Documentation
- This file: `/SIMULATION_SYSTEM.md`
- Functions: `/database/functions/simulation/README.md`

### Archives (DO NOT USE)
- `/backup/simulation-legacy/` - Old V1 system
- `/docs/development/simulation-v2/` - Development work
- `/archive/` - Old component versions

## Making Changes

1. **Database changes:** Create new migration in `/supabase/migrations/`
2. **TypeScript changes:** Edit services in `/src/services/simulation/`
3. **Test:** Reset → Add data → Complete → Check debrief
4. **Deploy:** Push to database, deploy frontend

## References

- Student Activity Tracking: `/STUDENT_ACTIVITY_TRACKING.md`
- Migration Guide: `/SIMULATION_V2_MIGRATION_GUIDE.md`
- Schema Docs: `/docs/database/`
