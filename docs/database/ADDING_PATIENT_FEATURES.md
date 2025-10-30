# Adding New Patient Features - Maintenance Guide

This guide ensures new patient-related features are properly integrated across all system functions.

## When Adding a New Patient Table

### Step 1: Create the Table
Location: `database/migrations/` or `database/schema.sql`

Required columns:
```sql
CREATE TABLE new_patient_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- REQUIRED for multi-tenancy
  -- Your feature columns here
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Indexes:
```sql
CREATE INDEX idx_new_patient_feature_patient ON new_patient_feature(patient_id);
CREATE INDEX idx_new_patient_feature_tenant ON new_patient_feature(tenant_id);
```

RLS Policies:
```sql
ALTER TABLE new_patient_feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "new_patient_feature_tenant_access" ON new_patient_feature
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

### Step 2: Update duplicate_patient_to_tenant
Location: `database/functions/duplicate_patient_to_tenant_enhanced.sql`

Add parameter:
```sql
p_include_new_feature BOOLEAN DEFAULT TRUE,
```

Add counter:
```sql
v_new_feature_count INTEGER := 0;
```

Add copy logic:
```sql
-- Copy new_patient_feature
IF p_include_new_feature THEN
  INSERT INTO new_patient_feature (
    patient_id,
    tenant_id,
    -- your columns
  )
  SELECT
    v_new_patient_uuid,
    p_target_tenant_id,
    -- your columns
  FROM new_patient_feature
  WHERE patient_id::text = v_source_patient_uuid::text;
  
  GET DIAGNOSTICS v_new_feature_count = ROW_COUNT;
  RAISE NOTICE 'Copied % new feature records', v_new_feature_count;
END IF;
```

Add to results:
```sql
v_records_created := jsonb_build_object(
  -- existing...
  'new_feature', v_new_feature_count
);
```

### Step 3: Update save_template_snapshot
Location: `database/schema.sql` around line 4233

Add to snapshot capture:
```sql
v_snapshot := jsonb_build_object(
  -- existing tables...
  'new_patient_feature', (
    SELECT COALESCE(json_agg(row_to_json(npf.*)), '[]'::json)
    FROM new_patient_feature npf
    JOIN patients p ON p.id = npf.patient_id
    WHERE p.tenant_id = v_tenant_id
  ),
  -- continue...
```

### Step 4: Update restore_snapshot_to_tenant
Location: `database/schema.sql` around line 4368

Add restore logic:
```sql
-- Restore new_patient_feature
IF p_snapshot->'new_patient_feature' IS NOT NULL THEN
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'new_patient_feature')
  LOOP
    INSERT INTO new_patient_feature (
      patient_id,
      tenant_id,
      -- your columns with proper type casting
    )
    VALUES (
      (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
      p_target_tenant_id,
      -- cast values: v_record->>'column_name'::type
    );
  END LOOP;
END IF;
```

### Step 5: Update PATIENT_TABLES_REFERENCE.md
Location: `docs/database/PATIENT_TABLES_REFERENCE.md`

Add new section with:
- Table name and purpose
- Complete column list
- Relationship description
- Transfer/snapshot status

Update table count (currently 16).

### Step 6: Test Everything
```sql
-- Test patient transfer
SELECT * FROM duplicate_patient_to_tenant(
  p_source_patient_id := 'P001',
  p_target_tenant_id := 'target-tenant-uuid',
  p_include_new_feature := true
);

-- Test snapshot save
SELECT save_template_snapshot('template-uuid');

-- Verify snapshot contains new table
SELECT snapshot_data->'new_patient_feature' 
FROM simulation_templates 
WHERE id = 'template-uuid';

-- Test simulation launch (uses restore function)
SELECT launch_simulation(...);

-- Verify data restored
SELECT * FROM new_patient_feature WHERE tenant_id = 'sim-tenant-uuid';
```

## Checklist for New Patient Tables

- [ ] Table created with tenant_id column
- [ ] Indexes on patient_id and tenant_id
- [ ] RLS policies for tenant isolation
- [ ] Added to duplicate_patient_to_tenant (with flag)
- [ ] Added to save_template_snapshot (capture)
- [ ] Added to restore_snapshot_to_tenant (restore)
- [ ] Updated PATIENT_TABLES_REFERENCE.md
- [ ] Tested patient transfer
- [ ] Tested simulation snapshot/restore
- [ ] Updated this checklist if needed

## Common Pitfalls

### 1. Forgetting tenant_id
**Problem:** Table has no tenant_id column
**Impact:** RLS fails, simulation data leaks between tenants
**Fix:** Always add tenant_id UUID column with index

### 2. Using patient_id (TEXT) instead of patient_id (UUID)
**Problem:** Inconsistent join types
**Impact:** Joins fail, data not copied
**Fix:** Check if table uses UUID or TEXT for patient reference

### 3. Not casting JSONB values in restore
**Problem:** `v_record->>'column_name'` returns TEXT
**Impact:** Type mismatch errors
**Fix:** Always cast: `(v_record->>'column_name')::correct_type`

### 4. JSONB Operator Confusion
**Problem:** Using `->` instead of `->>`
**Impact:** "cannot cast jsonb to uuid" error
**Fix:** Use `->>` for text extraction, then cast to UUID

### 5. Missing from Snapshot but Present in Restore
**Problem:** Added to restore but not to snapshot
**Impact:** Snapshot has NULL, restore tries to insert NULL array
**Fix:** Always add to both save AND restore functions

### 6. Forgetting RLS Policies
**Problem:** Table has no RLS or wrong policy
**Impact:** Students can't access simulation data
**Fix:** Copy RLS pattern from existing patient tables

## Quick Reference: Pattern Templates

### Patient-Related Table Pattern
```sql
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  -- feature columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_name_patient ON table_name(patient_id);
CREATE INDEX idx_table_name_tenant ON table_name(tenant_id);

ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Snapshot Capture Pattern
```sql
'table_name', (
  SELECT COALESCE(json_agg(row_to_json(t.*)), '[]'::json)
  FROM table_name t
  JOIN patients p ON p.id = t.patient_id
  WHERE p.tenant_id = v_tenant_id
)
```

### Snapshot Restore Pattern
```sql
IF p_snapshot->'table_name' IS NOT NULL THEN
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'table_name')
  LOOP
    INSERT INTO table_name (patient_id, tenant_id, column1, column2)
    VALUES (
      (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
      p_target_tenant_id,
      v_record->>'column1',
      (v_record->>'column2')::integer
    );
  END LOOP;
END IF;
```

## Version History

**Oct 30, 2025:** Created maintenance guide
- All 16 patient tables documented
- Snapshot functions verified complete
- Common pitfalls documented

---

**Last Updated:** October 30, 2025
**Maintainer:** Development Team
**Review Frequency:** When adding new patient features
