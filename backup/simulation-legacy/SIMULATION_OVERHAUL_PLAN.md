# 🚨 URGENT: Simulation System Overhaul Plan

## Priority 1: FIX RESET FUNCTION (CRITICAL - BLOCKS DEMO)

### Problem
Current `reset_simulation` function:
- ❌ Deletes medications not in template (lost printed labels!)
- ❌ Deletes vitals not in template
- ❌ Meant for "exact template restore" - WRONG for classroom use

### Required Behavior
Reset should:
- ✅ **PRESERVE ALL patient IDs** (labels remain valid)
- ✅ **PRESERVE ALL medication IDs** (labels remain valid)
- ✅ **KEEP added medications** (instructor adds meds during session)
- ✅ **CLEAR vitals** (student work - needs fresh start)
- ✅ **CLEAR notes** (student work - needs fresh start)
- ✅ **CLEAR BCMA records** (student work - needs fresh start)
- ✅ **RESET patient data** to template values (demographics, diagnosis)
- ✅ **RESET medication data** to template values (dosage, frequency)

### Implementation
Create TWO reset functions:

1. **`reset_simulation_for_next_session`** (DEFAULT - what instructors need)
   - Preserves patient/medication IDs
   - Clears student work (vitals, notes, BCMA)
   - Resets data to template defaults
   - **DOES NOT delete medications**

2. **`reset_simulation_to_template_exact`** (Nuclear option)
   - Complete wipe and restore
   - Only use when starting fresh with new scenario
   - Would require reprinting labels

---

## Priority 2: HAMMER OUT DATABASE SCHEMA

### Current Schema Issues
1. ❌ Confusion: When is snapshot taken? What's included?
2. ❌ Guesswork: What fields are in snapshot vs computed?
3. ❌ Inconsistent: Different tables have different rules

### Definitive Schema

#### `simulation_templates` Table
```sql
CREATE TABLE simulation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  
  -- SNAPSHOT DATA (JSONB)
  snapshot_data jsonb NOT NULL,
  /*
  snapshot_data structure:
  {
    "patients": [
      {
        "patient_id": "PT12345",  // User-visible ID
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1990-01-01",
        "gender": "Male",
        "room_number": "101",
        "bed_number": "A",
        "diagnosis": "Pneumonia",
        "condition": "Stable",
        "allergies": [],
        "code_status": "Full Code",
        // ... all patient fields from template
      }
    ],
    "medications": [
      {
        "patient_id": "PT12345",  // Links to patient
        "name": "Amoxicillin",
        "dosage": "500mg",
        "route": "PO",
        "frequency": "TID",
        "instructions": "Take with food",
        "prescribed_by": "Dr. Smith"
        // ... all medication fields
      }
    ],
    "vitals": [
      {
        "patient_id": "PT12345",
        "temperature": 98.6,
        "heart_rate": 72,
        "blood_pressure_systolic": 120,
        "blood_pressure_diastolic": 80,
        "recorded_at": "2025-10-25T08:00:00Z",
        "recorded_by": "Instructor"
      }
    ],
    "notes": [
      {
        "patient_id": "PT12345",
        "note_type": "admission",
        "content": "Patient admitted with...",
        "created_by": "Instructor"
      }
    ],
    "labs": [
      {
        "patient_id": "PT12345",
        "test_name": "CBC",
        "result_value": "12.5",
        "unit": "g/dL",
        "reference_range": "12-16",
        "status": "final"
      }
    ],
    "doctors_orders": [
      {
        "patient_id": "PT12345",
        "order_type": "medication",
        "order_details": "Start IV antibiotics",
        "ordered_by": "Dr. Smith"
      }
    ]
  }
  */
  
  snapshot_version integer DEFAULT 2,
  snapshot_taken_at timestamptz NOT NULL DEFAULT now(),
  
  -- Template settings
  default_duration_minutes integer DEFAULT 120,
  auto_cleanup_after_hours integer DEFAULT 24,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### `simulation_active` Table
```sql
CREATE TABLE simulation_active (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES simulation_templates(id),
  
  name text NOT NULL,  -- Display name for this instance
  status text NOT NULL DEFAULT 'running',  -- running, paused, completed
  
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  
  -- Session tracking (for classroom use)
  session_number integer DEFAULT 1,
  last_reset_at timestamptz,  -- When was last reset?
  reset_count integer DEFAULT 0,  -- How many times reset?
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)  -- One active simulation per tenant
);
```

### What Gets Snapshotted?

**ALWAYS INCLUDED:**
- ✅ Patients (all demographics, diagnosis, etc.)
- ✅ Medications (all prescriptions)
- ✅ Initial vitals (baseline readings)
- ✅ Initial notes (admission notes, etc.)
- ✅ Labs (initial results)
- ✅ Doctor's orders (initial orders)

**NEVER INCLUDED:**
- ❌ User assignments (who's in the sim)
- ❌ Activity logs (actions taken during sim)
- ❌ BCMA records (medication admin during sim)
- ❌ Images uploaded during sim
- ❌ Wound assessments added during sim

---

## Priority 3: PRESERVE IDS FOREVER

### Rule: IDs Never Change for Active Simulations

```sql
-- When creating active simulation from template:
1. Generate patient UUIDs once
2. Generate medication UUIDs once
3. Store these in the active simulation tenant
4. NEVER regenerate these IDs until simulation is deleted

