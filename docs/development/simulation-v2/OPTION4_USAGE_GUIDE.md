# 🎯 Quick Start: Pre-Printing Labels for Multiple Sessions

## Step 1: Generate ID Sets for Your Planned Sessions

```sql
-- Generate IDs for 5 different simulation sessions
SELECT generate_simulation_id_sets(
  'your-template-id-here'::uuid,
  5,  -- Number of sessions
  ARRAY[
    'Nursing 101 - Section A - Morning',
    'Nursing 101 - Section B - Afternoon',
    'Nursing 201 - Section A - Morning',
    'Nursing 201 - Section B - Afternoon',
    'Advanced Care - Section A'
  ]
);
```

**Result:**
```json
{
  "success": true,
  "session_count": 5,
  "sessions": [
    {
      "session_number": 1,
      "session_name": "Nursing 101 - Section A - Morning",
      "created_at": "2025-10-08T...",
      "patient_count": 8,
      "medication_count": 45,
      "id_mappings": { ... }
    },
    ...
  ]
}
```

---

## Step 2: Get Label Data for Each Session

```sql
-- Get label data for Session 1
SELECT get_simulation_label_data(
  'your-template-id-here'::uuid,
  1  -- Session number
);
```

**Result:**
```json
{
  "session_name": "Nursing 101 - Section A - Morning",
  "session_number": 1,
  "patients": [
    {
      "simulation_id": "uuid-for-this-session",
      "patient_id": "P-12345",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "date_of_birth": "1955-06-15",
      "blood_type": "A+",
      "allergies": ["Penicillin", "Latex"],
      "room_number": "101",
      "bed_number": "A"
    },
    ...
  ],
  "medications": [
    {
      "simulation_id": "uuid-for-this-med",
      "medication_name": "Metformin",
      "dosage": "500mg",
      "route": "PO",
      "frequency": "BID",
      "patient_id": "P-12345",
      "patient_name": "John Doe",
      "room_number": "101"
    },
    ...
  ]
}
```

---

## Step 3: Print Labels for Each Session

### Frontend Service Example:

```typescript
// src/services/simulationLabelService.ts

export async function generateAndPrintAllLabels(
  templateId: string,
  sessionCount: number,
  sessionNames: string[]
) {
  // 1. Generate ID sets
  const { data: idSets, error: genError } = await supabase.rpc(
    'generate_simulation_id_sets',
    {
      template_id: templateId,
      session_count: sessionCount,
      session_names: sessionNames
    }
  );

  if (genError) throw genError;

  console.log(`✅ Generated IDs for ${sessionCount} sessions`);

  // 2. Get label data and print for each session
  for (let sessionNum = 1; sessionNum <= sessionCount; sessionNum++) {
    const { data: labelData, error: labelError } = await supabase.rpc(
      'get_simulation_label_data',
      {
        template_id: templateId,
        session_number: sessionNum
      }
    );

    if (labelError) throw labelError;

    // 3. Print labels (use your existing label printing service)
    await printSessionLabels(labelData, sessionNum);
  }

  return idSets;
}

async function printSessionLabels(labelData: any, sessionNum: number) {
  console.log(`📄 Printing labels for Session ${sessionNum}: ${labelData.session_name}`);
  
  // Print patient wristbands
  for (const patient of labelData.patients) {
    await printPatientLabel({
      sessionNumber: sessionNum,
      sessionName: labelData.session_name,
      patientId: patient.simulation_id,  // Use pre-generated ID
      mrn: patient.patient_id,
      name: patient.full_name,
      dob: patient.date_of_birth,
      bloodType: patient.blood_type,
      allergies: patient.allergies,
      room: patient.room_number,
      bed: patient.bed_number
    });
  }

  // Print medication labels
  for (const med of labelData.medications) {
    await printMedicationLabel({
      sessionNumber: sessionNum,
      medicationId: med.simulation_id,  // Use pre-generated ID
      medicationName: med.medication_name,
      dosage: med.dosage,
      route: med.route,
      frequency: med.frequency,
      patientName: med.patient_name,
      room: med.room_number
    });
  }

  console.log(`✅ Session ${sessionNum} labels printed`);
}
```

---

## Step 4: Launch Simulation with Specific Session

```typescript
// When launching the simulation
const { data, error } = await supabase.rpc('launch_simulation', {
  template_id: templateId,
  name: 'Nursing 101 Section A',
  duration_minutes: 60,
  participant_user_ids: [userId1, userId2],
  participant_roles: ['instructor', 'student'],
  session_number: 1  // 🎯 Use Session 1 IDs (matches printed labels)
});
```

---

## 📋 Complete UI Workflow

