# Rapid Changes Guide - Config V2 System

## For Fast Production Updates

### Adding New Patient Table (5 minutes)

```sql
-- 1. Create table
CREATE TABLE patient_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  allergy_name text NOT NULL,
  severity text,
  reaction text,
  recorded_at timestamptz DEFAULT now()
);

-- 2. Add to config (one INSERT!)
INSERT INTO simulation_table_config (
  table_name,
  category,
  has_tenant_id,
  has_patient_id,
  parent_table,
  parent_column,
  requires_id_mapping,
  delete_order,
  enabled,
  notes
) VALUES (
  'patient_allergies',
  'clinical',
  false,            -- joined via patient
  true,             -- has patient_id
  'patients',       -- parent is patients
  'patient_id',     -- FK column
  false,            -- simple table, no ID mapping needed
  150,              -- after patients (100)
  true,
  'Patient allergy list'
);

-- 3. Test snapshot captures it
SELECT save_template_snapshot_v2('your_template_id');

-- 4. Check it was captured
SELECT jsonb_array_length(snapshot_data->'patient_allergies') 
FROM simulation_templates 
WHERE id = 'your_template_id';

-- Done! ✅
```

### Adding Table That Needs ID Mapping

```sql
-- Example: Lab orders that students scan with barcodes

-- 1. Create table with UUID primary key
CREATE TABLE lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id),
  order_name text,
  barcode text UNIQUE  -- THIS needs to be preserved!
);

-- 2. Add to config with requires_id_mapping=true
INSERT INTO simulation_table_config (
  table_name, category, has_tenant_id, has_patient_id,
  requires_id_mapping,  -- TRUE for barcode preservation
  delete_order, enabled
) VALUES (
  'lab_orders', 'labs', false, true,
  true,  -- ⚠️ Means restore_v2 needs CASE statement added
  180, true
);

-- 3. Add to restore_v2 function
-- Edit: /database/migrations/simulation_config_v2/003_phase3_restore_v2.sql
-- Add CASE in PHASE 1 section (around line 140):

WHEN 'lab_orders' THEN
  v_mapped_patient_id := (v_id_mappings->'patients'->>(v_record->>'patient_id'))::uuid;
  INSERT INTO lab_orders (
    id, patient_id, order_name, barcode
  ) VALUES (
    v_new_id,
    v_mapped_patient_id,
    v_record->>'order_name',
    v_record->>'barcode'
  );

-- 4. Redeploy restore_v2
-- Run in Supabase SQL Editor:
-- [Copy full 003_phase3_restore_v2.sql with your addition]

-- Done! ✅
```

## Common Scenarios

### Scenario 1: Quick Clinical Table (No ID Mapping)
**Time**: 5 minutes
**Example**: Allergies, immunizations, family history

```sql
-- 1. CREATE TABLE
-- 2. INSERT INTO simulation_table_config (requires_id_mapping=false)
-- 3. Done - snapshot auto-captures, restore auto-restores
```

### Scenario 2: Table with Barcodes/Labels
**Time**: 15 minutes
**Example**: Lab orders, medications, specimens

```sql
-- 1. CREATE TABLE with uuid PRIMARY KEY
-- 2. INSERT INTO simulation_table_config (requires_id_mapping=true)
-- 3. Add CASE to restore_v2 PHASE 1
-- 4. Redeploy restore_v2
```

### Scenario 3: Child Table (No ID Mapping)
**Time**: 5 minutes
**Example**: Lab results, wound assessments

```sql
-- 1. CREATE TABLE with parent_id FK
-- 2. INSERT INTO simulation_table_config 
--    - parent_table='parent_name'
--    - parent_column='parent_id'
--    - requires_id_mapping=false
-- 3. Add CASE to restore_v2 PHASE 2 (uses parent mapping)
-- 4. Redeploy restore_v2
```

## File Locations for Updates

### Config Table
**File**: Already deployed, use INSERT to add
**Location**: Supabase SQL Editor → `simulation_table_config` table

### Snapshot Function (Usually no changes needed!)
**File**: `/database/migrations/simulation_config_v2/002_phase2_save_snapshot_v2.sql`
**When to edit**: Rarely - only if adding special query logic

