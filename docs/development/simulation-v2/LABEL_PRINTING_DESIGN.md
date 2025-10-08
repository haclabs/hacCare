# 🏥 Pre-Printing Labels for Simulations - Design Solutions

## 🎯 The Challenge

You need to **pre-print patient and medication labels** BEFORE launching simulations, but currently:
- ❌ New patient IDs are generated at launch time (unknown beforehand)
- ❌ New medication IDs are generated at launch time (unknown beforehand)
- ❌ Can't print labels in advance without knowing these IDs

## 💡 Recommended Solution: **Deterministic ID Generation**

### Approach: Pre-Generate IDs When Creating Template

Instead of generating random IDs at launch, use **deterministic IDs** based on the template.

#### Benefits:
✅ Print labels anytime after template creation
✅ IDs are predictable and repeatable
✅ Each simulation session gets unique IDs
✅ Labels remain valid across multiple launches

---

## 🔧 Implementation Options

### **Option 1: Pre-Allocate IDs in Template Metadata (RECOMMENDED)**

Store future simulation IDs in the template itself.

#### How It Works:
1. **Template Creation**: Generate and store simulation IDs
2. **Label Printing**: Use stored IDs to print labels
3. **Simulation Launch**: Use pre-allocated IDs instead of generating new ones

#### Database Changes:

```sql
-- Add pre-allocated IDs to simulation_templates
ALTER TABLE simulation_templates 
ADD COLUMN simulation_id_mappings jsonb DEFAULT '{}'::jsonb;

-- Structure:
-- {
--   "patients": {
--     "template_patient_uuid_1": "sim_patient_uuid_1",
--     "template_patient_uuid_2": "sim_patient_uuid_2"
--   },
--   "medications": {
--     "template_med_uuid_1": "sim_med_uuid_1",
--     "template_med_uuid_2": "sim_med_uuid_2"
--   }
-- }
```

#### Modified `save_template_snapshot` Function:

```sql
CREATE OR REPLACE FUNCTION save_template_snapshot(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb;
  v_id_mappings jsonb := '{}'::jsonb;
  v_patient_mappings jsonb := '{}'::jsonb;
  v_med_mappings jsonb := '{}'::jsonb;
  v_patient_record record;
  v_med_record record;
  v_new_uuid uuid;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  -- Capture snapshot (existing code)
  v_snapshot := jsonb_build_object(
    'patients', (SELECT COALESCE(json_agg(row_to_json(p.*)), '[]'::json) FROM patients p WHERE p.tenant_id = v_tenant_id),
    'patient_medications', (SELECT COALESCE(json_agg(row_to_json(pm.*)), '[]'::json) FROM patient_medications pm JOIN patients p ON p.id = pm.patient_id WHERE p.tenant_id = v_tenant_id)
  );
  
  -- PRE-GENERATE IDs for future simulations
  FOR v_patient_record IN 
    SELECT id FROM patients WHERE tenant_id = v_tenant_id
  LOOP
    v_new_uuid := gen_random_uuid();
    v_patient_mappings := jsonb_set(
      v_patient_mappings,
      ARRAY[v_patient_record.id::text],
      to_jsonb(v_new_uuid::text)
    );
  END LOOP;
  
  FOR v_med_record IN 
    SELECT pm.id FROM patient_medications pm 
    JOIN patients p ON p.id = pm.patient_id 
    WHERE p.tenant_id = v_tenant_id
  LOOP
    v_new_uuid := gen_random_uuid();
    v_med_mappings := jsonb_set(
      v_med_mappings,
      ARRAY[v_med_record.id::text],
      to_jsonb(v_new_uuid::text)
    );
  END LOOP;
  
  v_id_mappings := jsonb_build_object(
    'patients', v_patient_mappings,
    'medications', v_med_mappings
  );
  
  -- Store mappings in template
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    simulation_id_mappings = v_id_mappings,
    snapshot_version = COALESCE(snapshot_version, 0) + 1,
    updated_at = now()
  WHERE id = p_template_id;
  
  RETURN json_build_object(
    'success', true,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'id_mappings', v_id_mappings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Modified `restore_snapshot_to_tenant` Function:

```sql
CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_target_tenant_id uuid,
  p_snapshot jsonb,
  p_id_mappings jsonb DEFAULT NULL  -- NEW PARAMETER
)
RETURNS void AS $$
DECLARE
  v_record jsonb;
  v_patient_mapping jsonb := COALESCE(p_id_mappings->'patients', '{}'::jsonb);
  v_med_mapping jsonb := COALESCE(p_id_mappings->'medications', '{}'::jsonb);
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_med_id uuid;
  v_new_med_id uuid;
