# Simulation Data Architecture - Design Proposal

## Problem Statement

**Current Challenge:**
- Simulations currently write student actions (vitals, medications, notes) to the production database
- Risk of data pollution in production tables
- Need to capture all actions for debrief reports
- Adding new features requires duplicating code for simulation mode
- Debugging complexity increases with dual-mode logic

**Key Requirements:**
1. ✅ Student data should NOT pollute production database
2. ✅ All student actions must be recorded for debrief reports
3. ✅ Minimize code duplication (DRY principle)
4. ✅ New features should work in both modes without extra work
5. ✅ Maintain separation between simulation and production

---

## Solution Options Analysis

### Option 1: Full Simulation Mode Flag (Current Approach)

**How It Works:**
```typescript
// In every service
if (isSimulationMode) {
  // Use in-memory store
  simulationStore.addVitals(data);
} else {
  // Use database
  await supabase.from('patient_vitals').insert(data);
}
```

**✅ Pros:**
- Complete separation of simulation and production data
- No risk of database pollution
- Fast (in-memory operations)
- No database schema changes needed

**❌ Cons:**
- **Major Duplication:** Every service needs dual logic
- **High Maintenance:** Adding new features requires updating 2 code paths
- **Testing Overhead:** Must test both modes for every feature
- **Memory Risk:** Data lost if server/browser crashes
- **Scaling Issues:** Memory-based stores don't scale to multiple sessions

**Current Implementation:**
- ✅ Already implemented for: Alerts (simulationAlertStore.ts)
- ❌ Not implemented for: Vitals, Medications, Notes, Assessments, Lab Results, etc.

**Example from Current Code:**
```typescript
// alertService.ts - Already doing this
let isSimulationMode = false;

export const createAlert = async (alert: Omit<Alert, 'id'>) => {
  if (isSimulationMode) {
    simulationAlertStore.addAlert({ ...alert, id: generateId() });
    return;
  }
  
  // Production database code
  await supabase.from('patient_alerts').insert(alert);
};
```

---

### Option 2: Separate Simulation Tables (Hybrid Approach)

**How It Works:**
```typescript
// Automatic table routing based on tenant type
function getTableName(baseName: string, tenantType?: string) {
  if (tenantType === 'simulation_active') {
    return `simulation_${baseName}`;
  }
  return baseName;
}

// Usage - NO CHANGES to service code
await supabase
  .from(getTableName('patient_vitals', currentTenant.tenant_type))
  .insert(vitals);
```

**Database Schema:**
```sql
-- Production tables (existing)
patient_vitals
patient_medications
patient_notes
patient_assessments

-- Simulation tables (mirror structure)
simulation_vitals
simulation_medications
simulation_notes
simulation_assessments
```

**✅ Pros:**
- **Zero Code Duplication:** Services unchanged
- **Automatic Routing:** One line change in supabase wrapper
- **Database Persistence:** Survives crashes/refreshes
- **Real Database Features:** Queries, joins, transactions work normally
- **Easy Cleanup:** Drop simulation tables after session
- **Scalable:** Works with multiple concurrent simulations

**❌ Cons:**
- Schema duplication (but automated with migrations)
- Slightly more storage (but temporary data)
- Need cleanup process (but can be automated)

---

### Option 3: Tenant-Based Isolation (Cleanest Architecture)

**How It Works:**
```typescript
// NO CHANGES to service code at all!
// RLS policies handle everything

// The simulation tenant IS a real tenant
// Data goes to same tables but filtered by tenant_id
await supabase.from('patient_vitals').insert({
  ...vitals,
  tenant_id: currentTenant.id // Simulation tenant ID
});
```

**Database Setup:**
```sql
-- RLS policies already filter by tenant_id
CREATE POLICY "Users can view their tenant's vitals"
  ON patient_vitals FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Cleanup after simulation
DELETE FROM patient_vitals WHERE tenant_id = 'simulation_tenant_123';
DELETE FROM patient_medications WHERE tenant_id = 'simulation_tenant_123';
-- etc.
```

**✅ Pros:**
- **ZERO Code Changes:** Works immediately
- **True Multi-Tenancy:** Simulations ARE tenants
- **All Features Work:** Any new feature automatically supports simulations
- **Database Persistence:** Survives crashes
- **Efficient Cleanup:** Delete by tenant_id
- **Scalable:** Unlimited concurrent simulations
- **Real Data Relationships:** Foreign keys, joins, transactions work