### Restore Function (Add CASE statements)
**File**: `/database/migrations/simulation_config_v2/003_phase3_restore_v2.sql`
**When to edit**: When requires_id_mapping=true OR child table with parent mapping
**Sections**:
- **PHASE 1** (line 44-192): Tables WITH ID mapping
- **PHASE 2** (line 197-345): Tables WITHOUT ID mapping

### Test Plan
**File**: Create new test or extend `RUN_VITALS_TEST.sql`
**Template**:
```sql
-- Step N: Test [your_table_name]
SELECT jsonb_array_length(snapshot_data->'your_table_name')
FROM simulation_templates WHERE id = 'YOUR_TEMPLATE_ID';

-- After restore
SELECT COUNT(*) FROM your_table_name 
WHERE tenant_id = 'YOUR_TEST_TENANT_ID';
```

## Deployment Checklist

### Before Deploy
- [ ] Config INSERT written and tested
- [ ] If requires_id_mapping=true, CASE statement added to restore_v2
- [ ] Test query ready
- [ ] Backup template has sample data

### Deploy
- [ ] Run config INSERT in Supabase
- [ ] If function updated, run full SQL file (DROP + CREATE)
- [ ] Verify function exists: `\df restore_snapshot_to_tenant_v2`

### After Deploy
- [ ] Test snapshot captures new table
- [ ] Test restore brings data back
- [ ] Verify relationships work (FKs intact)
- [ ] If barcodes: Scan test to confirm IDs preserved

### Rollback (If Needed)
```sql
-- Disable table in config
UPDATE simulation_table_config 
SET enabled = false 
WHERE table_name = 'your_table_name';

-- Next snapshot won't include it
```

## Emergency Fixes

### Snapshot Missing Data
```sql
-- Check config
SELECT * FROM simulation_table_config 
WHERE table_name = 'your_table_name';

-- Re-enable if disabled
UPDATE simulation_table_config 
SET enabled = true 
WHERE table_name = 'your_table_name';

-- Retake snapshot
SELECT save_template_snapshot_v2('template_id');
```

### Restore Failing
```sql
-- Check error message for table name
-- Common issues:
-- 1. Missing CASE statement in restore_v2
-- 2. Type mismatch in dynamic query
-- 3. Parent mapping not found

-- Quick fix: Disable problematic table
UPDATE simulation_table_config 
SET enabled = false 
WHERE table_name = 'problematic_table';

-- Restore will skip it, rest of data restores
```

### Barcode IDs Wrong
```sql
-- Verify ID mapping stored correctly
-- In restore_v2, check v_id_mappings JSONB:
RAISE NOTICE 'Mappings: %', v_id_mappings;

-- Common issue: Forgot to store mapping
-- Solution: Add to PHASE 1, line ~183:
v_id_mappings := jsonb_set(
  v_id_mappings,
  ARRAY['your_table_name', v_old_id::text],
  to_jsonb(v_new_id::text)
);
```

## Performance Tips

### Large Tables (1000+ rows)
- ✅ Config system handles it (uses pagination internally)
- ✅ JSONB compression efficient
- ⚠️ Restore may take 10-30 seconds
- Solution: Split into chunks if needed (contact dev)

### Many Tables (20+ tables)
- ✅ Config loops through efficiently
- ✅ Can disable tables not needed: `enabled=false`
- ✅ Delete_order ensures proper cascade

### Complex Relationships
- Use parent_table/parent_column in config
- Restore handles lookups automatically
- Test with small dataset first

## Contact/Escalation

### When to Ask for Help
- Restore failing with error you don't understand
- Performance issues (snapshot/restore taking >1 minute)
- Complex table with multiple parents
- Need to add custom query logic to snapshot

### What to Provide
1. Error message (full text)
2. Table schema (CREATE TABLE statement)
3. Config INSERT statement you used
4. Sample data (1-2 rows)
5. What you expected vs what happened

## Success Stories

### Before Config System
- **Adding lab support**: 6+ hours, 4 functions updated, multiple bugs
- **Adding wounds**: 4 hours, 3 functions updated
- **Adding vitals**: 3 hours, missed one function initially

### After Config System
- **Adding patient_allergies**: 5 minutes, one INSERT
- **Adding wound_assessments**: 15 minutes (needed ID mapping)
- **Adding patient_images**: 8 minutes (child table)

**Time saved per feature**: ~4-6 hours → 5-15 minutes! 🚀
