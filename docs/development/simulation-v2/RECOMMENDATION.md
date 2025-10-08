# Simulation Data Strategy - Executive Summary

## The Problem

You asked an excellent question about simulation data architecture:

1. **Should simulation data go into production database?** Currently yes, but isolated by tenant_id
2. **How to record student actions for debrief reports?** Need complete audit trail
3. **Code duplication issue:** Adding features requires implementing twice (production + simulation)
4. **Debugging complexity:** Two code paths to maintain and test

## My Recommendation: Tenant-Based Isolation (Option 3)

### Why This is Best

**TL;DR:** Your simulation data ALREADY goes to the production database, but it's **isolated by tenant_id**. This is actually the cleanest architecture - you just need to add a cleanup process.

### The Magic of Multi-Tenancy

```typescript
// ONE service function works for BOTH production AND simulation
export const addVitals = async (patientId: string, vitals: VitalSigns) => {
  const { data, error } = await supabase
    .from('patient_vitals')
    .insert({ patient_id: patientId, ...vitals });
  
  return data;
};

// When student enters simulation:
// - TenantContext switches to simulation tenant
// - RLS policies automatically filter by tenant_id
// - Student's actions go to database with simulation tenant_id
// - Production queries don't see simulation data (RLS filters it out)
// - Debrief queries can see ALL simulation data

// ✅ No code duplication
// ✅ New features work immediately
// ✅ Complete audit trail
// ✅ RLS provides security
```

## How It Works

### Architecture Flow

```
Student Login
     ↓
Select Simulation
     ↓
enterSimulationTenant('sim-tenant-123')
     ↓
TenantContext switches: currentTenant = simulation tenant
     ↓
Student records vitals
     ↓
addVitals() → INSERT INTO patient_vitals (patient_id, tenant_id, ...)
     ↓
RLS policy automatically sets tenant_id = 'sim-tenant-123'
     ↓
Data in database with simulation tenant_id
     ↓
Production users query vitals
     ↓
RLS filters: WHERE tenant_id = production_tenant_id
     ↓
Simulation data invisible to production ✅
     ↓
Instructor generates debrief report
     ↓
SELECT * FROM patient_vitals WHERE tenant_id = 'sim-tenant-123'
     ↓
All student actions retrieved ✅
     ↓
Cleanup after 24 hours
     ↓
DELETE FROM patient_vitals WHERE tenant_id = 'sim-tenant-123'
     ↓
Simulation data removed ✅
```

## What Needs to Be Added

### 1. Debrief Report Generation (NEW)

**Before Cleanup:**
```typescript
// Generate comprehensive debrief report
const report = await generateDebriefReport(simulationId);

// Contains:
// - All vitals recorded (with timestamps, student names)
// - All medications administered (with verification checks)
// - All clinical notes written
// - All alerts triggered/acknowledged
// - Timeline of events
// - Performance metrics
// - Critical incidents
```

**Store in Database:**
```sql
CREATE TABLE simulation_debrief_reports (
  id UUID PRIMARY KEY,
  simulation_id UUID,
  generated_at TIMESTAMPTZ,
  metrics JSONB,          -- Summary statistics
  timeline JSONB,         -- Chronological events
  vitals_data JSONB,      -- Full vitals record
  medication_data JSONB,  -- Full medication record
  notes_data JSONB,       -- Full notes record
  alerts_data JSONB       -- Full alerts record
);
```

### 2. Data Cleanup Process (NEW)

**Automatic Cleanup:**
```typescript
// When simulation ends
async function endSimulation(simulationId) {
  // 1. Generate debrief report (preserve data)
  await generateDebriefReport(simulationId);
  
  // 2. Mark simulation complete
  await updateSimulationStatus('completed');
  
  // 3. Schedule cleanup for 24 hours later
  await scheduleCleanup(simulationId, Date.now() + 24 * 60 * 60 * 1000);
}

// Background job runs daily
async function cleanupExpiredSimulations() {
  // Find simulations past cleanup time
  const expired = await getExpiredSimulations();
  
  // Delete all simulation data by tenant_id
  for (const sim of expired) {
    await cleanupSimulationData(sim.tenant_id);
  }
}
```

**What Gets Cleaned:**
```sql
-- Delete from all patient data tables
DELETE FROM patient_vitals WHERE tenant_id = 'sim-123';
DELETE FROM patient_medications WHERE tenant_id = 'sim-123';
DELETE FROM medication_administrations WHERE tenant_id = 'sim-123';
DELETE FROM patient_notes WHERE tenant_id = 'sim-123';
DELETE FROM patient_assessments WHERE tenant_id = 'sim-123';
DELETE FROM patient_alerts WHERE tenant_id = 'sim-123';
DELETE FROM patients WHERE tenant_id = 'sim-123';
-- ... etc for all tables

-- Debrief report is KEPT (permanent record)
```

