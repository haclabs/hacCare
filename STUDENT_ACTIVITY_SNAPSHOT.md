# Student Activity Snapshot Implementation

## Overview
Implemented a pre-completion activity snapshot system to capture student activities at the moment a simulation is completed, avoiding post-facto reconstruction issues.

## Problem Solved
- **Issue**: Debrief reports failed when querying historical simulations due to duplicate patients per tenant_id
- **Root Cause**: Patient lookup with `.maybeSingle()` throws error when multiple patients exist for same tenant
- **Solution**: Capture and store student activities BEFORE completing simulation, snapshot the data in history record

## Implementation Details

### 1. Database Schema Changes

#### Migration 20251112007000 - Add student_activities Column
```sql
ALTER TABLE simulation_history 
ADD COLUMN student_activities jsonb DEFAULT '[]'::jsonb;
```
- Stores complete student activity snapshot as JSONB array
- Default empty array for backward compatibility

#### Migration 20251112008000 - Update complete_simulation Function
```sql
CREATE OR REPLACE FUNCTION complete_simulation(
  p_simulation_id uuid,
  p_activities jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
```
- Added `p_activities` parameter to accept activities snapshot
- Stores activities in `student_activities` column during history insertion
- Returns activities_count in result for confirmation

### 2. Frontend Service Layer

#### simulationService.ts - Updated completeSimulation
```typescript
export async function completeSimulation(
  simulationId: string,
  activities: any[] = []
): Promise<SimulationFunctionResult>
```
- Added `activities` parameter
- Passes activities to database RPC call as `p_activities`

### 3. UI Components

#### ActiveSimulations.tsx - handleComplete Function
```typescript
const handleComplete = async (id: string) => {
  // 1. Dynamic import of student activity service
  const { getStudentActivitiesBySimulation } = await import('...');
  
  // 2. Capture activities BEFORE completion
  const activities = await getStudentActivitiesBySimulation(id);
  
  // 3. Complete simulation WITH activities snapshot
  const result = await completeSimulation(id, activities);
  
  // 4. Show confirmation with student count
  alert(`Simulation completed!\nStudent activities: ${activities.length} students, ${totalEntries} total entries`);
}
```

#### DebriefReportModal.tsx - Smart Activity Loading
```typescript
const loadStudentActivities = async () => {
  // Check if history record has stored activities snapshot
  if (historyRecord.student_activities && Array.isArray(historyRecord.student_activities)) {
    console.log('📸 Using stored activity snapshot');
    setStudentActivities(historyRecord.student_activities);
  } else {
    // Fallback: query activities (for older history records)
    console.log('🔍 Querying activities (pre-snapshot record)');
    const activities = await getStudentActivitiesBySimulation(historyRecord.id);
    setStudentActivities(activities);
  }
}
```
- Prioritizes stored snapshot (new records)
- Falls back to querying for legacy records
- Maintains backward compatibility

## Benefits

1. **Reliability**: Captures exact state at completion time
2. **Performance**: No complex queries needed for debrief reports
3. **Accuracy**: Snapshot reflects actual simulation state, not reconstructed data
4. **Backward Compatible**: Older records still work via fallback query
5. **Bypasses Patient Issues**: Avoids duplicate patient lookup problems entirely

## Data Flow

```
User clicks "Complete" 
  → Frontend captures activities via getStudentActivitiesBySimulation(id)
  → Frontend calls completeSimulation(id, activities)
  → Backend stores activities in simulation_history.student_activities
  → History record created with snapshot
  → Debrief modal reads snapshot from history record
  → Report displays instantly without querying
```

## Enhanced Debrief Report Features

### Detailed Activity Display (12+ Activity Types)

1. **Vital Signs** 
   - All parameters: BP, HR, RR, Temp, O₂ Sat, Pain Score
   - Formatted with units (mmHg, bpm, /min, °C, %)

2. **Medications** 
   - Medication name, dose, route
   - Barcode scan verification status (✓)
   - Administration status

3. **Doctor's Orders** (Acknowledgements)
   - Order type displayed
   - Full order details in formatted JSON box
   - Clear purple color coding for visibility

4. **Lab Result Acknowledgements**
   - Test name and result value
   - Abnormal flags with warning icon (⚠ ABNORMAL)
   - Red highlighting for abnormal results

5. **Lab Orders**
   - Test name
   - Priority level (STAT, Routine, etc.)
   - Specimen type

6. **Patient Notes**
   - Note type (Progress, Assessment, etc.)
   - Subject line
   - Full note content displayed
   - Italicized content for readability

7. **Handover Notes (SBAR)**
   - Complete SBAR format with labels
   - Situation, Background, Assessment, Recommendation
   - Each section clearly separated

8. **HAC Map Devices**
   - Device type
   - Placement date (if recorded)
   - Inserted by (if recorded)

9. **HAC Map Wounds**
   - Wound type
   - Wound dimensions (length × width in cm)
   - Wound description

10. **Admission Assessments**
    - Timestamp
    - Confirmation of completion

11. **Nursing Assessments**
    - Timestamp
    - Confirmation of completion

12. **Bowel Assessments**
    - Stool appearance
    - Consistency, colour, amount
    - Incontinence status

### PDF Generation (Professional Reports)
1. **Download Complete Report**: Main download button generates PDF with all students
   - Professional formatting with proper headers
   - Color-coded activity sections
   - Automatic page breaks between students
   - Timestamped filename for archiving
   
2. **Download Individual Student PDF**: Each student card has a "Download PDF" button
   - Generates PDF for single student only
   - Includes simulation details header
   - Perfect for grading and student portfolios
   - Filename includes student name

**PDF Features:**
- Professional report header with purple branding
- Facility name support (if available)
- Simulation name, date, and duration
- Student count and total entries summary
- Color-coded activity categories matching on-screen display
- Automatic page management (no content cutoff)
- Formatted timestamps and clinical details
- Footer with generation timestamp
- Ready for printing, emailing, or archiving

### Duration Calculation
- Fixed to use `ended_at` or `completed_at` from history
- Properly calculates hours and minutes
- No longer shows "N/A" for completed simulations

## Testing Checklist

- [ ] Complete a simulation and verify activities are captured
- [ ] Check database: verify `student_activities` column populated
- [ ] Open debrief report from history
- [ ] Verify report shows correct student count and entries
- [ ] Test with simulation that has multiple students
- [ ] Verify doctor's order details are shown
- [ ] Test individual student print functionality
- [ ] Test print all students (verify page breaks)
- [ ] Verify duration calculation shows correctly
- [ ] Test with simulation that has no student activities
- [ ] Verify older history records still work (fallback query)

## Future Improvements

1. Regenerate TypeScript types from database schema
2. Add unique constraint on patients(tenant_id) to prevent duplicates
3. Investigate why reset function creates duplicate patients
4. Remove extensive debugging console.log statements
5. Add type safety for activities array (replace `any[]`)

## Files Modified

- `supabase/migrations/20251112007000_add_student_activities_to_history.sql` (created)
- `supabase/migrations/20251112008000_update_complete_simulation_with_activities.sql` (created)
- `src/services/simulation/simulationService.ts` (modified completeSimulation)
- `src/features/simulation/components/ActiveSimulations.tsx` (modified handleComplete)
- `src/features/simulation/components/DebriefReportModal.tsx` (added snapshot loading logic)