**❌ Cons:**
- Simulation data temporarily in production tables (but isolated by RLS)
- Need robust cleanup process
- Requires cleanup monitoring

---

## Recommended Solution: **Option 3** (Tenant-Based Isolation)

### Why This is Best

**1. Zero Code Duplication**
```typescript
// Current code - works for BOTH production AND simulation
export const addVitals = async (patientId: string, vitals: VitalSigns) => {
  const { data, error } = await supabase
    .from('patient_vitals')
    .insert({
      patient_id: patientId,
      ...convertVitals(vitals)
    });
  
  if (error) throw error;
  return data;
};

// ✅ This ALREADY works for simulations!
// ✅ tenant_id is set by RLS policy automatically
// ✅ No changes needed!
```

**2. All Features Work Immediately**
```typescript
// Add a new feature - handover reports
export const createHandoverReport = async (data: HandoverReport) => {
  return await supabase.from('handover_reports').insert(data);
};

// ✅ Works in simulation mode automatically!
// ✅ No additional simulation code needed!
// ✅ No testing two code paths!
```

**3. Debrief Reports Are Simple**
```typescript
export const generateDebriefReport = async (simulationTenantId: string) => {
  // Query all student actions for this simulation
  const vitals = await supabase
    .from('patient_vitals')
    .select('*')
    .eq('tenant_id', simulationTenantId)
    .order('recorded_at');
    
  const medications = await supabase
    .from('medication_administrations')
    .select('*')
    .eq('tenant_id', simulationTenantId)
    .order('timestamp');
    
  const notes = await supabase
    .from('patient_notes')
    .select('*')
    .eq('tenant_id', simulationTenantId);
  
  // Build comprehensive report
  return {
    simulation_id: simulationTenantId,
    vitals_recorded: vitals,
    medications_administered: medications,
    clinical_notes: notes,
    // ... all data preserved!
  };
};
```

---

## Implementation Plan

### Phase 1: Verify Current State ✅

**Check if this already works:**
1. Simulations already use simulation tenants (✅ Yes - created by copy_template_to_simulation)
2. All tables have tenant_id column (✅ Yes - multi-tenant architecture)
3. RLS policies filter by tenant_id (✅ Yes - existing policies)

**Conclusion:** This might ALREADY work! We just need to verify and add cleanup.

---

### Phase 2: Test Current Behavior

**Test Script:**
```typescript
// Test if vitals are isolated to simulation tenant
async function testSimulationIsolation() {
  // 1. Enter simulation (tenant switches to simulation tenant)
  await enterSimulationTenant('sim-tenant-123');
  
  // 2. Record vitals
  await addVitals('PT12345', {
    temperature: 98.6,
    heartRate: 72,
    // ...
  });
  
  // 3. Check database
  const { data } = await supabase
    .from('patient_vitals')
    .select('*, tenant_id')
    .eq('patient_id', 'PT12345');
  
  console.log('Vitals tenant_id:', data[0].tenant_id);
  // Should be: sim-tenant-123
  
  // 4. Exit simulation (switch back to production tenant)
  await exitSimulationTenant();
  
  // 5. Query vitals again
  const { data: prodData } = await supabase
    .from('patient_vitals')
    .select('*')
    .eq('patient_id', 'PT12345');
  
  console.log('Production vitals:', prodData);
  // Should be: [] (empty - RLS filtered out simulation data)
}
```

**Expected Result:**
- ✅ Simulation vitals have simulation tenant_id
- ✅ Production queries don't see simulation data
- ✅ Simulation queries only see simulation data

**If this works:** We're 90% done! Just need cleanup.

**If this doesn't work:** We need to check RLS policies and tenant_id propagation.

---

### Phase 3: Add Automatic Cleanup