### 3. Test Current Implementation (PRIORITY)

**First, verify tenant isolation works:**

Run the test script I created:
```bash
npm install -g tsx
tsx test-tenant-isolation.ts
```

**Expected Results:**
- ✅ Simulation tenant found
- ✅ Test data inserts with correct tenant_id
- ✅ RLS filters data (not visible to production users)
- ✅ Super admin can see all data (for debugging)

**If tests pass:** You're 90% done! Just add cleanup.

**If tests fail:** Need to check RLS policies and tenant propagation.

## Comparison with Alternatives

### Option 1: Memory-Only Store (simulationAlertStore pattern)

**What you'd have to build:**
```typescript
// Duplicate EVERY service
- simulationVitalStore.ts
- simulationMedicationStore.ts
- simulationNoteStore.ts
- simulationAssessmentStore.ts
- simulationLabStore.ts
- simulationImagingStore.ts
... 20+ more stores

// Modify EVERY service function
export const addVitals = async (vitals) => {
  if (isSimulationMode) {
    simulationVitalStore.add(vitals); // 50 lines
  } else {
    await supabase.from('patient_vitals').insert(vitals); // 50 lines
  }
  // 100 lines per function, 50% duplication
};

// Total: ~5000+ lines of duplicated code
// New features: Must implement twice
// Debugging: Test both code paths
// Risk: Memory lost on crash
```

**❌ Problems:**
- Massive code duplication
- Every new feature needs simulation version
- Memory doesn't persist through crashes
- Can't scale to multiple servers
- Testing nightmare

### Option 2: Separate Simulation Tables

**What you'd have to build:**
```sql
-- Duplicate schema (30+ tables)
patient_vitals          → simulation_vitals
patient_medications     → simulation_medications
patient_notes           → simulation_notes
... 30 more tables
```

```typescript
// Table routing function
function getTable(name: string) {
  return isSimulation ? `simulation_${name}` : name;
}

// Every query needs routing
await supabase.from(getTable('patient_vitals')).select('*');
```

**❌ Problems:**
- Schema duplication (30+ tables)
- Migration complexity (maintain 2x schemas)
- Still need cleanup process
- More complex than tenant isolation

### Option 3: Tenant-Based Isolation (RECOMMENDED)

**What you need to build:**
```typescript
// Just these two things:

1. Debrief report generation (~200 lines)
   - Query simulation data
   - Generate comprehensive report
   - Store in database

2. Cleanup service (~100 lines)
   - Delete data by tenant_id
   - Preserve debrief reports
   - Run as background job
```

**✅ Benefits:**
- Zero code duplication
- New features work immediately
- Database persistence (survives crashes)
- Scales infinitely
- Real SQL queries (joins, transactions, etc.)
- Simple cleanup (DELETE WHERE tenant_id = ...)

## Implementation Plan

### Phase 1: Verify (1 day)

```bash
# Run test script
tsx test-tenant-isolation.ts

# Check results
- Does tenant isolation work? (should be YES)
- Is RLS filtering correctly? (should be YES)
- Does data have correct tenant_id? (should be YES)
```

### Phase 2: Add Debrief Reports (2 days)

```typescript
// Create service
generateDebriefReport(simulationId) {
  // Query all simulation data
  // Build comprehensive report
  // Store in simulation_debrief_reports table
}

// Add to simulation end process
endSimulation() {
  await generateDebriefReport();
  await scheduleCleanup();
}
```

### Phase 3: Add Cleanup (2 days)

```typescript
// Create cleanup service
cleanupSimulationData(tenantId) {
  // Delete from all tables WHERE tenant_id = tenantId
  // Keep debrief report
}

// Create Supabase Edge Function (runs daily)
// Clean expired simulations
```

### Phase 4: Remove Unnecessary Code (1 day)

```bash
# If tenant isolation works, remove:
- simulationAlertStore.ts (not needed!)
- setSimulationMode() logic (not needed!)
- if (isSimulationMode) branches (not needed!)

# Simplify to single code path
```

**Total: 6 days** vs. weeks of building memory stores

## Key Insights

### 1. Multi-Tenancy IS Your Solution

You already built a robust multi-tenant system. Simulations are just **temporary tenants**. The architecture you have is perfect for this use case.

### 2. RLS Provides Security

Row Level Security policies ensure:
- Students only see their simulation's data
- Production users never see simulation data
- Super admins can see everything (for debugging)
- No code changes needed for security