### In Your Template Management Page:

```tsx
function TemplateLabelsSection({ template }) {
  const [sessionCount, setSessionCount] = useState(3);
  const [sessionNames, setSessionNames] = useState([
    'Section A - Morning',
    'Section B - Afternoon',
    'Section C - Evening'
  ]);

  const handleGenerateLabels = async () => {
    try {
      // Generate ID sets
      await supabase.rpc('generate_simulation_id_sets', {
        template_id: template.id,
        session_count: sessionCount,
        session_names: sessionNames
      });

      // Open print dialog for each session
      for (let i = 1; i <= sessionCount; i++) {
        const { data } = await supabase.rpc('get_simulation_label_data', {
          template_id: template.id,
          session_number: i
        });

        // Generate PDF and print
        const pdf = await generateLabelPDF(data, i);
        pdf.autoPrint();
        pdf.output('dataurlnewwindow');
      }

      toast.success('Labels generated and ready to print!');
    } catch (error) {
      toast.error('Failed to generate labels');
    }
  };

  return (
    <div className="space-y-4">
      <h3>Pre-Print Labels for Multiple Sessions</h3>
      
      <div>
        <label>Number of Sessions:</label>
        <input 
          type="number" 
          value={sessionCount}
          onChange={(e) => setSessionCount(parseInt(e.target.value))}
          min="1"
          max="10"
        />
      </div>

      <div>
        <label>Session Names:</label>
        {Array.from({ length: sessionCount }).map((_, i) => (
          <input
            key={i}
            value={sessionNames[i] || ''}
            onChange={(e) => {
              const newNames = [...sessionNames];
              newNames[i] = e.target.value;
              setSessionNames(newNames);
            }}
            placeholder={`Session ${i + 1} name`}
          />
        ))}
      </div>

      <button onClick={handleGenerateLabels}>
        🖨️ Generate & Print All Labels
      </button>
    </div>
  );
}
```

### In Your Launch Simulation Page:

```tsx
function LaunchSimulationForm({ template }) {
  const [sessionNumber, setSessionNumber] = useState(1);
  const [availableSessions, setAvailableSessions] = useState([]);

  useEffect(() => {
    // Load available sessions
    if (template.simulation_id_sets) {
      setAvailableSessions(template.simulation_id_sets);
    }
  }, [template]);

  return (
    <form onSubmit={handleLaunch}>
      {/* ... other fields ... */}
      
      <div>
        <label>Select Session (Matching Printed Labels):</label>
        <select 
          value={sessionNumber}
          onChange={(e) => setSessionNumber(parseInt(e.target.value))}
        >
          {availableSessions.map((session, idx) => (
            <option key={idx} value={session.session_number}>
              Session {session.session_number}: {session.session_name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500">
          ⚠️ Use labels printed for this session only!
        </p>
      </div>

      <button type="submit">
        🚀 Launch Simulation
      </button>
    </form>
  );
}
```

---

## 🎨 Label Design Examples

### Patient Wristband Label (2.5" x 1"):

```
┌─────────────────────────────────────┐
│ SESSION 1 - NURSING 101 SEC A      │
│                                     │
│ JOHN DOE                           │
│ MRN: P-12345      DOB: 06/15/1955  │
│ Room: 101-A       Blood: A+        │
│ ⚠️ Allergies: Penicillin, Latex    │
│                                     │
│ [████▌██▌█████▌██]                │
│                                     │
└─────────────────────────────────────┘
```

### Medication Label (3" x 2"):

```
┌─────────────────────────────────────┐
│ SESSION 1                          │
│                                     │
│ METFORMIN 500mg                    │
│ Route: PO        Frequency: BID    │
│                                     │
│ Patient: JOHN DOE                  │
│ Room: 101-A                        │
│                                     │
│ [████▌██▌█████▌██]                │
│                                     │
│ ⚠️ Scan before administration      │
└─────────────────────────────────────┘
```

---

## ✅ Benefits

1. **Print once, use multiple times** - Generate labels days/weeks before simulation
2. **No ID conflicts** - Each session has completely unique IDs
3. **Color coding** - Print each session in different colored labels
4. **Clear organization** - Session name on every label
5. **Run simultaneous simulations** - No cross-contamination between classes

---

## 🚀 Next Steps

1. **Run the SQL**: Execute `implement_option4_label_printing.sql`
2. **Update restore function**: Make sure it uses the pre-allocated IDs
3. **Test with 2 sessions**: Generate IDs, print labels, launch both
4. **Integrate into UI**: Add "Generate Labels" button to template page

Want me to update the `restore_snapshot_to_tenant` function next to properly use the pre-allocated IDs? 🎯