-- When resetting for next session:
1. Keep ALL existing patient IDs
2. Keep ALL existing medication IDs
3. Clear student work (vitals, notes, BCMA)
4. Update patient/medication data to template defaults
```

### Implementation: Track Original IDs

Add to `simulation_active`:
```sql
ALTER TABLE simulation_active ADD COLUMN IF NOT EXISTS
  original_snapshot jsonb;  -- Store original ID mappings

/*
original_snapshot structure:
{
  "patient_id_map": {
    "PT12345": "uuid-abc-123",  // patient_id -> UUID mapping
    "PT67890": "uuid-def-456"
  },
  "medication_id_map": {
    "Amoxicillin-PT12345": "uuid-med-123",  // medication+patient -> UUID
    "Tylenol-PT12345": "uuid-med-456"
  }
}
*/
```

---

## Priority 4: INSTRUCTOR METRICS & DEBRIEF

### Current Gaps
- Limited activity logging
- No aggregated metrics
- Hard to see what students did

### Enhanced Metrics to Track

#### Per-Student Metrics
```sql
CREATE TABLE simulation_student_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulation_active(id),
  student_id uuid REFERENCES auth.users(id),
  
  -- Time metrics
  time_in_simulation interval,
  first_action_at timestamptz,
  last_action_at timestamptz,
  
  -- Action counts
  vitals_recorded integer DEFAULT 0,
  medications_administered integer DEFAULT 0,
  notes_written integer DEFAULT 0,
  charts_reviewed integer DEFAULT 0,
  
  -- Clinical accuracy
  correct_medications integer DEFAULT 0,
  incorrect_medications integer DEFAULT 0,
  missed_critical_vitals integer DEFAULT 0,
  
  -- BCMA specific
  right_patient integer DEFAULT 0,
  right_drug integer DEFAULT 0,
  right_dose integer DEFAULT 0,
  right_route integer DEFAULT 0,
  right_time integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Aggregate Simulation Metrics
```sql
CREATE TABLE simulation_debrief_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulation_active(id),
  
  -- Overall performance
  total_students integer,
  average_completion_time interval,
  
  -- Common issues (JSONB array)
  common_errors jsonb,  -- [{type: "wrong_dose", count: 5, patients: ["PT123"]}]
  critical_misses jsonb,  -- [{type: "critical_vital", patient: "PT123", time: "..."}]
  
  -- Timeline of events
  event_timeline jsonb,  -- [{time: "...", student: "...", action: "...", patient: "..."}]
  
  -- Goals achieved
  learning_objectives jsonb,  -- [{objective: "...", achieved_by: ["student1"], missed_by: ["student2"]}]
  
  generated_at timestamptz DEFAULT now()
);
```

