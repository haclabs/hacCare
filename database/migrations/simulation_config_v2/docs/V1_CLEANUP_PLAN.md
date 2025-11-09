# V1 System Cleanup Plan

## DO NOT DELETE UNTIL V2 PROVEN IN PRODUCTION

**Cleanup Trigger**: After 1 week of V2 stability with zero rollbacks

## Files to Archive

### 1. Database Functions (Hardcoded Table Lists)

**File**: `/database/functions/duplicate_patient_to_tenant_enhanced.sql`
- **Size**: 936 lines
- **Status**: Updated with labs, NOT deployed
- **Issue**: Patient transfer not working (UI/database problem)
- **Replacement**: Phase 4 - duplicate_patient_to_tenant_v2 (config-driven)
- **Action**: Move to `/archive/functions/v1/`

### 2. Schema Functions (Snapshot/Restore V1)

**File**: `/database/schema.sql`

**Sections to Archive**:
- **Lines 4289-4428**: `save_template_snapshot` V1
  - Hardcoded table list
  - Updated with labs support
  - NOT deployed
  - **Replacement**: save_template_snapshot_v2
  
- **Lines 4434-4800**: `restore_snapshot_to_tenant` V1
  - Hardcoded table list
  - Updated with labs support
  - NOT deployed
  - **Replacement**: restore_snapshot_to_tenant_v2
  
- **Lines 2924-3074**: `reset_simulation` V1
  - Updated with lab DELETE statements
  - NOT deployed (too risky - 20+ hours past trauma)
  - **Replacement**: TBD (reset needs architectural rethinking)

**Action**: 
1. Comment out V1 functions in schema.sql
2. Add deprecation notice
3. Keep for 1 week as rollback option
4. Move to `/archive/database/v1_functions/`

### 3. Test/Debug Files

**Keep these** (useful for future debugging):
- `/database/migrations/simulation_config_v2/DEBUG_PATIENT_TRANSFER.sql`
- `/database/migrations/simulation_config_v2/VITALS_TEST_PLAN.sql`

## Cleanup Checklist

### Week 1: V2 Testing
- [ ] Complete vitals test successfully
- [ ] Verify labs captured automatically
- [ ] Test snapshot/restore with real simulations
- [ ] Verify barcode labels still work
- [ ] Monitor for errors

### Week 2: V2 Production Use
- [ ] Run 2-3 real simulations with V2
- [ ] Get instructor feedback
- [ ] Verify student experience unchanged
- [ ] Check performance (no slowdowns)
- [ ] Zero rollbacks to V1

### Week 3: Cutover
- [ ] Update UI to call V2 functions by default
- [ ] Set V1 as fallback option
- [ ] Monitor production metrics
- [ ] Document any edge cases

### Week 4: Archive V1
- [ ] Comment out V1 functions in schema.sql
- [ ] Move files to archive/
- [ ] Update documentation
- [ ] Celebrate! 🎉

## Rollback Plan (If Needed)

### If V2 Fails in Production:
1. **Immediate**: Change UI back to V1 functions
2. **Within 1 hour**: Verify V1 still works
3. **Within 24 hours**: Root cause analysis
4. **Document**: What failed, why, how to prevent

### V1 Restoration:
```sql
-- V1 functions still in cloud, just change frontend calls:
-- save_template_snapshot(template_id)     -- V1
-- restore_snapshot_to_tenant(tenant_id, data)  -- V1
```

## Risk Assessment

### Low Risk (V2 is isolated):
- ✅ V2 functions have different names
- ✅ V1 still exists in production
- ✅ UI can toggle between V1/V2
- ✅ Active simulations not affected
- ✅ Config table is additive (doesn't break V1)

### Medium Risk:
- ⚠️ RLS policies affect both V1 and V2
- ⚠️ Single production database (no rollback DB)
- ⚠️ Students using system daily

### Mitigation:
- Test RLS thoroughly before go-live
- Take database backup before cutover
- Schedule cutover between class sessions
- Have instructor on standby

## Archive Structure

```
/archive/
  v1_simulation_system/
    README.md                      # Why archived, when, by whom
    RESTORATION_GUIDE.md           # How to bring V1 back if needed
    functions/
      duplicate_patient_to_tenant_enhanced.sql
      save_template_snapshot_v1.sql
      restore_snapshot_to_tenant_v1.sql
      reset_simulation_v1.sql
    tests/
      v1_test_results.md           # What worked, what didn't
```

## Success Metrics

### V2 is production-ready when:
- ✅ All 18 tables captured automatically
- ✅ Labs included without manual updates
- ✅ Barcodes work (patient MRNs preserved)
- ✅ New vitals during simulation persist
- ✅ RLS doesn't block legitimate access
- ✅ Zero errors for 1 week
- ✅ Instructor feedback positive

## Notes

- **Don't rush cleanup** - V1 works, keep it as safety net
- **Document everything** - Future devs need context
- **User trust is paramount** - 6 days of working code, don't break it
- **Config system is the future** - Worth the careful migration