### 3. Database Persistence Is Good

Contrary to intuition, using the database for simulations is BETTER than memory:
- Survives crashes/refreshes (you already experienced this benefit!)
- Real SQL features (complex queries, joins, transactions)
- Easier debrief reports (just query by tenant_id)
- Scales to multiple servers

### 4. Cleanup Is Simple

```sql
-- One SQL statement per table
DELETE FROM patient_vitals WHERE tenant_id = 'sim-123';

-- Or one RPC function
SELECT cleanup_simulation_data('sim-123');
```

## Risk Analysis

### Security Concerns

**Q: Is simulation data secure in production database?**

A: Yes, through multiple layers:
1. **RLS policies** filter by tenant_id (database level)
2. **Tenant context** ensures users only query their tenant (app level)
3. **Foreign keys** prevent cross-tenant data leaks (schema level)
4. **Audit logs** track all access (compliance level)

**Q: What if RLS fails?**

A: Multiple safeguards:
- Simulation tenants marked with `is_simulation = true`
- Additional policies can check this flag
- Super admin queries are explicit (can't happen accidentally)
- Debrief reports query by tenant_id (explicit filtering)

### Data Pollution Concerns

**Q: What if cleanup fails?**

A: Multiple strategies:
1. **Scheduled cleanup** (runs daily, retries on failure)
2. **Manual cleanup** (simple SQL command)
3. **Monitoring alerts** (notify if cleanup fails)
4. **Simulation flag** (`is_simulation = true` makes data identifiable)
5. **Expiration timestamps** (`auto_cleanup_at` field)

**Q: How much storage does simulation data use?**

A: Minimal:
- Average simulation: ~1000 database rows
- Size: ~100KB per simulation
- Retention: 24 hours
- Monthly cost: negligible

## Decision Matrix

| Criteria | Option 1: Memory | Option 2: Separate Tables | Option 3: Tenant Isolation |
|----------|------------------|---------------------------|---------------------------|
| Code Duplication | ❌ High | ⚠️ Medium | ✅ Zero |
| Implementation Time | ❌ 4 weeks | ⚠️ 2 weeks | ✅ 1 week |
| Maintenance Burden | ❌ High | ⚠️ Medium | ✅ Low |
| New Feature Cost | ❌ 2x work | ⚠️ 1.5x work | ✅ 1x work |
| Data Persistence | ❌ No | ✅ Yes | ✅ Yes |
| Debrief Reports | ⚠️ Complex | ✅ Simple | ✅ Simple |
| Scalability | ❌ Poor | ✅ Good | ✅ Excellent |
| Security | ✅ Good | ✅ Good | ✅ Excellent |
| Database Queries | ❌ No | ✅ Yes | ✅ Yes |
| Crash Recovery | ❌ No | ✅ Yes | ✅ Yes |

**Winner:** Option 3 (Tenant-Based Isolation)

## Next Steps

### Immediate Actions

1. **Run the test script** to verify tenant isolation works
   ```bash
   tsx test-tenant-isolation.ts
   ```

2. **Review test results** - if they pass, you're 90% done!

3. **Create debrief report service** (~200 lines)

4. **Create cleanup service** (~100 lines)

5. **Remove unnecessary simulation mode code** (simplification!)

### Long-Term Benefits

**Every new feature you add will:**
- ✅ Work in simulations automatically
- ✅ Require zero extra code
- ✅ Have complete audit trail
- ✅ Be testable in one place
- ✅ Scale infinitely

**Example:**
```typescript
// Add new feature: Patient handover reports
export const createHandoverReport = async (report: HandoverReport) => {
  return await supabase.from('handover_reports').insert(report);
};

// ✅ Works in production
// ✅ Works in simulations
// ✅ Isolated by tenant_id
// ✅ Included in debrief reports
// ✅ Cleaned up after simulation
// ✅ Zero extra work!
```

## Conclusion

**The system you've built is already architected correctly for simulations.**

You don't need to build a separate simulation data layer - your multi-tenant architecture with RLS policies already provides complete isolation. You just need to:

1. ✅ Verify tenant isolation works (test script)
2. ✅ Add debrief report generation (preserve student actions)
3. ✅ Add cleanup process (remove temporary data)

This approach gives you:
- **Zero code duplication** (single code path)
- **Automatic feature support** (new features work in simulations)
- **Simple debugging** (one code path to test)
- **Complete audit trail** (database persistence)
- **Scalable architecture** (tenant-based isolation)

Run the test script and let me know the results! If tenant isolation works (which I expect it will), you have the cleanest possible architecture.