BEGIN
  -- Restore patients using PRE-ALLOCATED IDs
  IF p_snapshot->'patients' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      
      -- Use pre-allocated ID if available, otherwise generate
      IF v_patient_mapping ? v_old_patient_id::text THEN
        v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
      ELSE
        v_new_patient_id := gen_random_uuid();
      END IF;
      
      INSERT INTO patients (
        id,  -- EXPLICITLY SET ID
        tenant_id, patient_id, first_name, last_name, date_of_birth,
        gender, room_number, bed_number, admission_date,
        condition, diagnosis, allergies, blood_type,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        assigned_nurse
      )
      VALUES (
        v_new_patient_id,  -- USE PRE-ALLOCATED ID
        p_target_tenant_id,
        v_record->>'patient_id',
        -- ... rest of values
      );
      
      -- Store mapping for relationships
      v_patient_mapping := jsonb_set(
        v_patient_mapping,
        ARRAY[v_old_patient_id::text],
        to_jsonb(v_new_patient_id::text)
      );
    END LOOP;
  END IF;
  
  -- Similar for medications...
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### **Option 2: Predictable Patient IDs Based on Template ID**

Generate patient IDs using a hash of template_id + original_patient_id.

```sql
-- Generate deterministic UUID
CREATE OR REPLACE FUNCTION generate_simulation_uuid(
  p_template_id uuid,
  p_original_id uuid,
  p_type text  -- 'patient' or 'medication'
)
RETURNS uuid AS $$
BEGIN
  RETURN uuid_generate_v5(
    p_template_id,
    p_type || ':' || p_original_id::text
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### Benefits:
✅ No need to store mappings
✅ Same template always produces same IDs
✅ Can calculate IDs anytime for printing

#### Drawback:
⚠️ Same IDs for every simulation launch from this template
⚠️ May need session-specific variation

---

### **Option 3: Generate IDs at Label Print Time**

Create a separate "print preparation" step before simulation.

```typescript
// Frontend service
async function prepareSimulationLabels(templateId: string): Promise<LabelData> {
  // Call RPC to generate and store IDs
  const { data, error } = await supabase.rpc('prepare_simulation_labels', {
    template_id: templateId
  });
  
  return data; // Returns patient/med IDs for label printing
}
```

```sql
CREATE OR REPLACE FUNCTION prepare_simulation_labels(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_label_data json;
  v_patient_data jsonb;
  v_med_data jsonb;
BEGIN
  -- Generate IDs and return label-ready data
  SELECT json_build_object(
    'patients', json_agg(json_build_object(
      'id', gen_random_uuid(),
      'patient_id', patient_id,
      'name', first_name || ' ' || last_name,
      'dob', date_of_birth,
      'room', room_number
    )),
    'medications', json_agg(json_build_object(
      'id', gen_random_uuid(),
      'medication_name', medication_name,
      'dosage', dosage,
      'patient_name', first_name || ' ' || last_name
    ))
  ) INTO v_label_data
  FROM simulation_templates st
  JOIN ... -- your template data
  WHERE st.id = p_template_id;
  
  -- Store for later use
  UPDATE simulation_templates
  SET simulation_id_mappings = v_label_data::jsonb
  WHERE id = p_template_id;
  
  RETURN v_label_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📋 Workflow Comparison

### Current (Problematic):
1. Create template → 2. Launch simulation → 3. IDs generated ❌ → 4. Can't pre-print labels

### Option 1 (Recommended):
1. Create template → **IDs pre-generated** ✅ → 2. **Print labels anytime** ✅ → 3. Launch simulation (uses stored IDs)

### Option 2:
1. Create template → 2. **Calculate IDs (deterministic)** ✅ → 3. **Print labels** ✅ → 4. Launch simulation (calculates same IDs)

### Option 3:
1. Create template → 2. **"Prepare labels" button** → **IDs generated & stored** ✅ → 3. **Print labels** ✅ → 4. Launch simulation (uses stored IDs)

---

## 🎯 My Recommendation

**Use Option 1** because:
1. ✅ Most flexible - can print labels days/weeks in advance
2. ✅ IDs stored in database (reliable, auditable)
3. ✅ Works with multiple simulation launches from same template
4. ✅ Can regenerate IDs if needed (reprint labels)
5. ✅ Clean separation: template creation → label prep → simulation launch

---

## 🚀 Implementation Steps

1. **Add column**: `simulation_id_mappings` to `simulation_templates`
2. **Update**: `save_template_snapshot()` to pre-generate IDs
3. **Update**: `restore_snapshot_to_tenant()` to use pre-allocated IDs
4. **Add frontend**: "Prepare & Print Labels" button
5. **Create**: Label printing service that reads from `simulation_id_mappings`

---

## 💭 Questions to Consider

1. **Multiple launches**: Do you want same IDs for every launch, or unique per session?
   - Same IDs: Use Option 1, don't regenerate
   - Unique: Generate new mappings before each launch

2. **Label types**: What goes on the labels?
   - Patient wristbands: Name, MRN (patient_id), DOB, allergies
   - Medication labels: Drug name, dosage, patient name, barcode (medication ID)

3. **Barcode format**: How should barcodes be structured?
   - Suggestion: `SIM-P-{patient_uuid}` for patients
   - Suggestion: `SIM-M-{medication_uuid}` for medications

Let me know which approach you prefer, and I can implement it! 🎨

---

## ⚠️ CRITICAL: Multiple Simultaneous Simulations

### The Problem with Pre-Allocated IDs (Option 1)

If you launch **2 simulations from the same template**:
- ❌ Both use the SAME pre-allocated IDs
- ❌ Class A and Class B share labels → CROSS-CONTAMINATION
- ❌ Scanning patient label finds wrong simulation's data

### ✅ Solution: Session-Aware ID Allocation

**Option 4: Pre-Allocate Multiple ID Sets (BEST FOR YOUR USE CASE)**

Store multiple sets of IDs in the template, one per planned simulation session.

#### Database Schema:

```sql
-- Store multiple simulation ID sets
ALTER TABLE simulation_templates 
ADD COLUMN simulation_id_sets jsonb DEFAULT '[]'::jsonb;

-- Structure:
-- [
--   {
--     "session_name": "Class A - Spring 2025",
--     "session_date": "2025-10-15",
--     "id_mappings": {
--       "patients": { "old_id": "new_id_1", ... },
--       "medications": { "old_id": "new_id_1", ... }
--     }
--   },
--   {
--     "session_name": "Class B - Spring 2025",
--     "session_date": "2025-10-15",
--     "id_mappings": {
--       "patients": { "old_id": "new_id_2", ... },
--       "medications": { "old_id": "new_id_2", ... }
--     }
--   }
-- ]
```

#### Modified Workflow:

1. **Create Template** → Save snapshot
2. **Plan Sessions** → Generate ID sets for each planned session
   - "Generate labels for 5 sessions"
   - Each session gets unique IDs
3. **Print Labels** → Print sets for each session (color-coded or labeled)
4. **Launch Simulation** → Select which session to use

#### Implementation:

```sql
-- Generate multiple ID sets at once
CREATE OR REPLACE FUNCTION generate_simulation_id_sets(
  p_template_id uuid,
  p_session_count integer,
  p_session_names text[] DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_id_sets jsonb := '[]'::jsonb;
  v_session_data jsonb;
  v_patient_mappings jsonb;
  v_med_mappings jsonb;
  v_tenant_id uuid;
  v_patient_record record;
  v_med_record record;
  v_new_uuid uuid;
  i integer;
  v_session_name text;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  -- Generate ID sets for each session
  FOR i IN 1..p_session_count LOOP
    v_patient_mappings := '{}'::jsonb;
    v_med_mappings := '{}'::jsonb;
    
    -- Determine session name
    IF p_session_names IS NOT NULL AND i <= array_length(p_session_names, 1) THEN
      v_session_name := p_session_names[i];
    ELSE
      v_session_name := 'Session ' || i;
    END IF;
    
    -- Generate unique IDs for patients
    FOR v_patient_record IN 
      SELECT id FROM patients WHERE tenant_id = v_tenant_id
    LOOP
      v_new_uuid := gen_random_uuid();
      v_patient_mappings := jsonb_set(
        v_patient_mappings,
        ARRAY[v_patient_record.id::text],
        to_jsonb(v_new_uuid::text)
      );
    END LOOP;
    
    -- Generate unique IDs for medications
    FOR v_med_record IN 
      SELECT pm.id FROM patient_medications pm 
      JOIN patients p ON p.id = pm.patient_id 
      WHERE p.tenant_id = v_tenant_id
    LOOP
      v_new_uuid := gen_random_uuid();
      v_med_mappings := jsonb_set(
        v_med_mappings,
        ARRAY[v_med_record.id::text],
        to_jsonb(v_new_uuid::text)
      );
    END LOOP;
    
    -- Build session data
    v_session_data := jsonb_build_object(
      'session_number', i,
      'session_name', v_session_name,
      'created_at', now(),
      'id_mappings', jsonb_build_object(
        'patients', v_patient_mappings,
        'medications', v_med_mappings
      )
    );
    
    -- Add to sets array
    v_id_sets := v_id_sets || jsonb_build_array(v_session_data);
  END LOOP;
  
  -- Store all sets in template
  UPDATE simulation_templates
  SET simulation_id_sets = v_id_sets
  WHERE id = p_template_id;
  
  RETURN json_build_object(
    'success', true,
    'session_count', p_session_count,
    'id_sets', v_id_sets
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Launch Simulation with Specific Session:

```sql
CREATE OR REPLACE FUNCTION launch_simulation(
  p_template_id uuid,
  p_name text,
  p_duration_minutes integer,
  p_participant_user_ids uuid[],
  p_participant_roles text[] DEFAULT NULL,
  p_session_number integer DEFAULT NULL  -- NEW: Which ID set to use
)
RETURNS json AS $$
DECLARE
  v_id_mappings jsonb;
  v_snapshot jsonb;
  v_simulation_id uuid;
  v_new_tenant_id uuid;
BEGIN
  -- Get snapshot
  SELECT snapshot_data, simulation_id_sets
  INTO v_snapshot, v_id_mappings
  FROM simulation_templates
  WHERE id = p_template_id;
  
  -- Select specific session's ID mappings
  IF p_session_number IS NOT NULL THEN
    v_id_mappings := (v_id_mappings->>(p_session_number - 1))::jsonb->'id_mappings';
  ELSE
    RAISE EXCEPTION 'Session number required when multiple ID sets exist';
  END IF;
  
  -- Create tenant, restore snapshot with specific IDs...
  -- (rest of launch logic)
  
  RETURN json_build_object(
    'success', true,
    'simulation_id', v_simulation_id,
    'session_number', p_session_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Frontend Workflow:

```typescript
// 1. Generate ID sets for multiple sessions
await supabase.rpc('generate_simulation_id_sets', {
  template_id: templateId,
  session_count: 5,
  session_names: [
    'Class A - Morning',
    'Class A - Afternoon', 
    'Class B - Morning',
    'Class B - Afternoon',
    'Class C - Morning'
  ]
});

// 2. Print labels for each session
for (let sessionNum = 1; sessionNum <= 5; sessionNum++) {
  await printLabelsForSession(templateId, sessionNum);
}

// 3. Launch specific session
await supabase.rpc('launch_simulation', {
  template_id: templateId,
  name: 'Class A Morning Session',
  duration_minutes: 60,
  participant_user_ids: [...],
  session_number: 1  // Use Session 1 IDs
});
```

---

## 🎨 Label Organization Strategies

### Strategy 1: Color-Coded Labels
- Session 1: Blue labels
- Session 2: Green labels
- Session 3: Yellow labels
- etc.

### Strategy 2: Session Number on Label
```
┌─────────────────────────┐
│ SESSION 1 - CLASS A     │
│ Patient: John Doe       │
│ MRN: P-12345           │
│ [BARCODE]              │
└─────────────────────────┘
```

### Strategy 3: Separate Label Sheets
- Print each session's labels on separate sheets
- Label each sheet: "Session 1 - Class A - Oct 15"

---

## ✅ Final Recommendation for Multiple Simultaneous Simulations

**Use Option 4**: Pre-generate **multiple ID sets** (one per planned session)

**Why this works:**
1. ✅ Each class/session has unique IDs
2. ✅ No cross-contamination between simulations
3. ✅ Print all labels in advance
4. ✅ Launch simulations independently
5. ✅ Clear separation: "Use Session 2 labels for Class B"

**Tradeoff:**
- Need to decide number of sessions upfront
- Can always generate more ID sets later if needed

This solves your multi-class scenario perfectly! 🎓
