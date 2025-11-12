# Student Activity Tracking & Debrief Reporting System

**Version:** 1.0.0  
**Date:** November 12, 2025  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Service Layer](#service-layer)
5. [UI Components](#ui-components)
6. [Data Flow](#data-flow)
7. [Student Name Collection](#student-name-collection)
8. [Debrief Report Generation](#debrief-report-generation)
9. [Grading & Assessment](#grading--assessment)
10. [API Reference](#api-reference)
11. [Usage Examples](#usage-examples)
12. [Testing Guide](#testing-guide)
13. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The Student Activity Tracking system provides comprehensive accountability and performance assessment for nursing simulation exercises. It tracks every clinical action performed by each student, aggregating data across all clinical forms and modules to generate detailed debrief reports suitable for grading and educational assessment.

### Key Features

- ✅ **Universal Tracking**: Captures student names across 12+ clinical activity types
- ✅ **Automatic Aggregation**: Groups all activities by student for easy review
- ✅ **Timestamp Logging**: Every action is timestamped for chronological analysis
- ✅ **Detailed Reports**: Comprehensive breakdown of student contributions
- ✅ **Print-Friendly**: Formatted reports ready for printing/PDF export
- ✅ **Real-Time Updates**: Activities populate as students complete forms
- ✅ **Zero Configuration**: Works automatically with existing simulation system

### Business Value

**For Instructors:**
- Complete visibility into individual student performance
- Objective grading criteria based on actual documented actions
- Quick identification of active vs. passive participants
- Evidence-based debrief discussions
- Exportable records for academic documentation

**For Students:**
- Clear accountability for their contributions
- Transparent performance tracking
- Detailed feedback on clinical actions
- Portfolio-ready documentation of skills practice

---

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION ENVIRONMENT                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Vitals    │  │   Meds      │  │   Labs      │  ...   │
│  │   Module    │  │   Module    │  │   Module    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                 │                 │                │
│         └─────────────────┴─────────────────┘                │
│                           │                                  │
│                    [Student Name Input]                      │
│                    Yellow Verification Box                   │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  SUPABASE DATABASE    │
                │  ┌─────────────────┐  │
                │  │ patient_vitals  │  │
                │  │ ├─ student_name │  │
                │  │ └─ recorded_at  │  │
                │  ├─────────────────┤  │
                │  │ medications     │  │
                │  │ ├─ student_name │  │
                │  │ └─ admin_at     │  │
                │  ├─────────────────┤  │
                │  │ lab_orders      │  │
                │  │ patient_notes   │  │
                │  │ hacmap_coords   │  │
                │  │ assessments     │  │
                │  │ ... (12 tables) │  │
                │  └─────────────────┘  │
                └───────────┬───────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  STUDENT ACTIVITY SERVICE     │
            │  getStudentActivitiesBySimulation()│
            │  • Queries all tables         │
            │  • Groups by student_name     │
            │  • Aggregates activities      │
            │  • Sorts by contribution      │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  DEBRIEF REPORT MODAL         │
            │  • Student-by-student view    │
            │  • Activity categorization    │
            │  • Timestamps & details       │
            │  • Print/Export functionality │
            └───────────────────────────────┘
```

### Component Hierarchy

```
SimulationManager
└── SimulationHistory
    └── DebriefReportModal
        ├── StudentActivityService (data layer)
        ├── Overview Stats (duration, count, totals)
        └── Student Activity List
            └── For each student:
                ├── Vitals Entries
                ├── Medication Administrations
                ├── Lab Orders & Acknowledgements
                ├── Doctor's Orders
                ├── Clinical Notes
                ├── HAC Map Markers
                └── Assessments
```

---

## Database Schema

### Student Name Columns

All clinical tables include a `student_name` column added via migration `20251112002000_add_student_name_tracking.sql`:

```sql
-- Pattern applied to all tables
ALTER TABLE [table_name] 
ADD COLUMN IF NOT EXISTS student_name TEXT;

CREATE INDEX IF NOT EXISTS idx_[table]_student_name 
ON [table_name](student_name);
```

### Tracked Tables

| Table Name | Student Field | Purpose |
|------------|---------------|---------|
| `patient_vitals` | `student_name` | Vital signs recordings |
| `patient_medications_admin` | `student_name` | Medication administrations |
| `lab_orders` | `student_name` | Lab test orders |
| `lab_results` | `acknowledged_by_student` | Lab acknowledgements |
| `doctors_orders` | `acknowledged_by_student` | Order acknowledgements |
| `patient_notes` | `student_name` | Clinical notes |
| `handover_notes` | `student_name` | SBAR handovers |
| `hacmap_coordinates` | `student_name` | Device/wound placements |
| `clinical_assessments` | `student_name` | Comprehensive assessments |
| `bowel_records` | `student_name` | Bowel assessments |
| `wound_assessments` | `student_name` | Wound documentation |
| `intake_output` | `student_name` | I&O documentation |

### Query Optimization

Indexes ensure fast student activity retrieval:

```sql
-- Example index pattern
CREATE INDEX idx_vitals_student_name ON patient_vitals(student_name);
CREATE INDEX idx_vitals_patient_student ON patient_vitals(patient_id, student_name);
```

---

## Service Layer

### Core Service: `studentActivityService.ts`

**Location:** `/src/services/simulation/studentActivityService.ts`

#### Main Function: `getStudentActivitiesBySimulation()`

```typescript
/**
 * Get all activities for a specific simulation grouped by student
 * @param simulationId - The simulation instance ID
 * @returns Array of student activities, sorted by contribution
 */
export async function getStudentActivitiesBySimulation(
  simulationId: string
): Promise<StudentActivity[]>
```

#### Process Flow

1. **Resolve Patient ID**
   - Query `simulations_active` to get associated `patient_id`
   - All clinical data is linked to this patient

2. **Parallel Data Fetch**
   - Executes 10 concurrent database queries
   - Filters for non-null `student_name` values
   - Orders by timestamp (most recent first)

3. **Data Aggregation**
   - Creates a Map<studentName, StudentActivity>
   - Iterates through each data source
   - Groups activities by student name
   - Increments total entry counter

4. **Response Formatting**
   - Converts Map to Array
   - Sorts by `totalEntries` descending
   - Returns complete activity breakdown

### Data Structures

#### `StudentActivity` Interface

```typescript
export interface StudentActivity {
  studentName: string;
  totalEntries: number;
  activities: {
    vitals: VitalsEntry[];
    medications: MedicationEntry[];
    labOrders: LabOrderEntry[];
    labAcknowledgements: LabAcknowledgementEntry[];
    doctorsOrders: DoctorsOrderEntry[];
    patientNotes: PatientNoteEntry[];
    handoverNotes: HandoverNoteEntry[];
    hacmapDevices: HacMapDeviceEntry[];
    hacmapWounds: HacMapWoundEntry[];
    admissionAssessments: AssessmentEntry[];
    nursingAssessments: AssessmentEntry[];
    bowelAssessments: BowelAssessmentEntry[];
  };
}
```

#### Entry Type Examples

```typescript
interface VitalsEntry {
  id: string;
  recorded_at: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  pain_score: number | null;
}

interface MedicationEntry {
  id: string;
  administered_at: string;
  medication_name: string;
  dose: string;
  route: string;
  barcode_scanned: boolean;
  admin_status: string;
}
```

### Helper Functions

```typescript
/**
 * Get activity summary for a specific student
 * @param simulationId - The simulation instance ID
 * @param studentName - The student's full name
 * @returns Single student's activity record or null
 */
export async function getStudentActivitySummary(
  simulationId: string,
  studentName: string
): Promise<StudentActivity | null>
```

---

## UI Components

### DebriefReportModal Component

**Location:** `/src/features/simulation/components/DebriefReportModal.tsx`

#### Component Architecture

```typescript
const DebriefReportModal: React.FC<DebriefReportModalProps> = ({ 
  historyRecord, 
  onClose 
}) => {
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentActivities();
  }, [historyRecord.id]);

  // ... implementation
}
```

#### UI Sections

**1. Header**
- Modal title: "Student Activity Report"
- Simulation name and date
- Print button
- Close button

**2. Overview Dashboard**
```tsx
<div className="grid grid-cols-3 gap-4">
  <StatCard icon={Clock} label="Duration" value={calculateDuration()} />
  <StatCard icon={User} label="Students" value={studentActivities.length} />
  <StatCard icon={Activity} label="Total Entries" value={totalSum} />
</div>
```

**3. Student Cards**
Each student gets a dedicated card with:
- Student name header
- Total entry count
- Categorized activity sections:
  - ❤️ Vital Signs (red)
  - 💉 Medications (blue)
  - 🧪 Lab Orders (green)
  - 📋 Patient Notes (amber)
  - 📍 HAC Map Activities (emerald/pink)
  - 🏥 Assessments (indigo/cyan/yellow)

**4. Footer**
- Close button
- Print Report button

#### Visual Design

**Color Coding:**
```css
Vitals:              text-red-600, border-red-400
Medications:         text-blue-600, border-blue-400
Lab Orders:          text-green-600, border-green-400
Lab Acknowledgements: text-purple-600, border-purple-400
Doctor's Orders:     text-teal-600, border-teal-400
Patient Notes:       text-amber-600, border-amber-400
Handover Notes:      text-orange-600, border-orange-400
HAC Map Devices:     text-emerald-600, border-emerald-400
HAC Map Wounds:      text-pink-600, border-pink-400
Admission Assess:    text-indigo-600, border-indigo-400
Nursing Assess:      text-cyan-600, border-cyan-400
Bowel Assess:        text-yellow-600, border-yellow-400
```

**Typography:**
- Student names: `text-lg font-bold`
- Activity categories: `font-semibold`
- Timestamps: `font-medium`
- Details: `text-sm`

---

## Data Flow

### Complete Activity Tracking Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Student Completes Clinical Action                   │
│ • Enters vitals / administers medication / documents note    │
│ • Form includes yellow verification box                      │
│ • Student enters their full name                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Form Validation                                      │
│ • Save button remains disabled until student_name filled     │
│ • Required field validation enforced                         │
│ • Frontend validation ensures non-empty string               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Database Persistence                                 │
│ • Record saved with student_name column populated            │
│ • Timestamp automatically captured                           │
│ • Associated with simulation's patient_id                    │
│ • Indexed for fast retrieval                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Simulation Completion                                │
│ • Instructor marks simulation as complete                    │
│ • Simulation moves to History tab                            │
│ • All student activities preserved in database               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Debrief Report Access                                │
│ • Instructor clicks "View Debrief" in History tab            │
│ • DebriefReportModal opens                                   │
│ • Triggers getStudentActivitiesBySimulation()                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Data Aggregation                                     │
│ • Service queries all 12 clinical tables                     │
│ • Filters by patient_id and non-null student_name            │
│ • Groups activities by student name                          │
│ • Counts total entries per student                           │
│ • Sorts by contribution level                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Report Rendering                                     │
│ • Modal displays aggregated data                             │
│ • Each student gets dedicated section                        │
│ • Activities categorized and timestamped                     │
│ • Instructor can review and print                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Student Name Collection

### Yellow Verification Box Pattern

All data entry forms use a consistent yellow verification box at the bottom:

```tsx
{/* Student Name Verification */}
<div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-md">
  <label htmlFor="studentName" className="block text-sm font-medium text-gray-900 mb-2">
    Student Name
  </label>
  <input
    type="text"
    id="studentName"
    value={studentName}
    onChange={(e) => setStudentName(e.target.value)}
    required
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
    placeholder="Enter your full name"
  />
  <p className="mt-2 text-xs text-gray-600">
    By entering your name, you verify you [performed this action].
  </p>
</div>
```

### Verification Messages by Form Type

| Form | Verification Message |
|------|---------------------|
| Vitals | "you recorded these vital signs" |
| Medications | "you administered this medication" |
| Lab Orders | "you ordered this lab test" |
| Lab Results | "you acknowledged this lab result" |
| Doctor's Orders | "you acknowledged this order" |
| Patient Notes | "you created this clinical note" |
| Handover Notes | "you documented this handover" |
| HAC Map Device | "you placed this device" |
| HAC Map Wound | "you documented this wound" |
| Admission Assessment | "you completed this admission assessment" |
| Nursing Assessment | "you completed this nursing assessment" |
| Bowel Assessment | "you documented this bowel assessment" |

### Form-Specific Implementations

#### Standard Forms (Direct Input)
**Examples:** VitalsModule, LabOrderEntryForm, PatientNoteForm

```tsx
const [studentName, setStudentName] = useState('');

// In JSX before submit button
<div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-md">
  {/* Student name input */}
</div>

// Button validation
<button
  disabled={!studentName.trim()}
  // ...
>
  Save
</button>

// In submit handler
const data = {
  // ... other fields
  student_name: studentName
};
```

#### Schema-Based Forms (DynamicForm)
**Examples:** Admission Assessment, Nursing Assessment, Bowel Assessment

```typescript
// In formsSchemas.ts
export const nursingAssessmentSchema: AssessmentSchema = {
  // ... other properties
  properties: {
    // ... other fields
    studentName: {
      type: 'string',
      title: 'Student Name',
      required: true,
      description: 'By entering your name, you verify you completed this assessment.'
    }
  },
  required: ['patientId', 'assessmentDate', 'nurseName', 'studentName']
};
```

DynamicForm automatically detects the `studentName` field and renders it in a yellow box at the bottom.

#### Modal-Based Acknowledgements
**Examples:** Doctor's Orders, Lab Results

```tsx
<StudentAcknowledgeModal
  isOpen={showStudentModal}
  onClose={() => setShowStudentModal(false)}
  onConfirm={handleStudentAcknowledge}
  title="Acknowledge Lab Result"
  message="By entering your name, you verify you reviewed this abnormal result."
/>
```

#### HAC Map Forms (Device/Wound Placement)
**Examples:** DeviceForm, WoundForm

Integrated into the form before save button:

```tsx
{/* Student Name Verification */}
<div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-md">
  <label htmlFor="studentName">Student Name</label>
  <input
    type="text"
    id="studentName"
    value={studentName}
    onChange={(e) => setStudentName(e.target.value)}
    required
  />
  <p>By entering your name, you verify you placed this device.</p>
</div>

{/* Save button */}
<button
  type="submit"
  disabled={isSubmitting || !studentName.trim()}
>
  Save Device
</button>
```

---

## Debrief Report Generation

### Accessing the Report

1. Navigate to **Simulation Manager**
2. Click **History** tab
3. Find completed simulation
4. Click **"View Debrief"** button
5. Modal opens with full student activity report

### Report Structure

#### Overview Metrics
```
┌─────────────────────────────────────────┐
│ Duration: 2h 15m                        │
│ Students: 4                             │
│ Total Entries: 47                       │
└─────────────────────────────────────────┘
```

#### Per-Student Breakdown

```
╔═══════════════════════════════════════════════════════╗
║ 👤 Sarah Johnson                                      ║
║ 15 total entries across all forms                    ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ ❤️ Vital Signs (3)                                    ║
║ ├─ Nov 12, 2025 at 2:30 PM                          ║
║ │  BP: 120/80 mmHg, HR: 72 bpm, Temp: 37.2°C       ║
║ ├─ Nov 12, 2025 at 3:00 PM                          ║
║ │  BP: 118/78 mmHg, HR: 75 bpm, Temp: 37.1°C       ║
║ └─ Nov 12, 2025 at 3:30 PM                          ║
║    BP: 122/82 mmHg, HR: 70 bpm, Temp: 37.0°C       ║
║                                                       ║
║ 💉 Medications (2)                                    ║
║ ├─ Nov 12, 2025 at 2:45 PM                          ║
║ │  Acetaminophen 500mg PO                           ║
║ └─ Nov 12, 2025 at 3:15 PM                          ║
║    Metoprolol 25mg PO                               ║
║                                                       ║
║ 🧪 Lab Orders (1)                                     ║
║ └─ Nov 12, 2025 at 2:35 PM                          ║
║    CBC with Differential (STAT)                     ║
║                                                       ║
║ ... (additional categories)                          ║
╚═══════════════════════════════════════════════════════╝
```

### Print Functionality

**Triggered by:** Print button in modal footer

**Behavior:**
- Calls `window.print()`
- Browser print dialog opens
- Report formatted for paper/PDF:
  - Removes modal background
  - Optimizes layout for A4/Letter
  - Includes all student sections
  - Preserves categorization and timestamps
  - Adds metadata footer

**Print CSS:**
```css
@media print {
  .print\\:hidden { display: none; }
  .print\\:border-black { border-color: black; }
  .print\\:text-black { color: black; }
  .print\\:mb-8 { margin-bottom: 2rem; }
  .print\\:page-break-inside-avoid { page-break-inside: avoid; }
}
```

---

## Grading & Assessment

### Using the Report for Grading

#### Quantitative Assessment

**Participation Metrics:**
- Total entries per student
- Distribution across activity types
- Frequency of documentation
- Timestamp patterns (consistent engagement)

**Example Rubric:**
```
Highly Engaged (A): 15+ entries, diverse activities
Moderately Engaged (B): 10-14 entries, multiple categories
Basic Participation (C): 5-9 entries, limited categories
Minimal Engagement (D): 1-4 entries
No Participation (F): 0 entries
```

#### Qualitative Assessment

**Clinical Competency:**
- Appropriateness of vital signs documentation
- Medication administration safety (barcode scanning)
- Lab ordering rationale (priority levels)
- Assessment thoroughness
- Documentation quality

**Professional Behaviors:**
- Timeliness of actions
- Communication (handover notes)
- Attention to detail (wound measurements, device placement)
- Follow-through (acknowledging results/orders)

### Report Features for Instructors

**✅ Student Comparison**
- Side-by-side activity levels
- Identify high/low contributors
- Spot patterns across cohort

**✅ Timeline Analysis**
- Chronological activity view
- Identify gaps in care
- Assess response times

**✅ Competency Verification**
- Confirm skills practice
- Verify documentation habits
- Track clinical reasoning

**✅ Evidence Collection**
- Exportable for portfolios
- Academic record keeping
- Accreditation documentation

---

## API Reference

### Primary Functions

#### `getStudentActivitiesBySimulation(simulationId: string)`

**Purpose:** Fetch and aggregate all student activities for a simulation

**Parameters:**
- `simulationId` (string): UUID of simulation instance

**Returns:** `Promise<StudentActivity[]>`

**Throws:**
- Error if simulation not found
- Error if patient_id not assigned
- Database connection errors

**Example:**
```typescript
const activities = await getStudentActivitiesBySimulation('sim-uuid-123');
console.log(`Found ${activities.length} students`);
activities.forEach(student => {
  console.log(`${student.studentName}: ${student.totalEntries} entries`);
});
```

#### `getStudentActivitySummary(simulationId: string, studentName: string)`

**Purpose:** Get activity data for a specific student

**Parameters:**
- `simulationId` (string): UUID of simulation instance
- `studentName` (string): Student's full name (exact match)

**Returns:** `Promise<StudentActivity | null>`

**Example:**
```typescript
const summary = await getStudentActivitySummary(
  'sim-uuid-123',
  'Sarah Johnson'
);

if (summary) {
  console.log(`${summary.studentName} has ${summary.totalEntries} entries`);
} else {
  console.log('Student not found');
}
```

### Database Queries

All queries follow this pattern:

```typescript
const { data, error } = await supabase
  .from('[table_name]')
  .select('*')
  .eq('patient_id', patientId)
  .not('student_name', 'is', null)
  .order('created_at', { ascending: false });
```

**Performance Optimization:**
- Parallel execution via `Promise.all()`
- Indexed columns for fast filtering
- Single-pass aggregation algorithm
- Efficient memory usage (streaming not needed for simulation scale)

---

## Usage Examples

### Example 1: Basic Report Generation

```typescript
// In DebriefReportModal component
useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const activities = await getStudentActivitiesBySimulation(historyRecord.id);
      setStudentActivities(activities);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };
  
  loadData();
}, [historyRecord.id]);
```

### Example 2: Student Performance Summary

```typescript
// Generate summary statistics
const activities = await getStudentActivitiesBySimulation(simulationId);

const stats = activities.map(student => ({
  name: student.studentName,
  totalEntries: student.totalEntries,
  vitalsCount: student.activities.vitals.length,
  medsCount: student.activities.medications.length,
  notesCount: student.activities.patientNotes.length,
  assessmentsCount: 
    student.activities.admissionAssessments.length +
    student.activities.nursingAssessments.length +
    student.activities.bowelAssessments.length
}));

// Find top performer
const topPerformer = stats.reduce((max, student) => 
  student.totalEntries > max.totalEntries ? student : max
);

console.log(`Top performer: ${topPerformer.name} with ${topPerformer.totalEntries} entries`);
```

### Example 3: Activity Type Distribution

```typescript
const activities = await getStudentActivitiesBySimulation(simulationId);

const distribution = {
  vitals: 0,
  medications: 0,
  labs: 0,
  notes: 0,
  assessments: 0,
  hacmap: 0
};

activities.forEach(student => {
  distribution.vitals += student.activities.vitals.length;
  distribution.medications += student.activities.medications.length;
  distribution.labs += student.activities.labOrders.length;
  distribution.notes += 
    student.activities.patientNotes.length + 
    student.activities.handoverNotes.length;
  distribution.assessments += 
    student.activities.admissionAssessments.length +
    student.activities.nursingAssessments.length +
    student.activities.bowelAssessments.length;
  distribution.hacmap += 
    student.activities.hacmapDevices.length +
    student.activities.hacmapWounds.length;
});

console.log('Activity Distribution:', distribution);
```

### Example 4: Participation Rate Calculation

```typescript
const activities = await getStudentActivitiesBySimulation(simulationId);
const expectedStudents = 5; // From roster

const participationRate = (activities.length / expectedStudents) * 100;
const averageEntries = activities.reduce((sum, s) => sum + s.totalEntries, 0) / activities.length;

console.log(`Participation Rate: ${participationRate}%`);
console.log(`Average Entries per Student: ${averageEntries.toFixed(1)}`);
```

---

## Testing Guide

### Manual Testing Checklist

#### Phase 1: Student Name Collection

- [ ] **Vitals Module**
  - [ ] Yellow box appears at bottom of form
  - [ ] Save button disabled until name entered
  - [ ] Name saves to database correctly
  - [ ] Multiple vitals by same student link correctly

- [ ] **Medication Administration**
  - [ ] Yellow box appears in verify step
  - [ ] Administer button disabled until name entered
  - [ ] Barcode scanning works with student name
  - [ ] Name persists in medications_admin table

- [ ] **Lab Orders**
  - [ ] Changed "Initials" to "Student Name"
  - [ ] Yellow box styling consistent
  - [ ] Required validation works
  - [ ] Name saves to lab_orders table

- [ ] **Patient Notes**
  - [ ] Yellow box at form bottom
  - [ ] All note types capture student name
  - [ ] Name required before submit

- [ ] **HAC Map**
  - [ ] DeviceForm has yellow box
  - [ ] WoundForm has yellow box
  - [ ] Save buttons disabled appropriately
  - [ ] Names save to hacmap_coordinates

- [ ] **Assessments**
  - [ ] Admission assessment has student field
  - [ ] Nursing assessment has student field
  - [ ] Bowel assessment has student field
  - [ ] DynamicForm renders yellow box automatically

#### Phase 2: Data Aggregation

- [ ] **Service Layer**
  - [ ] getStudentActivitiesBySimulation() returns data
  - [ ] Student names grouped correctly
  - [ ] Total entries calculated accurately
  - [ ] Activities categorized properly
  - [ ] Timestamps preserved
  - [ ] Sorted by contribution level

- [ ] **Database Queries**
  - [ ] All 10 tables queried successfully
  - [ ] Null student_name filtered out
  - [ ] patient_id filter works
  - [ ] Performance acceptable (<2s)

#### Phase 3: Report Generation

- [ ] **Modal Display**
  - [ ] Opens from History tab
  - [ ] Shows correct simulation name
  - [ ] Overview stats accurate
  - [ ] Student count matches
  - [ ] Total entries sum correct

- [ ] **Student Cards**
  - [ ] All students displayed
  - [ ] Names shown correctly
  - [ ] Entry counts accurate
  - [ ] Activities categorized
  - [ ] Timestamps formatted properly
  - [ ] Clinical details complete

- [ ] **Print Functionality**
  - [ ] Print dialog opens
  - [ ] Layout optimized for paper
  - [ ] All students included
  - [ ] Timestamps preserved
  - [ ] Metadata footer present

### Automated Test Cases

```typescript
describe('Student Activity Service', () => {
  it('should aggregate activities by student name', async () => {
    const activities = await getStudentActivitiesBySimulation('test-sim-id');
    expect(activities).toHaveLength(3);
    expect(activities[0].studentName).toBe('Test Student 1');
    expect(activities[0].totalEntries).toBeGreaterThan(0);
  });

  it('should handle simulations with no student activities', async () => {
    const activities = await getStudentActivitiesBySimulation('empty-sim-id');
    expect(activities).toHaveLength(0);
  });

  it('should sort students by contribution level', async () => {
    const activities = await getStudentActivitiesBySimulation('test-sim-id');
    for (let i = 0; i < activities.length - 1; i++) {
      expect(activities[i].totalEntries)
        .toBeGreaterThanOrEqual(activities[i + 1].totalEntries);
    }
  });
});

describe('DebriefReportModal', () => {
  it('should render overview statistics', () => {
    render(<DebriefReportModal historyRecord={mockRecord} onClose={jest.fn()} />);
    expect(screen.getByText(/Duration:/)).toBeInTheDocument();
    expect(screen.getByText(/Students:/)).toBeInTheDocument();
    expect(screen.getByText(/Total Entries:/)).toBeInTheDocument();
  });

  it('should display all student activities', async () => {
    render(<DebriefReportModal historyRecord={mockRecord} onClose={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Mike Chen')).toBeInTheDocument();
    });
  });
});
```

---

## Troubleshooting

### Common Issues

#### Issue: Student names not appearing in report

**Symptoms:**
- Report shows "No student activities recorded"
- Student count shows 0
- Empty student list

**Diagnosis:**
1. Check if student names were entered during simulation
2. Verify database has non-null student_name values
3. Confirm patient_id association

**Solution:**
```sql
-- Check for student data
SELECT table_name, COUNT(*) as entries
FROM (
  SELECT 'vitals' as table_name, student_name FROM patient_vitals WHERE patient_id = '[patient-id]'
  UNION ALL
  SELECT 'medications', student_name FROM patient_medications_admin WHERE patient_id = '[patient-id]'
  -- ... other tables
) combined
WHERE student_name IS NOT NULL
GROUP BY table_name;
```

#### Issue: Duplicate student entries

**Symptoms:**
- Same student appears multiple times
- Different spellings/capitalizations

**Cause:**
- Name entry variations (e.g., "Sarah Johnson" vs "sarah johnson")
- Extra whitespace

**Solution:**
- Implement name normalization:
```typescript
const normalizedName = studentName.trim().toLowerCase();
// Store normalized version or enforce strict input
```

#### Issue: Slow report loading

**Symptoms:**
- Modal takes >5 seconds to display
- Loading spinner visible for extended time

**Diagnosis:**
- Check database query performance
- Verify indexes exist
- Check network latency

**Solution:**
```sql
-- Ensure indexes are present
CREATE INDEX IF NOT EXISTS idx_vitals_patient_student 
ON patient_vitals(patient_id, student_name);

-- Repeat for all tables
```

#### Issue: Print formatting issues

**Symptoms:**
- Report cuts off mid-student
- Missing sections in PDF

**Solution:**
```css
/* Add to student card wrapper */
.print:page-break-inside-avoid {
  page-break-inside: avoid;
  break-inside: avoid;
}
```

#### Issue: Missing activity types

**Symptoms:**
- Some categories not showing despite data existing

**Diagnosis:**
- Check if table is included in service query
- Verify field mapping

**Solution:**
Add missing table to `getStudentActivitiesBySimulation()`:
```typescript
const [existingQueries, newTableData] = await Promise.all([
  // ... existing queries
  supabase
    .from('new_table')
    .select('*')
    .eq('patient_id', patientId)
    .not('student_name', 'is', null)
]);

// Add processing logic
newTableData.data?.forEach((row: any) => {
  const student = getOrCreateStudent(row.student_name);
  student.activities.newCategory.push({
    id: row.id,
    // ... map fields
  });
  student.totalEntries++;
});
```

### Debug Mode

Enable detailed logging:

```typescript
// In studentActivityService.ts
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.group('Student Activity Aggregation');
  console.log('Simulation ID:', simulationId);
  console.log('Patient ID:', patientId);
  console.log('Query results:', {
    vitals: vitalsData.data?.length,
    medications: medicationsData.data?.length,
    // ... etc
  });
  console.log('Aggregated students:', studentMap.size);
  console.groupEnd();
}
```

### Support Resources

**Documentation:**
- Migration file: `database/migrations/20251112002000_add_student_name_tracking.sql`
- Service file: `src/services/simulation/studentActivityService.ts`
- Component file: `src/features/simulation/components/DebriefReportModal.tsx`

**Database Schema:**
```sql
\d patient_vitals
\d patient_medications_admin
\d lab_orders
-- etc.
```

**Health Check Query:**
```sql
-- Verify student tracking is working
SELECT 
  'vitals' as source,
  COUNT(*) as total_records,
  COUNT(student_name) as with_student,
  COUNT(DISTINCT student_name) as unique_students
FROM patient_vitals
WHERE patient_id IN (
  SELECT patient_id FROM simulations_active WHERE status = 'completed'
)
UNION ALL
SELECT 'medications', COUNT(*), COUNT(student_name), COUNT(DISTINCT student_name)
FROM patient_medications_admin
WHERE patient_id IN (SELECT patient_id FROM simulations_active WHERE status = 'completed');
```

---

## Future Enhancements

### Planned Features

**📊 Advanced Analytics**
- Student performance trending over multiple simulations
- Competency gap analysis
- Cohort comparison dashboards
- Export to Excel/CSV for external analysis

**🎯 Learning Objectives Mapping**
- Tag activities with learning objectives
- Competency completion tracking
- Skills checklist verification
- Automated competency reports

**🔔 Real-Time Monitoring**
- Live activity feed during simulation
- Instructor dashboard showing current participation
- Alert for inactive students
- Engagement heatmap

**📱 Mobile Optimization**
- Responsive debrief report
- Touch-friendly activity cards
- Mobile print optimization

**🤖 AI-Powered Insights**
- Pattern recognition in student behaviors
- Automated feedback generation
- Performance prediction
- Personalized recommendations

### Integration Opportunities

**LMS Integration:**
- Auto-export grades to Canvas/Blackboard/Moodle
- Sync with learning record stores (xAPI/LRS)
- Portfolio integration

**Assessment Tools:**
- Rubric-based automated scoring
- Peer evaluation incorporation
- Self-reflection prompts

---

## Version History

### v1.0.0 - November 12, 2025
- ✅ Initial release
- ✅ Database migration for student_name columns
- ✅ Student activity service implementation
- ✅ Debrief report modal redesign
- ✅ Yellow verification box on all forms
- ✅ Print functionality
- ✅ Comprehensive documentation

---

## Summary

The Student Activity Tracking system provides **complete accountability** and **objective assessment** capabilities for nursing simulations. By capturing student names at every clinical action and aggregating them into comprehensive debrief reports, instructors gain unprecedented visibility into individual student performance, enabling evidence-based grading and meaningful educational feedback.

**Key Achievements:**
- ✅ Universal tracking across 12+ clinical activity types
- ✅ Automated aggregation and reporting
- ✅ Print-ready grading documents
- ✅ Zero manual data entry required
- ✅ Seamless integration with existing simulation system

**Impact:**
- Objective, evidence-based grading criteria
- Complete participation accountability
- Enhanced educational outcomes
- Reduced administrative burden
- Improved student engagement

---

**Document Maintained By:** hacCare Development Team  
**Last Updated:** November 12, 2025  
**Status:** Production Ready ✅