**Cleanup Service:**
```typescript
// lib/simulationCleanupService.ts

export async function scheduleSimulationCleanup(
  simulationId: string,
  tenantId: string,
  cleanupAt: Date
) {
  await supabase.from('simulation_active').update({
    auto_cleanup_at: cleanupAt.toISOString()
  }).eq('id', simulationId);
}

export async function cleanupSimulationData(tenantId: string) {
  console.log(`🧹 Cleaning up simulation data for tenant: ${tenantId}`);
  
  // Get counts for debrief report BEFORE deletion
  const stats = await getSimulationStats(tenantId);
  
  // Delete in correct order (respect foreign keys)
  const tables = [
    'medication_administrations',
    'patient_medications',
    'patient_vitals',
    'patient_notes',
    'patient_assessments',
    'lab_results',
    'imaging_orders',
    'patient_alerts',
    'handover_reports',
    'diabetic_records',
    'bowel_records',
    // ... all patient data tables
  ];
  
  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete()
      .eq('tenant_id', tenantId);
    
    if (error) {
      console.error(`Error cleaning ${table}:`, error);
    } else {
      console.log(`✅ Deleted ${count} records from ${table}`);
    }
  }
  
  // Delete patients
  await supabase.from('patients').delete().eq('tenant_id', tenantId);
  
  // Mark simulation as cleaned
  await supabase.from('simulation_active').update({
    status: 'completed',
    data_cleaned_at: new Date().toISOString()
  }).eq('tenant_id', tenantId);
  
  console.log('✅ Simulation cleanup complete');
  return stats;
}

export async function getSimulationStats(tenantId: string) {
  // Get counts of all actions for debrief report
  const vitalsCount = await supabase
    .from('patient_vitals')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
    
  const medsCount = await supabase
    .from('medication_administrations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  
  // ... get all counts
  
  return {
    vitals_recorded: vitalsCount.count || 0,
    medications_administered: medsCount.count || 0,
    // ...
  };
}
```

**Database Function for Cleanup:**
```sql
-- Function to cleanup simulation data
CREATE OR REPLACE FUNCTION cleanup_simulation_data(p_tenant_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  -- Collect statistics first
  v_stats := jsonb_build_object(
    'vitals_count', (SELECT COUNT(*) FROM patient_vitals WHERE tenant_id = p_tenant_id),
    'medications_count', (SELECT COUNT(*) FROM medication_administrations WHERE tenant_id = p_tenant_id),
    'notes_count', (SELECT COUNT(*) FROM patient_notes WHERE tenant_id = p_tenant_id)
  );
  
  -- Delete data (in correct order)
  DELETE FROM medication_administrations WHERE tenant_id = p_tenant_id;
  DELETE FROM patient_medications WHERE tenant_id = p_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = p_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = p_tenant_id;
  DELETE FROM patient_assessments WHERE tenant_id = p_tenant_id;
  DELETE FROM patients WHERE tenant_id = p_tenant_id;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Phase 4: Debrief Report Generation

**Generate Report BEFORE Cleanup:**
```typescript
// lib/simulationDebriefService.ts

