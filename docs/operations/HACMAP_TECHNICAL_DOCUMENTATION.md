# hacMap Technical Documentation

**System:** Device & Wound Mapping with Visual Body Placement  
**Last Updated:** November 16, 2025  
**Version:** 1.0.0  
**Status:** Production Ready

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Service Layer](#service-layer)
5. [Component Structure](#component-structure)
6. [Data Flow](#data-flow)
7. [Assessment System](#assessment-system)
8. [Integration Points](#integration-points)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Change Log](#change-log)

---

## System Overview

hacMap is a visual body mapping system for tracking medical devices and wounds on a patient's body. Students can:
- Click on an interactive avatar to place devices/wounds at specific body locations
- Document placement details (type, size, insertion method, etc.)
- Perform device-type-specific assessments (IV, Foley, Feeding Tube, etc.)
- View assessment history and track changes over time

### Key Features
- **Visual Placement**: Interactive front/back body views with coordinate-based positioning
- **Device Types**: IV (Peripheral/PICC/Port), Foley, Feeding Tube, Chest Tube, Closed Suction Drain, Other
- **Wound Types**: Incision, Laceration, Surgical Site, Pressure Injury, Skin Tear, Other
- **Assessments**: Device-specific assessment forms with JSONB storage
- **Student Tracking**: All actions tagged with student name for grading/debrief

---

## Architecture

### High-Level Flow
```
User Click on Avatar
    ↓
Create avatar_location (x, y coordinates)
    ↓
Open Form (DeviceForm or WoundForm)
    ↓
Save device/wound (linked to location)
    ↓
Marker appears on avatar at coordinates
    ↓
Click marker → View details + Add assessments
    ↓
Assessment saved with JSONB device-specific data
```

### Directory Structure
```
src/features/hacmap/
├── AvatarBoard.tsx              # Main orchestrator
├── api.ts                       # API functions for CRUD
├── components/
│   ├── AvatarCanvas.tsx         # Interactive SVG avatar
│   └── DeviceAssessmentViewer.tsx  # View device assessments
├── forms/
│   ├── DeviceForm.tsx           # Device placement form
│   ├── WoundForm.tsx            # Wound documentation form
│   ├── AssessmentForm.tsx       # Wound assessment form
│   ├── DeviceAssessmentForm.tsx # Device assessment router
│   └── device-assessments/
│       ├── IVAssessmentFields.tsx
│       ├── FoleyAssessmentFields.tsx
│       └── FeedingTubeAssessmentFields.tsx
└── types/
    └── hacmap.ts                # TypeScript type definitions

src/services/hacmap/
├── assessmentService.ts         # Wound assessments CRUD
└── deviceAssessmentService.ts   # Device assessments CRUD
```

---

## Database Schema

### Core Tables

#### `avatar_locations`
**Purpose:** Stores x,y coordinates for visual placement on body avatar

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Multi-tenant isolation |
| patient_id | uuid | Links to patients table |
| region_key | text | Body region (head, chest, left-arm, etc.) |
| x_percent | numeric(5,2) | X coordinate (0-100%) |
| y_percent | numeric(5,2) | Y coordinate (0-100%) |
| body_view | text | 'front' or 'back' |
| created_by | uuid | User who placed marker |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Timestamp |

**RLS Policy:** `avatar_locations_tenant_isolation` (WHERE tenant_id = app.current_tenant_id())

---

#### `devices`
**Purpose:** Device placement records (IV, Foley, Feeding Tube, etc.)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Multi-tenant isolation |
| patient_id | uuid | Links to patients |
| location_id | uuid | Links to avatar_locations |
| type | text | Device type enum |
| placement_date | date | When device was placed |
| placement_time | time | 24-hour format (HH:MM) |
| placed_pre_arrival | text | EMS/NH/Clinic/Other |
| inserted_by | text | Provider/student name |
| tube_number | integer | 1-10 for multiple devices |
| orientation | text[] | Array of orientations (superior, inferior, medial, etc.) |
| tube_size_fr | text | French size |
| number_of_sutures_placed | integer | Suture count |
| reservoir_type | text | Jackson-Pratt, Hemovac, etc. |
| reservoir_size_ml | integer | mL capacity |
| securement_method | text[] | Suture, Tape, StatLock, Other |
| patient_tolerance | text | Free text |
| notes | text | Additional notes |
| **IV-specific fields:** |
| gauge | text | 14G, 16G, 18G, 20G, 22G, 24G |
| site_side | text | Left, Right |
| site_location | text | Anatomical description |
| **Feeding Tube-specific fields:** |
| route | text | NG, OG, PEG, PEJ, GJ, Other |
| external_length_cm | numeric(5,2) | External tube length |
| initial_xray_confirmed | boolean | X-ray confirmed placement |
| initial_ph | numeric(3,1) | pH test result |
| initial_aspirate_appearance | text | Aspirate description |
| placement_confirmed | boolean | Overall placement confirmation |
| created_by | uuid | User who created record |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Timestamp |

**Device Type Enum:** `closed-suction-drain`, `chest-tube`, `foley`, `feeding-tube`, `iv-peripheral`, `iv-picc`, `iv-port`, `other`

**RLS Policy:** `devices_tenant_isolation`

---

#### `wounds`
**Purpose:** Wound documentation records

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Multi-tenant isolation |
| patient_id | uuid | Links to patients |
| location_id | uuid | Links to avatar_locations |
| wound_type | text | Wound type enum |
| peri_wound_temperature | text | Temperature description |
| wound_length_cm | numeric(5,2) | Length in cm |
| wound_width_cm | numeric(5,2) | Width in cm |
| wound_depth_cm | numeric(5,2) | Depth in cm |
| wound_description | text | Clinical description |
| drainage_description | text[] | Array of drainage types |
| drainage_consistency | text[] | Array of consistencies |
| wound_odor | text[] | Array of odor descriptors |
| drainage_amount | text | Amount description |
| wound_edges | text | Edge characteristics |
| closure | text | Closure type |
| suture_staple_line | text | approximated/non-approximated |
| sutures_intact | text | Suture status |
| entered_by | text | Student name |
| notes | text | Additional notes |
| created_by | uuid | User who created |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Timestamp |

**Wound Type Enum:** `incision`, `laceration`, `surgical-site`, `pressure-injury`, `skin-tear`, `other`

**RLS Policy:** `wounds_tenant_isolation`

---

#### `wound_assessments`
**Purpose:** Wound assessment history (linked to wounds)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Multi-tenant isolation |
| patient_id | uuid | Links to patients |
| wound_id | uuid | Links to wounds table |
| assessed_at | timestamptz | Assessment timestamp |
| student_name | text | **Required** - student performing assessment |
| site_condition | text | Site condition enum |
| pain_level | integer | 0-10 pain scale |
| wound_appearance | text | Appearance enum |
| drainage_type | text | Drainage type enum |
| drainage_amount | text | Amount enum |
| treatment_applied | text | Treatment description |
| dressing_type | text | Dressing type used |
| notes | text | Additional notes |
| assessment_data | jsonb | **Future:** Device-specific fields |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Timestamp |

**RLS Policy:** `wound_assessments_tenant_isolation`

---

#### `device_assessments`
**Purpose:** Device assessment history with device-type-specific data

**Created:** November 16, 2025

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Multi-tenant isolation |
| patient_id | uuid | Links to patients |
| device_id | uuid | **NOT NULL** - Links to devices table |
| assessed_at | timestamptz | Assessment timestamp (default NOW()) |
| student_name | text | **Required** - student performing assessment |
| device_type | text | **Cached from devices table** for quick queries |
| status | text | Overall status (Normal, Monitor, Intervention Required, Discontinued) |
| output_amount_ml | numeric(10,2) | Output in mL (for drains, Foley, chest tubes) |
| notes | text | Additional notes |
| assessment_data | jsonb | **Device-type-specific fields stored as JSONB** |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Timestamp |

**Indexes:**
- `idx_device_assessments_device_id` - Fast lookup by device
- `idx_device_assessments_patient_id` - Patient-level queries
- `idx_device_assessments_tenant_id` - Tenant isolation
- `idx_device_assessments_device_type` - Filter by type
- `idx_device_assessments_assessed_at` - Chronological ordering
- `idx_device_assessments_student_name` - Student tracking
- `idx_device_assessments_data` (GIN) - JSONB queries

**RLS Policy:** `device_assessments_tenant_isolation`

**Trigger:** `update_device_assessments_updated_at` - Auto-updates `updated_at` timestamp

---

### JSONB Assessment Data Structure

The `assessment_data` column stores device-type-specific fields:

#### IV Assessment (Peripheral, PICC, Port)
```json
{
  "site_location": "Left Antecubital",
  "site_side": "Left",
  "gauge": "20G",
  "local_site_assessment": ["Redness", "Swelling"],
  "infiltration_suspected": false,
  "phlebitis_suspected": false,
  "drainage_colour": ["Clear"],
  "site_notes": "Site clean and dry",
  "line_status": "patent_infusing",
  "line_interventions": ["Flushed"],
  "dressing_type": "Transparent",
  "dressing_status": ["Intact", "Clean", "Dry"],
  "dressing_tolerance": "Well tolerated"
}
```

#### Foley Catheter Assessment
```json
{
  "patency_maintained": true,
  "patency_notes": "",
  "system_integrity": true,
  "integrity_notes": "",
  "catheter_secure": true,
  "securement_notes": "",
  "urine_amount_ml": 400,
  "urine_appearance": "Clear Yellow",
  "urine_odor": "normal",
  "site_findings": ["No Issues"],
  "site_notes": "",
  "patient_comfort": "No discomfort reported",
  "hygiene_provided": true,
  "hygiene_notes": "Perineal care completed",
  "indication_valid": true,
  "plan": "continue"
}
```

#### Feeding Tube Assessment
```json
{
  "placement_reverified": true,
  "reverification_method": ["pH Testing", "Aspirate Appearance"],
  "site_findings": ["Clean", "Dry"],
  "dressing_condition": ["Intact", "Clean"],
  "dressing_changed": false,
  "site_notes": "",
  "tube_flushed": true,
  "flush_resistance": "none",
  "blockage_noted": false,
  "actions_taken": "",
  "residual_volume_ml": 50,
  "residual_appearance": "Clear",
  "residual_returned": true,
  "formula_name": "Jevity 1.5",
  "feeding_method": "continuous",
  "rate_ml_per_hr": 60,
  "volume_given_ml": 1440,
  "water_flushes_ml": 200,
  "flush_timing": ["Pre-feeding", "Post-feeding"],
  "nausea_vomiting": false,
  "nausea_notes": "",
  "cramping": false,
  "abdominal_distension": false,
  "bowel_sounds": "normal",
  "hob_elevated": true
}
```

---

## Service Layer

### Device Assessment Service
**File:** `src/services/hacmap/deviceAssessmentService.ts`  
**Created:** November 16, 2025

```typescript
// All functions use app.current_tenant_id() for RLS
export async function createDeviceAssessment(input: CreateDeviceAssessmentInput)
export async function getDeviceAssessments(deviceId: string, tenantId: string)
export async function getPatientDeviceAssessments(patientId: string, tenantId: string)
export async function getDeviceAssessment(assessmentId: string, tenantId: string)
export async function updateDeviceAssessment(assessmentId: string, tenantId: string, input: UpdateDeviceAssessmentInput)
export async function deleteDeviceAssessment(assessmentId: string, tenantId: string)
export async function getLatestDeviceAssessment(deviceId: string, tenantId: string)
export async function getAssessmentsByDeviceType(deviceType: string, tenantId: string)
export async function getAssessmentsByStudent(studentName: string, tenantId: string)
```

**Key Implementation Details:**
- Validates `device_id` is NOT NULL (separate from wounds)
- Returns assessments ordered by `assessed_at DESC`
- Handles PGRST116 errors (not found) gracefully
- All queries filter by tenant_id for multi-tenant isolation

---

### Wound Assessment Service
**File:** `src/services/hacmap/assessmentService.ts`

```typescript
export async function createAssessment(input: CreateAssessmentInput)
export async function getWoundAssessments(woundId: string, tenantId: string)
export async function getPatientWoundAssessments(patientId: string, tenantId: string)
export async function updateAssessment(assessmentId: string, tenantId: string, input: UpdateAssessmentInput)
export async function deleteAssessment(assessmentId: string, tenantId: string)
```

---

### hacMap API Layer
**File:** `src/features/hacmap/api.ts`

Handles avatar_locations, devices, wounds CRUD:

```typescript
// Avatar Locations
export async function createAvatarLocation(input: CreateAvatarLocationInput)
export async function updateAvatarLocation(locationId: string, input: UpdateAvatarLocationInput)
export async function deleteAvatarLocation(locationId: string)

// Markers (unified view)
export async function listMarkers(patientId: string): Promise<MarkerWithDetails[]>

// Devices
export async function getDevice(id: string)
export async function createDevice(input: CreateDeviceInput)
export async function updateDevice(id: string, input: UpdateDeviceInput)
export async function deleteDevice(id: string)

// Wounds
export async function getWound(id: string)
export async function createWound(input: CreateWoundInput)
export async function updateWound(id: string, input: UpdateWoundInput)
export async function deleteWound(id: string)
```

**Important:** `listMarkers()` does LEFT JOINs to include both devices and wounds in a single query for rendering on avatar.

---

## Component Structure

### AvatarBoard (Main Orchestrator)
**File:** `src/features/hacmap/AvatarBoard.tsx`

**State Management:**
```typescript
// Placement mode
const [placementMode, setPlacementMode] = useState<'device' | 'wound' | null>(null)

// Panel state
const [panelMode, setPanelMode] = useState<'create-device' | 'create-wound' | 'edit-device' | 'edit-wound' | null>(null)
const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
const [selectedWound, setSelectedWound] = useState<Wound | null>(null)

// Assessment state (SEPARATE for devices vs wounds)
const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
const [selectedRecordType, setSelectedRecordType] = useState<'device' | 'wound' | null>(null)
const [deviceAssessments, setDeviceAssessments] = useState<DeviceAssessment[]>([])
const [woundAssessments, setWoundAssessments] = useState<Assessment[]>([])
const [showAssessmentModal, setShowAssessmentModal] = useState(false)
```

**Key Functions:**

1. **handleCreateAt(regionKey, coords)**
   - Creates avatar_location at clicked coordinates
   - Opens DeviceForm or WoundForm based on placementMode
   - Exits placement mode after creation

2. **handleMarkerClick(id, kind)**
   - Fetches device or wound details
   - Opens edit form
   - Loads existing data into form fields

3. **handleRecordSelect(markerId, kind)**
   - Sets selectedRecordId and selectedRecordType
   - Loads assessment history (device or wound)
   - Populates separate assessment arrays

4. **handleAddAssessment()**
   - **Added Nov 16, 2025:** Loads device data if assessing a device
   - Opens assessment modal with device-specific form

5. **handleSaveDeviceAssessment(data)**
   - Calls createDeviceAssessment()
   - Reloads device assessment history
   - Closes modal

6. **handleViewDeviceAssessment(assessment)**
   - Opens DeviceAssessmentViewer modal
   - Displays JSONB data in readable format

---

### AvatarCanvas (Interactive SVG)
**File:** `src/features/hacmap/components/AvatarCanvas.tsx`

**Props:**
```typescript
interface AvatarCanvasProps {
  placementMode: 'device' | 'wound' | null
  markers: MarkerWithDetails[]
  onCreateAt: (regionKey: RegionKey, coords: Coordinates) => void
  onMarkerClick: (id: string, kind: 'device' | 'wound') => void
  showDevices: boolean
  showWounds: boolean
}
```

**Key Features:**
- SVG-based body outline (front/back views toggled)
- Region-based click detection (head, chest, left-arm, etc.)
- Converts click coordinates to percentages (0-100)
- Renders markers at stored x/y coordinates
- Color-coded markers (green=device, red=wound)
- Hover effects and click handlers

**Coordinate System:**
- X: 0-100% (left to right)
- Y: 0-100% (top to bottom)
- Stored as numeric(5,2) in database

---

### DeviceForm
**File:** `src/features/hacmap/forms/DeviceForm.tsx`

**Conditional Fields Added Nov 16, 2025:**

**IV Section** (shown for iv-peripheral, iv-picc, iv-port):
- Gauge dropdown (14G-24G)
- Site side (Left/Right)
- Site location (text input)

**Feeding Tube Section** (shown for feeding-tube):
- Route dropdown (NG, OG, PEG, PEJ, GJ, Other)
- External length (cm)
- Initial placement verification:
  - Initial pH (0-14)
  - Initial aspirate appearance
  - Initial X-ray confirmed (checkbox)
  - Placement confirmed (checkbox)

**Common Fields:** (all device types)
- Placement date/time
- Placed pre-arrival
- Inserted by
- Tube number (1-10)
- Orientation checkboxes (superior, inferior, medial, lateral, anterior, posterior)
- Tube size (French)
- Number of sutures
- Reservoir type/size
- Securement method
- Patient tolerance
- Notes
- **Student name (required, yellow highlight)**

---

### DeviceAssessmentForm (Dynamic Router)
**File:** `src/features/hacmap/forms/DeviceAssessmentForm.tsx`  
**Created:** November 16, 2025

**Purpose:** Routes to device-type-specific assessment field components

**Flow:**
1. Receives `device` prop (includes type, gauge, route, etc.)
2. Shows read-only device info header
3. Switches on `device.type`:
   - `iv-peripheral`/`iv-picc`/`iv-port` → IVAssessmentFields
   - `foley` → FoleyAssessmentFields
   - `feeding-tube` → FeedingTubeAssessmentFields
   - `chest-tube`/`closed-suction-drain` → Generic fields + "Coming soon" message
   - `other` → Notes only
4. Shows generic fields (status, output_amount_ml, notes)
5. **Student name field at bottom (yellow highlight, required)**

**State:**
```typescript
const [studentName, setStudentName] = useState('')
const [status, setStatus] = useState<string>('')
const [outputAmountMl, setOutputAmountMl] = useState<number | undefined>()
const [notes, setNotes] = useState('')
const [assessmentData, setAssessmentData] = useState<Record<string, any>>({})
```

**Save Handler:**
```typescript
const data: CreateDeviceAssessmentInput = {
  device_id: device.id,
  patient_id: patientId,
  tenant_id: tenantId,
  student_name: studentName,
  device_type: device.type,
  status: status || undefined,
  output_amount_ml: outputAmountMl,
  notes: notes || undefined,
  assessment_data: assessmentData  // Device-specific fields
}
await onSave(data)
```

---

### Device-Specific Assessment Fields

#### IVAssessmentFields
**File:** `src/features/hacmap/forms/device-assessments/IVAssessmentFields.tsx`

**Fields:**
- Site location, side, gauge (pre-filled from device)
- Local site assessment checkboxes (Redness, Swelling, Pain, Warmth, Coolness, Induration)
- Infiltration suspected (checkbox)
- Phlebitis suspected (checkbox)
- Drainage colour (Clear, Serous, Sanguineous, Purulent)
- Site notes
- Line status radio (Patent & Infusing, Patent - Saline Lock, Sluggish, Occluded, Discontinued)
- Line interventions (Flushed, Blood Draw, Medication Administration, Troubleshooting)
- Dressing type dropdown
- Dressing status checkboxes (Intact, Clean, Dry, Soiled, Loose, Changed)
- Dressing tolerance

**useEffect Fix (Nov 16, 2025):**
- Removed `onChange` from dependency array to prevent infinite loop
- Added eslint-disable comment

---

#### FoleyAssessmentFields
**File:** `src/features/hacmap/forms/device-assessments/FoleyAssessmentFields.tsx`

**Sections:**

1. **Catheter Function:**
   - Patency maintained (checkbox + notes if unchecked)
   - System integrity maintained (checkbox + notes)
   - Catheter securely anchored (checkbox + notes)

2. **Urine Output:**
   - Amount (mL)
   - Appearance dropdown (Clear Yellow, Amber, Dark, Cloudy, Blood-Tinged, Frank Blood)
   - Odor (normal/foul)

3. **Site Assessment:**
   - Site findings checkboxes (No Issues, Redness, Swelling, Drainage, Discomfort, Excoriation)
   - Site notes

4. **Patient Comfort & Care:**
   - Patient comfort level (free text)
   - Perineal hygiene provided (checkbox + notes)

5. **CAUTI Risk Assessment:**
   - Indication still valid (checkbox)
   - Plan radio (continue, consider removal, remove today)

---

#### FeedingTubeAssessmentFields
**File:** `src/features/hacmap/forms/device-assessments/FeedingTubeAssessmentFields.tsx`

**Sections:**

1. **Placement Verification:**
   - Placement re-verified (checkbox)
   - Re-verification method (pH Testing, Aspirate Appearance, X-ray, External Length)

2. **Site Assessment:**
   - Site findings (Clean, Dry, Redness, Drainage, Granulation Tissue, Excoriation)
   - Dressing condition (Intact, Clean, Dry, Soiled, Loose)
   - Dressing changed (checkbox)
   - Site notes

3. **Tube Patency:**
   - Tube flushed (checkbox)
   - Flush resistance (none/mild/significant)
   - Blockage noted (checkbox + actions taken)

4. **Gastric Residual:**
   - Volume (mL)
   - Appearance (text)
   - Residual returned (checkbox)

5. **Feeding Administration:**
   - Formula name
   - Feeding method (bolus/gravity/continuous)
   - Rate (mL/hr)
   - Volume given (mL)
   - Water flushes (mL)
   - Flush timing (Pre-feeding, Post-feeding, Between Medications, Q4H)

6. **Patient Tolerance:**
   - Nausea/vomiting (checkbox + notes)
   - Cramping (checkbox)
   - Abdominal distension (checkbox)
   - Bowel sounds (normal/hypoactive/hyperactive/absent)
   - HOB elevated ≥30° (checkbox)

---

### DeviceAssessmentViewer
**File:** `src/features/hacmap/components/DeviceAssessmentViewer.tsx`  
**Created:** November 16, 2025

**Purpose:** Display device assessment details from JSONB

**Features:**
- Shows assessment header (type, student, date/time, status)
- Device context section (gauge, route, location, inserted by, placement date)
- Generic fields (output amount, notes)
- Dynamic JSONB rendering:
  - Converts field names (snake_case → Title Case)
  - Handles arrays (join with commas)
  - Handles booleans (Yes/No)
  - Handles objects (JSON.stringify)
  - Filters out null/undefined/empty values

**Example Render:**
```
Site Location: Left Antecubital
Local Site Assessment: Redness, Swelling
Infiltration Suspected: No
Line Status: patent_infusing
Dressing Status: Intact, Clean, Dry
```

---

## Data Flow

### Creating a Device with Assessment

```
1. Student clicks "Device" button
   → setPlacementMode('device')

2. Student clicks on avatar at coordinates (x: 45%, y: 60%)
   → handleCreateAt('chest', { x: 45, y: 60, view: 'front' })
   → Creates avatar_location record
   → Opens DeviceForm with locationId

3. Student fills out DeviceForm
   - Type: "IV Peripheral"
   - Gauge: "20G" (IV-specific field)
   - Site Side: "Left"
   - Site Location: "Antecubital"
   - Placement Date: 2025-11-16
   - Student Name: "Sarah Johnson"

4. Student clicks "Save Device"
   → handleSaveDevice()
   → createDevice() with location_id
   → Device created in database
   → Marker appears on avatar

5. Student clicks on device marker
   → handleMarkerClick(deviceId, 'device')
   → Fetches device details
   → Opens edit panel

6. Student clicks "Add Assessment"
   → handleAddAssessment()
   → Loads device data (getDevice)
   → Opens DeviceAssessmentForm modal
   → Routes to IVAssessmentFields (based on device.type)

7. Student fills out IV assessment
   - Local Site Assessment: [Redness, Swelling]
   - Infiltration Suspected: false
   - Line Status: "patent_infusing"
   - Dressing Type: "Transparent"
   - Dressing Status: [Intact, Clean, Dry]
   - Student Name: "Sarah Johnson"

8. Student clicks "Save Assessment"
   → handleSaveDeviceAssessment()
   → createDeviceAssessment({
       device_id,
       patient_id,
       student_name: "Sarah Johnson",
       device_type: "iv-peripheral",
       assessment_data: { /* IV-specific fields */ }
     })
   → Assessment saved with JSONB data
   → Assessment appears in history panel

9. Student clicks on assessment in history
   → handleViewDeviceAssessment()
   → Opens DeviceAssessmentViewer modal
   → Displays JSONB data in readable format
```

---

## Assessment System

### Design Decisions (Nov 16, 2025)

**Question:** Should device assessments use the same table as wound assessments?

**Decision:** **Separate tables** (`device_assessments` vs `wound_assessments`)

**Rationale:**
1. **Clearer intent**: `device_id NOT NULL` vs `wound_id NOT NULL`
2. **Better querying**: Can filter by device_type
3. **Separate RLS policies**: Different access patterns
4. **Future flexibility**: Can add device-specific columns without affecting wounds
5. **JSONB for flexibility**: assessment_data stores device-type-specific fields

---

### Student Tracking

**All assessment forms require `student_name` (yellow-highlighted field):**

```typescript
// Verification message
"By entering your name, you verify this assessment is accurate."
```

**Used for:**
- Grading individual student performance
- Debrief reports showing who assessed what
- Audit trail for clinical decisions
- Can query assessments by student: `getAssessmentsByStudent(studentName, tenantId)`

---

### Assessment History UI

**Location:** Assessment History panel in AvatarBoard (shown when record selected)

**Features:**
- Shows count: "Assessment History (5)"
- Chronological list (most recent first)
- Displays: student name, date/time
- Click to view full assessment
- Separate lists for device vs wound assessments

**State Management:**
```typescript
const currentAssessments = selectedRecordType === 'device' 
  ? deviceAssessments 
  : woundAssessments

const currentAssessmentCount = currentAssessments.length
```

**Rendering:**
```typescript
{currentAssessments.map((assessment) => (
  <button
    onClick={() => 
      selectedRecordType === 'device' 
        ? handleViewDeviceAssessment(assessment as DeviceAssessment)
        : handleViewWoundAssessment(assessment as Assessment)
    }
  >
    {assessment.student_name} - {new Date(assessment.assessed_at).toLocaleString()}
  </button>
))}
```

---

## Integration Points

### ModularPatientDashboard
**File:** `src/components/ModularPatientDashboard.tsx`

**hacMap Card:**
```typescript
{
  id: 'hacmap',
  title: 'hacMap',
  description: 'Visual device and wound mapping with body placement',
  icon: MapPin,
  color: 'rose'
}
```

**Rendering:**
```typescript
{activeModule === 'hacmap' && (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <AvatarBoard 
      patientId={patient.id}
      patientName={`${patient.first_name} ${patient.last_name}`}
      patientNumber={patient.patient_id}
    />
  </div>
)}
```

**Note:** Old "Wound Care" card removed Nov 16, 2025 (superseded by hacMap)

---

### Multi-Tenant Isolation

**All queries use RLS policies:**

```sql
-- Example policy
CREATE POLICY "device_assessments_tenant_isolation"
ON device_assessments
FOR ALL
TO authenticated
USING (tenant_id = app.current_tenant_id());
```

**Service functions always pass `tenantId`:**
```typescript
await getDeviceAssessments(deviceId, currentTenant.id)
```

**Critical:** Never bypass RLS. Always use authenticated context with `app.current_tenant_id()`.

---

### Simulation Reset System

**hacMap v2 tables included in simulation reset:**

```sql
-- From reset_simulation_for_next_session()
-- Student Work (DELETED on reset):
DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;

-- Baseline Data (DELETED then RESTORED from snapshot):
DELETE FROM wounds WHERE tenant_id = v_tenant_id;
DELETE FROM devices WHERE tenant_id = v_tenant_id;
DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;

-- Then restored via:
SELECT restore_snapshot_to_tenant(
  p_tenant_id := v_tenant_id,
  p_snapshot := v_snapshot,  -- Contains devices, wounds, avatar_locations
  p_preserve_barcodes := true
);
```

**Key Concepts:**
- **Student Work**: Assessments are deleted (students create new ones each session)
- **Baseline Data**: Devices, wounds, locations restored from template snapshot
- **Order matters**: Delete assessments before devices/wounds, delete devices/wounds before locations
- **Debrief**: Device and wound assessments captured before deletion (TODO: implement)

**See**: `/docs/operations/SIMULATION_RESET_SYSTEM.md` for complete reset documentation

---

## Troubleshooting Guide

### Common Issues

#### 1. Markers Not Appearing on Avatar

**Symptoms:** Device/wound created but no marker on avatar

**Check:**
1. Is `location_id` set on device/wound?
2. Are coordinates within 0-100 range?
3. Is `body_view` correct ('front' or 'back')?
4. Check browser console for API errors

**Fix:**
```sql
-- Check for orphaned devices/wounds
SELECT d.id, d.type, d.location_id 
FROM devices d
LEFT JOIN avatar_locations al ON d.location_id = al.id
WHERE al.id IS NULL;

-- Re-create location if needed
UPDATE devices 
SET location_id = (INSERT INTO avatar_locations ... RETURNING id)
WHERE location_id IS NULL;
```

---

#### 2. Assessment Form Shows Wrong Fields

**Symptoms:** IV device shows Foley fields

**Check:**
1. Is `device.type` correct in database?
2. Is DeviceAssessmentForm receiving correct device prop?
3. Check switch statement in DeviceAssessmentForm

**Debug:**
```typescript
console.log('Device type:', device.type)
console.log('Rendering fields for:', device.type)
```

---

#### 3. Infinite Loop in Assessment Form

**Symptoms:** Browser freezes, React warning about max update depth

**Cause:** `onChange` in useEffect dependency array

**Fixed:** Nov 16, 2025 - Removed `onChange` from dependencies in all field components

**Check:**
```typescript
// ❌ WRONG
useEffect(() => {
  onChange(data)
}, [..., onChange]) // onChange changes every render!

// ✅ CORRECT
useEffect(() => {
  onChange(data)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [...]) // No onChange in deps
```

---

#### 4. Assessment Data Not Saving

**Symptoms:** Form submits but assessment_data is empty

**Check:**
1. Are field components calling `onChange` in useEffect?
2. Is `handleAssessmentDataChange` being passed correctly?
3. Check browser console for errors

**Debug:**
```typescript
const handleSave = (data) => {
  console.log('Assessment data:', data.assessment_data)
  // Should show IV/Foley/Feeding Tube fields
}
```

---

#### 5. RLS Policy Errors (Row-Level Security)

**Symptoms:** "permission denied for table" or "new row violates row-level security policy"

**Check:**
1. Is `app.current_tenant_id()` set correctly?
2. Is user authenticated?
3. Does service function pass correct `tenantId`?

**Fix:**
```typescript
// Ensure tenant context is set
const { currentTenant } = useTenant()
if (!currentTenant) {
  alert('No tenant selected')
  return
}

// Always pass tenantId to service functions
await createDeviceAssessment({
  ...data,
  tenant_id: currentTenant.id
})
```

---

#### 6. Student Name Not Required

**Symptoms:** Can save assessment without student name

**Check:**
1. Is `required` attribute on input?
2. Is save button disabled when empty?

**Fix:**
```typescript
<input
  type="text"
  value={studentName}
  onChange={(e) => setStudentName(e.target.value)}
  required // ← Must have
/>

<button
  type="submit"
  disabled={!studentName.trim()} // ← Must check
>
  Save Assessment
</button>
```

---

### Database Queries for Debugging

```sql
-- Check device assessments for a patient
SELECT 
  da.id,
  da.device_type,
  da.student_name,
  da.assessed_at,
  da.assessment_data,
  d.type as actual_device_type
FROM device_assessments da
JOIN devices d ON da.device_id = d.id
WHERE da.patient_id = 'patient-uuid'
ORDER BY da.assessed_at DESC;

-- Find assessments with empty JSONB
SELECT id, device_type, student_name, assessment_data
FROM device_assessments
WHERE assessment_data = '{}'::jsonb;

-- Check for orphaned assessments (device deleted)
SELECT da.*
FROM device_assessments da
LEFT JOIN devices d ON da.device_id = d.id
WHERE d.id IS NULL;

-- Student assessment count
SELECT 
  student_name,
  device_type,
  COUNT(*) as assessment_count
FROM device_assessments
WHERE patient_id = 'patient-uuid'
GROUP BY student_name, device_type;
```

---

## Change Log

### November 17, 2025 - Simulation System Integration

**Simulation Integration:**
- ✅ Created migration files for `device_assessments` table (20251117100000)
- ✅ Created migration files for device-specific fields (20251117100100)
- ✅ Updated `reset_simulation_for_next_session()` to delete device_assessments
- ✅ Updated SIMULATION_RESET_SYSTEM.md documentation
- ✅ Verified baseline data (devices, wounds, avatar_locations) restored from snapshot
- ✅ Student work (device_assessments, wound_assessments) deleted on reset
- 🔜 TODO: Implement debrief generation to capture student assessments before deletion

**Integration Flow:**
1. **Launch**: Template snapshot restores baseline devices/wounds with new fields
2. **Session**: Students add device/wound assessments (stored in device_assessments/wound_assessments)
3. **Reset**: Student assessments deleted, baseline devices/wounds restored from snapshot
4. **Debrief**: (TODO) Capture student assessment data before deletion for review

### November 16, 2025 - Device Assessment System v1.0

**Database:**
- ✅ Created `device_assessments` table with JSONB assessment_data
- ✅ Added device-specific columns to `devices` table:
  - IV: `gauge`, `site_side`, `site_location`
  - Feeding Tube: `route`, `external_length_cm`, `initial_xray_confirmed`, `initial_ph`, `initial_aspirate_appearance`, `placement_confirmed`
- ✅ Added 'feeding-tube' to DeviceType enum
- ✅ Migration: `20251116210200_create_device_assessments_table.sql`
- ✅ Migration: `20251116210300_add_device_specific_fields.sql`

**Services:**
- ✅ Created `deviceAssessmentService.ts` with 8 CRUD functions
- ✅ Existing `assessmentService.ts` handles wound assessments

**Types:**
- ✅ Added `DeviceAssessment`, `CreateDeviceAssessmentInput`, `UpdateDeviceAssessmentInput`
- ✅ Added `IVAssessmentData` interface (15 fields)
- ✅ Added `FoleyAssessmentData` interface (16 fields)
- ✅ Added `FeedingTubeAssessmentData` interface (27 fields)
- ✅ Updated `Device` interface with new optional fields
- ✅ Updated `CreateDeviceInput` and `UpdateDeviceInput`

**Components:**
- ✅ Updated `DeviceForm` with conditional IV/Feeding Tube sections
- ✅ Created `DeviceAssessmentForm` (dynamic router)
- ✅ Created `IVAssessmentFields` (comprehensive IV assessment)
- ✅ Created `FoleyAssessmentFields` (includes CAUTI risk assessment)
- ✅ Created `FeedingTubeAssessmentFields` (placement verification, tolerance)
- ✅ Created `DeviceAssessmentViewer` (JSONB display)
- ✅ Updated `AvatarBoard`:
  - Split assessment state (deviceAssessments vs woundAssessments)
  - Added `handleAddAssessment` to load device before opening modal
  - Added `handleSaveDeviceAssessment` separate from wound save
  - Added `handleViewDeviceAssessment` with viewer modal
  - Fixed type casting in assessment history onClick

**Bug Fixes:**
- ✅ Fixed infinite loop in field components (removed onChange from useEffect deps)
- ✅ Fixed import path in deviceAssessmentService (../../lib/api/supabase)
- ✅ Fixed selectedDevice not loading when clicking "Add Assessment"

**Legacy Cleanup:**
- ✅ Archived old wound-care module to `/archive/wound-care-legacy/`
- ✅ Removed WoundCareModule, WoundCareDashboard, WoundAssessmentForm
- ✅ Archived woundCareService.ts
- ✅ Updated ModularPatientDashboard (removed wound-care card)
- ✅ Updated grid layout (Assessments moved to row 3)
- ✅ Created archive README documenting migration

**Testing:**
- ✅ TypeScript compiles cleanly
- ✅ All device types render correct assessment forms
- ✅ JSONB data saves and displays correctly
- ✅ Student name validation working
- ✅ Assessment history displays for devices and wounds separately

---

### Future Enhancements (Planned)

**Chest Tube Assessment Fields:**
- Suction level (cm H2O)
- Tidaling observed
- Air leak present
- Drainage amount/character
- Dressing status
- Patient comfort

**Closed Suction Drain Assessment Fields:**
- Suction maintained
- Drainage amount/character
- Reservoir emptied
- Output measurement
- Site assessment

**Photo Documentation:**
- Upload photos for wounds/devices
- Store in Supabase Storage
- Display in assessment viewer
- Compare photos over time

**Assessment Templates:**
- Save commonly-used assessment patterns
- Quick-fill for routine assessments
- Customizable per facility

**Debrief Reports:**
- Export student assessment data
- Performance analytics
- Clinical decision tracking
- Competency verification

---

## Quick Reference

### Key File Paths
```
Database Migrations:
  /database/migrations/20251116210200_create_device_assessments_table.sql
  /database/migrations/20251116210300_add_device_specific_fields.sql

Services:
  /src/services/hacmap/deviceAssessmentService.ts
  /src/services/hacmap/assessmentService.ts

Main Components:
  /src/features/hacmap/AvatarBoard.tsx
  /src/features/hacmap/components/AvatarCanvas.tsx
  /src/features/hacmap/forms/DeviceForm.tsx
  /src/features/hacmap/forms/DeviceAssessmentForm.tsx

Assessment Fields:
  /src/features/hacmap/forms/device-assessments/IVAssessmentFields.tsx
  /src/features/hacmap/forms/device-assessments/FoleyAssessmentFields.tsx
  /src/features/hacmap/forms/device-assessments/FeedingTubeAssessmentFields.tsx

Types:
  /src/types/hacmap.ts

Archived (Legacy):
  /archive/wound-care-legacy/
```

### Device Types
- `iv-peripheral` - IV Peripheral Line
- `iv-picc` - PICC Line
- `iv-port` - Port-a-Cath
- `foley` - Foley Catheter
- `feeding-tube` - Feeding Tube (NG, OG, PEG, PEJ, GJ)
- `chest-tube` - Chest Tube
- `closed-suction-drain` - Jackson-Pratt, Hemovac, etc.
- `other` - Other devices

### Measurement Units
- **Length/Width/Depth:** cm (centimeters)
- **Volume/Output:** mL (milliliters)
- **Time:** 24-hour format (HH:MM)
- **Temperature:** Celsius (°C)

### Required Fields
- **Device Placement:** type, location_id, student_name
- **Wound Placement:** wound_type, location_id, entered_by
- **All Assessments:** student_name, assessed_at

---

**End of Technical Documentation**

For questions or updates, contact: haclabs@github.com  
Last reviewed: November 16, 2025
