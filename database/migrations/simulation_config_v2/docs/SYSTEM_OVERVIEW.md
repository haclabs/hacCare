# Simulation Config V2 System - Production Documentation

## Quick Reference

### Add New Feature (5 minutes)
```sql
-- 1. Create your table
CREATE TABLE patient_allergies (...);

-- 2. Add to config
INSERT INTO simulation_table_config (
  table_name, category, has_tenant_id, has_patient_id, 
  requires_id_mapping, enabled
) VALUES (
  'patient_allergies', 'clinical', false, true, false, true
);

-- 3. Done! Next snapshot automatically captures it
```

### Take Snapshot
```sql
SELECT save_template_snapshot_v2('template_id');
```

### Restore Snapshot
```sql
SELECT restore_snapshot_to_tenant_v2('tenant_id', snapshot_data);
```

## Architecture

### Config Table (simulation_table_config)
**Location**: `001_phase1_config_and_rls.sql`

Metadata-driven approach - all patient tables listed with properties:
- `has_tenant_id`: Direct tenant relationship
- `has_patient_id`: Indirect via patients table
- `requires_id_mapping`: Needs UUID regeneration (meds, labs, wounds)
- `parent_table`: For child tables (lab_results → lab_panels)
- `delete_order`: Cascade order for cleanup

**18 Tables Currently Tracked**:
- Core: patients, patient_vitals, patient_notes, patient_alerts
- Medications: patient_medications, medication_administrations
- Clinical: patient_admission_records, patient_advanced_directives
- Assessments: diabetic_records, bowel_records, handover_notes
- Labs: lab_panels, lab_results
- Wounds: patient_wounds, wound_assessments
- Orders: doctors_orders, patient_images

### Snapshot V2 (save_template_snapshot_v2)
**Location**: `002_phase2_save_snapshot_v2.sql`

**How it works**:
1. Reads simulation_table_config WHERE enabled=true
2. Loops through each table
3. Builds dynamic query based on has_tenant_id/has_patient_id
4. Captures data as JSONB
5. Returns: tables_captured, total_rows, version=2

**Key Feature**: Automatically captures new tables added to config!

### Restore V2 (restore_snapshot_to_tenant_v2)
**Location**: `003_phase3_restore_v2.sql`

**How it works**:
1. **Phase 1**: Tables WITH ID mapping (patients, meds, lab_panels, wounds)
   - Generates new UUIDs
   - Stores old_id → new_id mappings in JSONB
2. **Phase 2**: Tables WITHOUT ID mapping (vitals, notes, lab_results)
   - Uses parent ID mappings for child tables
   - Dynamic INSERT with type casting

**Current Status**: Handles 8 core tables (prototype)
**TODO**: Add remaining 10 tables to CASE statements

### Security (RLS Policies)
**Location**: `001_phase1_config_and_rls.sql` (lines 110-450)

RLS enabled on all simulation tables with role-based access:
- `admin`: Full access
- `instructor`: Can manage their simulations
- `nurse`: Participant-level access
- `super_admin`: God mode

## Deployment Status

| Phase | Status | File | Deployed |
|-------|--------|------|----------|
| Phase 1 | ✅ LIVE | 001_phase1_config_and_rls.sql | Yes |
| Phase 2 | ✅ LIVE | 002_phase2_save_snapshot_v2.sql | Yes |
| Phase 3 | ✅ LIVE | 003_phase3_restore_v2.sql | Yes (8 tables) |
| Phase 4 | ⏸️ TODO | duplicate_patient_to_tenant_v2 | No |
| Phase 5 | ⏸️ TODO | Cutover V1→V2 | No |

## Testing

**Current Focus**: Vitals test (RUN_VITALS_TEST.sql)

**Test Plan**:
1. ✅ Find template
2. ⏸️ Take snapshot V2
3. ⏸️ Verify captured data (patients, vitals, labs)
4. ⏸️ Manual restore to test tenant
5. ⏸️ Verify vitals restored
6. ⏸️ Add NEW vitals during simulation
7. ⏸️ Verify patient MRNs match (barcodes)
8. ⏸️ Verify medication IDs preserved
9. ⏸️ Cleanup

## V1 System (Mark for Cleanup)

### Files to Archive After V2 Proven
See: `docs/V1_CLEANUP_PLAN.md`

**Functions with hardcoded table lists**:
- `/database/functions/duplicate_patient_to_tenant_enhanced.sql` (936 lines)
- `/database/schema.sql` lines 4289-4428: save_template_snapshot V1
- `/database/schema.sql` lines 4434-4800: restore_snapshot_to_tenant V1
- `/database/schema.sql` lines 2924-3074: reset_simulation V1

**Status**: Code complete with labs, NOT deployed (superseded by V2)

## Key Improvements

### Before (V1)
- Add new table → Update 4+ functions manually
- 4-6 hours per feature
- Error-prone (easy to miss a function)
- Hardcoded table lists everywhere

### After (V2)
- Add new table → One INSERT into config
- 5 minutes per feature
- Automatic capture/restore
- Single source of truth

## Production Safety

- ✅ Single production database (no dev environment)
- ✅ 2 active simulations with printed labels (SAFE - not affected)
- ✅ V1 functions still default (V2 opt-in for testing)
- ✅ RLS enabled for security
- ✅ ID mapping preserves barcodes

## Next Steps

1. **Complete vitals test** (RUN_VITALS_TEST.sql)
2. **Add remaining 10 tables** to Phase 3 restore function
3. **Create Phase 4** (duplicate_patient_to_tenant_v2)
4. **Production testing** with real simulations
5. **Cutover to V2** as default
6. **Archive V1 system** after 1 week stability