export async function generateDebriefReport(simulationId: string, tenantId: string) {
  console.log('📊 Generating debrief report for simulation:', simulationId);
  
  // Get simulation details
  const { data: simulation } = await supabase
    .from('simulation_active')
    .select('*, simulation_templates(*)')
    .eq('id', simulationId)
    .single();
  
  // Get all student actions
  const vitals = await supabase
    .from('patient_vitals')
    .select('*, patients(patient_id, first_name, last_name)')
    .eq('tenant_id', tenantId)
    .order('recorded_at');
  
  const medications = await supabase
    .from('medication_administrations')
    .select(`
      *,
      patient_medications(name, dosage, route),
      patients(patient_id, first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .order('timestamp');
  
  const notes = await supabase
    .from('patient_notes')
    .select('*, patients(patient_id, first_name, last_name)')
    .eq('tenant_id', tenantId)
    .order('created_at');
  
  const alerts = await supabase
    .from('patient_alerts')
    .select('*, patients(patient_id, first_name, last_name)')
    .eq('tenant_id', tenantId)
    .order('created_at');
  
  // Calculate metrics
  const metrics = {
    total_vitals: vitals.data?.length || 0,
    total_medications: medications.data?.length || 0,
    total_notes: notes.data?.length || 0,
    total_alerts: alerts.data?.length || 0,
    alerts_acknowledged: alerts.data?.filter(a => a.acknowledged).length || 0,
    critical_alerts_missed: alerts.data?.filter(
      a => a.severity === 'critical' && !a.acknowledged
    ).length || 0
  };
  
  // Create timeline
  const timeline = createSimulationTimeline({
    vitals: vitals.data || [],
    medications: medications.data || [],
    notes: notes.data || [],
    alerts: alerts.data || []
  });
  
  // Store report in database
  const report = {
    simulation_id: simulationId,
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    simulation_name: simulation?.name,
    template_name: simulation?.simulation_templates?.name,
    duration: calculateDuration(simulation?.starts_at, simulation?.ends_at),
    metrics,
    timeline,
    vitals_data: vitals.data,
    medication_data: medications.data,
    notes_data: notes.data,
    alerts_data: alerts.data
  };
  
  const { data, error } = await supabase
    .from('simulation_debrief_reports')
    .insert(report)
    .select()
    .single();
  
  if (error) throw error;
  
  console.log('✅ Debrief report generated:', data.id);
  return data;
}

function createSimulationTimeline(data: any) {
  const events = [];
  
  // Add vitals to timeline
  data.vitals.forEach(v => {
    events.push({
      timestamp: v.recorded_at,
      type: 'vital_signs',
      description: `Vitals recorded for ${v.patients.first_name}`,
      data: v
    });
  });
  
  // Add medications
  data.medications.forEach(m => {
    events.push({
      timestamp: m.timestamp,
      type: 'medication',
      description: `${m.patient_medications.name} administered`,
      data: m
    });
  });
  
  // Add notes
  data.notes.forEach(n => {
    events.push({
      timestamp: n.created_at,
      type: 'note',
      description: `${n.note_type} note added`,
      data: n
    });
  });
  
  // Add alerts
  data.alerts.forEach(a => {
    events.push({
      timestamp: a.created_at,
      type: 'alert',
      description: `${a.severity} alert: ${a.message}`,
      data: a
    });
  });
  
  // Sort by timestamp
  return events.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
```

**Database Table for Debrief Reports:**
```sql
CREATE TABLE simulation_debrief_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulation_active(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  simulation_name TEXT,
  template_name TEXT,
  duration_minutes INTEGER,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  vitals_data JSONB,
  medication_data JSONB,
  notes_data JSONB,
  alerts_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE simulation_debrief_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can view debrief reports"
  ON simulation_debrief_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM simulation_participants
      WHERE simulation_participants.simulation_id = simulation_debrief_reports.simulation_id
      AND simulation_participants.user_id = auth.uid()
    )
  );
```

---

### Phase 5: Automated Cleanup Process

**Cleanup on Simulation End:**
```typescript
// When instructor ends simulation
export async function endSimulation(simulationId: string) {
  const { data: simulation } = await supabase
    .from('simulation_active')
    .select('*, tenants(*)')
    .eq('id', simulationId)
    .single();
  
  if (!simulation) throw new Error('Simulation not found');
  
  // 1. Generate debrief report FIRST (before cleanup)
  console.log('📊 Generating debrief report...');
  await generateDebriefReport(simulationId, simulation.tenant_id);
  
  // 2. Update simulation status
  await supabase.from('simulation_active').update({
    status: 'completed',
    ends_at: new Date().toISOString()
  }).eq('id', simulationId);
  
  // 3. Schedule cleanup (give instructors time to review)
  const cleanupTime = new Date();
  cleanupTime.setHours(cleanupTime.getHours() + 24); // Cleanup after 24 hours
  
  await scheduleSimulationCleanup(simulationId, simulation.tenant_id, cleanupTime);
  
  console.log('✅ Simulation ended. Data will be cleaned up at:', cleanupTime);
}
```

**Background Job (Supabase Edge Function):**
```typescript
// supabase/functions/cleanup-simulations/index.ts

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Find simulations ready for cleanup
  const { data: simulations } = await supabase
    .from('simulation_active')
    .select('id, tenant_id')
    .eq('status', 'completed')
    .not('data_cleaned_at', 'is', null)
    .lte('auto_cleanup_at', new Date().toISOString());
  
  if (!simulations || simulations.length === 0) {
    return new Response('No simulations to clean up', { status: 200 });
  }
  
  const results = [];
  for (const sim of simulations) {
    try {
      const stats = await cleanupSimulationData(sim.tenant_id);
      results.push({ simulation_id: sim.id, status: 'cleaned', stats });
    } catch (error) {
      results.push({ simulation_id: sim.id, status: 'error', error: error.message });
    }
  }
  
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Benefits of This Architecture

### 1. Zero Code Duplication

**Before (Option 1 - Memory Store):**
```typescript
// medicationService.ts - 200 lines
export const recordMedicationAdministration = async (admin: MedicationAdministration) => {
  if (isSimulationMode) {
    // 50 lines of simulation logic
    simulationMedicationStore.add(admin);
  } else {
    // 50 lines of production logic
    await supabase.from('medication_administrations').insert(admin);
  }
};

// vitalService.ts - 150 lines
export const addVitals = async (vitals: VitalSigns) => {
  if (isSimulationMode) {
    // 40 lines of simulation logic
    simulationVitalStore.add(vitals);
  } else {
    // 40 lines of production logic
    await supabase.from('patient_vitals').insert(vitals);
  }
};

// noteService.ts - 180 lines
// ... same duplication

// Total: ~1000+ lines of duplicated logic
```

**After (Option 3 - Tenant Isolation):**
```typescript
// medicationService.ts - 100 lines (no duplication!)
export const recordMedicationAdministration = async (admin: MedicationAdministration) => {
  await supabase.from('medication_administrations').insert(admin);
  // ✅ Works for both production AND simulation!
  // ✅ tenant_id automatically set by RLS
};

// vitalService.ts - 75 lines (no duplication!)
export const addVitals = async (vitals: VitalSigns) => {
  await supabase.from('patient_vitals').insert(vitals);
  // ✅ Works for both production AND simulation!
};

// Total: ~500 lines (50% reduction!)
```

### 2. New Features Work Immediately

**Add handover reports feature:**
```typescript
// NEW FEATURE - no simulation-specific code needed!
export const createHandoverReport = async (report: HandoverReport) => {
  return await supabase.from('handover_reports').insert(report);
};

// ✅ Works in production
// ✅ Works in simulations
// ✅ Data isolated by tenant_id
// ✅ Zero extra work!
```

### 3. Debrief Reports Are Comprehensive

```typescript
// Query ALL student actions
const debriefData = await supabase
  .rpc('get_simulation_debrief', { tenant_id: 'sim-123' });

// Returns:
// {
//   vitals: [...],           // All vitals recorded
//   medications: [...],      // All medications administered
//   notes: [...],           // All clinical notes
//   alerts: [...],          // All alerts triggered/acknowledged
//   assessments: [...],     // All assessments completed
//   labs: [...],            // All lab orders
//   imaging: [...],         // All imaging orders
//   handovers: [...]        // All handover reports
// }

// ✅ Complete record of simulation
// ✅ Nothing lost
// ✅ Real database queries
```

### 4. Debugging Is Simple

**No dual code paths:**
```typescript
// Production bug: Medication not recording
// Test fix in production

// ✅ Same code runs in simulation
// ✅ Fix applies to both automatically
// ✅ No separate simulation debugging needed
```

---

## Migration Path

### Step 1: Verify Current Behavior (1 day)

```bash
# Test if tenant isolation already works
1. Enter simulation
2. Record vitals/medications
3. Check if tenant_id is set correctly
4. Exit simulation
5. Verify production queries don't see simulation data
```

### Step 2: Add Cleanup Service (2 days)

```bash
1. Create cleanupSimulationData function
2. Create generateDebriefReport function
3. Add simulation_debrief_reports table
4. Test cleanup process
```

### Step 3: Remove Simulation Mode Code (1 day)

```bash
# If tenant isolation works, we can remove:
1. simulationAlertStore.ts (not needed!)
2. setSimulationMode() logic (not needed!)
3. if (isSimulationMode) branches (not needed!)

# Keep simple services that already work
```

### Step 4: Add Automated Cleanup (1 day)

```bash
1. Create Supabase Edge Function
2. Setup cron job (runs daily)
3. Test automated cleanup
```

---

## Recommendation

**Start with Step 1:** Test if tenant isolation already works!

If it does, we're 90% done and can remove complexity instead of adding it.

**Test Script:**
```typescript
// Quick test
async function testTenantIsolation() {
  // Get current tenant
  const prodTenant = getCurrentTenant();
  console.log('Production tenant:', prodTenant.id);
  
  // Enter simulation
  await enterSimulationTenant('sim-tenant-123');
  const simTenant = getCurrentTenant();
  console.log('Simulation tenant:', simTenant.id);
  
  // Record vitals
  await addVitals('PT12345', {
    temperature: 98.6,
    heartRate: 72,
    bloodPressure: { systolic: 120, diastolic: 80 }
  });
  
  // Query database directly
  const { data } = await supabase
    .from('patient_vitals')
    .select('*, tenant_id')
    .order('recorded_at', { ascending: false })
    .limit(1);
  
  console.log('Latest vital tenant_id:', data[0].tenant_id);
  console.log('Matches simulation tenant?', data[0].tenant_id === simTenant.id);
  
  // Exit simulation
  await exitSimulationTenant();
  
  // Try to query same vital from production context
  const { data: prodData } = await supabase
    .from('patient_vitals')
    .select('*')
    .eq('id', data[0].id);
  
  console.log('Visible in production?', prodData.length > 0);
  // Should be: false (RLS should filter it out)
}
```

Run this test and let me know the results!

If tenant isolation works, we have the cleanest possible solution with minimal code changes.