### Debrief Dashboard Features

1. **Timeline View**
   - See all actions in chronological order
   - Filter by student, patient, action type
   - Highlight critical moments (errors, critical vitals, etc.)

2. **Student Comparison**
   - Side-by-side student metrics
   - Who completed tasks faster?
   - Who made errors?

3. **Learning Objectives Tracker**
   - Define objectives per template
   - Auto-track if students met objectives
   - Generate completion report

4. **Export Report**
   - PDF summary for each student
   - CSV data for grading
   - Screenshots of critical moments

---

## Priority 5: STYLING CONSISTENCY

### Current Issue
- Labs: Clean, uniform styling
- Doctor's Orders: Blue band, inconsistent

### Fix: Unified Component Styling

Create base component styles:

```typescript
// src/components/UI/ClinicalCard.tsx
export const ClinicalCardHeader = ({ 
  title, 
  icon, 
  color = 'blue' 
}: ClinicalCardHeaderProps) => {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className={`${colors[color]} text-white px-6 py-4 rounded-t-lg`}>
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
    </div>
  );
};
```

Apply to:
- ✅ Labs
- ✅ Doctor's Orders  
- ✅ Medications
- ✅ Vitals
- ✅ Notes

---

## Priority 6: DEVELOPMENT WORKFLOW

### Current Pain Points
1. ❌ Manual SQL execution in Supabase dashboard
2. ❌ Schema changes require multiple steps
3. ❌ No single source of truth for schema

### Proposed Solution: Schema Management System

#### Option A: Migration Runner (Simple)
Create a script that runs migrations:

```typescript
// scripts/run-migrations.ts
import { supabase } from '../src/lib/api/supabase';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const migrations = fs.readdirSync('database/migrations')
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of migrations) {
    console.log(`Running: ${file}`);
    const sql = fs.readFileSync(
      path.join('database/migrations', file), 
      'utf8'
    );
    
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
    if (error) {
      console.error(`Failed: ${file}`, error);
      break;
    }
    console.log(`✅ ${file}`);
  }
}

runMigrations();
```

#### Option B: Supabase CLI (Better)
Even without local Supabase, you can use CLI to:

```bash
# Link to your cloud project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run migrations (pushes to cloud)
npx supabase db push

# Generate TypeScript types from schema
npx supabase gen types typescript --linked > src/types/database.ts
```

#### Option C: Schema Documentation (Minimum)
Create definitive schema docs:

```markdown
# database/SCHEMA.md

## Tables

### patients
- id: uuid PRIMARY KEY
- patient_id: text UNIQUE (user-visible ID like "PT12345")
- first_name: text NOT NULL
- last_name: text NOT NULL
...
```

---

## IMMEDIATE ACTION ITEMS

### TODAY (Before Next Demo)
1. ✅ Create `reset_simulation_for_next_session` function
2. ✅ Test with your current simulation
3. ✅ Verify medication IDs persist
4. ✅ Deploy to production

### THIS WEEK
1. ⏳ Implement ID tracking in simulation_active
2. ⏳ Add session_number tracking
3. ⏳ Fix Doctor's Orders styling
4. ⏳ Create basic debrief metrics

### NEXT SPRINT
1. ⏳ Full debrief dashboard
2. ⏳ Learning objectives tracking
3. ⏳ Student performance reports
4. ⏳ Migration runner script

---

## Questions for You

1. **Reset behavior**: Confirm you want to KEEP medications added during session?
2. **Vitals**: Clear all vitals on reset, or keep template vitals + student vitals?
3. **Debrief**: What specific metrics matter most for your debriefs?
4. **Simulations**: How long does a typical simulation run? (hours/days/weeks?)
5. **Students**: How many students per simulation typically?

Let me know and I'll start implementing immediately! 🚀
