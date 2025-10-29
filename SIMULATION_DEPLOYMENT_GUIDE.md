# Simulation System Rebuild - Implementation Guide

This PR implements a complete rebuild of the healthcare simulation system with bulletproof reset functionality that preserves printed IDs while clearing student data.

## 🎯 Key Features

- **Bulletproof Reset**: Deletes only student event data, preserves printed wristband/barcode IDs
- **Multi-Tenant Security**: Full RLS policies for tenant isolation
- **Concurrent Simulations**: Multiple runs from same snapshot with independent state
- **Real-time Updates**: WebSocket notifications for UI synchronization  
- **Clean Architecture**: Templates → Snapshots → Runs separation

## 📁 Files Created

### Database Migrations
- `database/migrations/simulation/001_cleanup_old_simulation_system.sql` - Removes broken old system
- `database/migrations/simulation/002_create_simulation_core_schema.sql` - New clean schema  
- `database/migrations/simulation/003_create_simulation_rls_policies.sql` - Multi-tenant security

### Database Functions
- `database/functions/simulation/reset_and_management_functions.sql` - Core RPC functions

### Frontend Code  
- `src/hooks/useSimulation.ts` - React hooks for simulation management
- `src/pages/SimulationRunPage.tsx` - Basic simulation interface

### Tests
- `tests/simulation-manual.ts` - Manual test runner for reset functionality

## 🚀 Deployment Instructions

### Step 1: Backup Current System
```bash
# The old system is already backed up to backup/simulation-legacy/
# No action needed - backup was done during cleanup
```

### Step 2: Run Database Migrations

**In Supabase Dashboard:**
1. Go to SQL Editor
2. Run migrations in order:

```sql
-- 1. Cleanup old broken system
-- Copy/paste: database/migrations/simulation/001_cleanup_old_simulation_system.sql

-- 2. Create new schema  
-- Copy/paste: database/migrations/simulation/002_create_simulation_core_schema.sql

-- 3. Add RLS policies
-- Copy/paste: database/migrations/simulation/003_create_simulation_rls_policies.sql

-- 4. Add core functions
-- Copy/paste: database/functions/simulation/reset_and_management_functions.sql
```

### Step 3: Update Environment Variables

Add to your `.env` files:
```bash
# Required for hooks and tests
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For testing
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TEST_TENANT_ID=your-test-tenant-id
```

### Step 4: Test the Reset Function

```bash
# Run the manual test
npx ts-node tests/simulation-manual.ts

# Expected output:
# 🚀 Starting Simulation Reset Tests
# ✅ Template created with valid ID  
# ✅ Snapshot created successfully
# ✅ Run launched successfully
# ✅ CRITICAL: Vitals events deleted
# ✅ CRITICAL: Public patient ID unchanged
# 🎉 ALL TESTS PASSED!
```

### Step 5: Update Your Routes

Add to your React Router:
```tsx
import SimulationRunPage from './pages/SimulationRunPage';

// Add route
<Route path="/sim/:runId" element={<SimulationRunPage />} />
```

## 📊 Database Schema Overview

### Core Entities
- `sim_templates` - Instructor-created scenarios
- `sim_template_patients` - Patients with **stable public_patient_id** (printed wristbands)
- `sim_template_barcodes` - Medications with **stable public_barcode_id** (printed labels)

### Immutable Snapshots  
- `sim_snapshots` - Frozen baseline states for reset
- Contains complete JSONB snapshot of all template data

### Active Runs
- `sim_runs` - Active simulation instances
- `sim_run_patients` - **Stable entities** (preserved across resets)
- `sim_run_barcode_pool` - **Stable entities** (preserved across resets)

### Ephemeral Events (Deleted on Reset)
- `sim_run_vitals_events` - Student-entered vitals  
- `sim_run_med_admin_events` - Medication administrations
- `sim_run_alert_acks` - Alert acknowledgments
- `sim_run_notes` - Student notes

## 🔑 Critical Reset Logic

```sql
-- The bulletproof reset function:
CREATE OR REPLACE FUNCTION reset_run(p_run_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Advisory lock prevents concurrent writes
  PERFORM pg_advisory_xact_lock(...);
  
  -- Delete ONLY event data
  DELETE FROM sim_run_vitals_events WHERE run_id = p_run_id;
  DELETE FROM sim_run_med_admin_events WHERE run_id = p_run_id;  
  DELETE FROM sim_run_alert_acks WHERE run_id = p_run_id;
  DELETE FROM sim_run_notes WHERE run_id = p_run_id;
  
  -- DO NOT TOUCH:
  -- sim_run_patients (keeps printed wristband IDs)
  -- sim_run_barcode_pool (keeps printed barcode IDs)
  
  RETURN success_summary;
END;
$$;
```

## 🔒 Security Features

- **RLS Policies**: Tenant isolation on all tables
- **Advisory Locks**: Prevent concurrent reset operations  
- **Function Security**: `SECURITY DEFINER` with proper grants
- **Input Validation**: UUID type safety and existence checks

## 📱 Frontend Usage

```tsx
import { useSimRun } from '../hooks/useSimulation';

function MySimulationPage() {
  const { 
    patients, 
    resetSimulation, 
    recordVitals,
    administerMedication 
  } = useSimRun(runId);

  const handleReset = async () => {
    await resetSimulation();
    // UI automatically refreshes via real-time subscriptions
  };

  return (
    <div>
      <button onClick={handleReset}>Reset Simulation</button>
      {patients.map(patient => (
        <div key={patient.id}>
          Patient: {patient.public_patient_id} {/* Stable printed ID */}
        </div>
      ))}
    </div>
  );
}
```

## ✅ Acceptance Criteria Verification

After deployment, verify these critical requirements:

### ✅ Reset Preserves Printed IDs
- Patient wristband IDs remain unchanged after reset
- Medication barcode IDs remain unchanged after reset  
- Room/bed assignments preserved

### ✅ Reset Clears Student Data  
- All vitals readings deleted
- All medication administration records deleted
- All alert acknowledgments deleted (alerts become unacknowledged)
- All student notes deleted

### ✅ Multiple Concurrent Simulations
- Can launch multiple runs from same snapshot
- Resetting one run doesn't affect others
- Each run has independent patient/barcode pools

### ✅ Multi-Tenant Security
- Users only see simulations from their tenant
- Super admins can see all tenants
- RLS enforced at database level

## 🚨 Rollback Plan (If Needed)

If issues arise, you can restore the old system:

```sql
-- 1. Drop new tables
DROP TABLE IF EXISTS sim_run_notes CASCADE;
DROP TABLE IF EXISTS sim_run_alert_acks CASCADE;
-- ... (continue with all new tables)

-- 2. Restore old schema from backup
-- Copy from backup/simulation-legacy/README.md instructions
```

## 🔄 Migration from Old System  

If you have existing simulation data to migrate:

```sql
-- Migration script (run after new schema is deployed)
-- Copy existing templates to new format
INSERT INTO sim_templates (name, tenant_id, ...)  
SELECT name, tenant_id, ... FROM simulation_templates;

-- Copy patients with preserved IDs
-- ... (custom migration based on your existing data)
```

## 📞 Support

If you encounter issues:

1. Check the manual test output for specific errors
2. Verify RLS policies aren't blocking access  
3. Ensure tenant_id is properly set in user JWT
4. Check Supabase logs for detailed error messages

The new system is designed to be bulletproof - if the tests pass, the reset will work reliably in production! 🎉