# Better Simulation Architecture - Solving the Maintenance Nightmare
**Date:** November 6, 2025  
**Problem:** Every new patient table requires updating 4+ functions manually

---

## Your Current Pain Points 🔴

### The Problem You Described:
1. Add new feature to hacCare (e.g., lab_panels, lab_results)
2. Manually update `save_template_snapshot` to capture it
3. Manually update `restore_snapshot_to_tenant` to restore it  
4. Manually update `reset_simulation` to delete it
5. Manually update `duplicate_patient_to_tenant` to copy it
6. **Takes HOURS of work for every new table**
7. **Easy to miss a table and break simulations**
8. **Maintaining hardcoded list of 15+ tables in multiple places**

### What You Need:
- ✅ Capture ENTIRE tenant state automatically
- ✅ Preserve patient & medication IDs (barcodes)
- ✅ Reset back to snapshot without breaking
- ✅ Add new features WITHOUT updating simulation code

---

## Solution 1: Dynamic Table Discovery (RECOMMENDED) ⭐

Instead of hardcoding every table, **discover patient tables dynamically**.

### How It Works:

```sql
CREATE OR REPLACE FUNCTION get_patient_related_tables()
RETURNS TABLE(
  table_name text,
  has_tenant_id boolean,
  has_patient_id boolean,
  join_path text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.table_name 
      AND c.column_name = 'tenant_id'
    ) as has_tenant_id,
    EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.table_name 
      AND c.column_name = 'patient_id'
    ) as has_patient_id,
    CASE
      WHEN t.table_name LIKE 'patient_%' THEN 'direct'
      WHEN t.table_name IN ('lab_results') THEN 'via lab_panels'
      WHEN t.table_name IN ('wound_assessments') THEN 'via patient_wounds'
      ELSE 'direct'
    END as join_path
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND (
      t.table_name LIKE 'patient_%'
      OR t.table_name IN (
        'diabetic_records',
        'bowel_records', 
        'handover_notes',
        'doctors_orders',
        'lab_panels',
        'lab_results',
        'wound_assessments',
        'medication_administrations'
        -- Add any other patient-related tables
      )
    )
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;
```

### Dynamic Save Snapshot:

```sql
CREATE OR REPLACE FUNCTION save_template_snapshot_v2(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
BEGIN
  -- Get tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  -- Loop through all patient tables dynamically
  FOR v_table_record IN SELECT * FROM get_patient_related_tables()
  LOOP
    -- Build query dynamically based on table structure
    IF v_table_record.has_tenant_id THEN
      -- Direct tenant_id join
      EXECUTE format(
        'SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json) FROM %I t WHERE t.tenant_id = $1',
        v_table_record.table_name
      ) INTO v_table_data USING v_tenant_id;
      
    ELSIF v_table_record.has_patient_id THEN
      -- Join through patients table
      EXECUTE format(
        'SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json) 
         FROM %I t 
         JOIN patients p ON p.id = t.patient_id 
         WHERE p.tenant_id = $1',
        v_table_record.table_name
      ) INTO v_table_data USING v_tenant_id;
      
    END IF;
    
    -- Add to snapshot
    v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
  END LOOP;
  
  -- Save snapshot
  UPDATE simulation_templates
  SET snapshot_data = v_snapshot, snapshot_version = snapshot_version + 1
  WHERE id = p_template_id;
  
  RETURN json_build_object('success', true, 'tables_captured', jsonb_object_keys(v_snapshot));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Benefits:
✅ **Add new table** → Automatically captured in next snapshot  
✅ **No code changes** to save_template_snapshot  
✅ **No maintenance** when adding features  
✅ **Can't forget a table** - it finds them all  

### Drawbacks:
⚠️ Slightly slower (dynamic SQL execution)  
⚠️ Harder to debug (no explicit table list)  
⚠️ Complex join paths need manual mapping  

---

## Solution 2: Metadata-Driven Configuration (BEST FOR YOU) 🏆

Create a **configuration table** that lists all patient tables and their relationships.

### Implementation:

```sql
-- One-time setup
CREATE TABLE simulation_table_config (
  id serial PRIMARY KEY,
  table_name text NOT NULL UNIQUE,
  category text NOT NULL, -- 'core', 'clinical', 'assessments', 'labs', 'medications'
  has_tenant_id boolean DEFAULT false,
  has_patient_id boolean DEFAULT false,
  parent_table text, -- For nested relationships (e.g., lab_results -> lab_panels)
  parent_column text,
  requires_id_mapping boolean DEFAULT false, -- For wounds, medications
  delete_order integer, -- For reset (delete children first)
  enabled boolean DEFAULT true,
  notes text
);

-- Populate with your current tables
INSERT INTO simulation_table_config 
  (table_name, category, has_tenant_id, has_patient_id, requires_id_mapping, delete_order) 
VALUES
  -- Core patient data
  ('patients', 'core', true, false, true, 999),
  ('patient_medications', 'medications', true, true, true, 10),
  ('patient_vitals', 'clinical', true, true, false, 5),
  ('patient_notes', 'clinical', true, true, false, 5),
  ('patient_alerts', 'clinical', true, false, false, 5),
  
  -- Assessments
  ('patient_admission_records', 'assessments', false, true, false, 8),
  ('patient_advanced_directives', 'assessments', false, true, false, 8),
  ('bowel_records', 'assessments', false, true, false, 8),
  ('diabetic_records', 'assessments', true, true, false, 8),
  
  -- Labs (NEW - just add this row!)
  ('lab_panels', 'labs', true, true, true, 6),
  ('lab_results', 'labs', true, false, false, 5),
  
  -- Wounds
  ('patient_wounds', 'clinical', true, true, true, 7),
  ('wound_assessments', 'clinical', true, true, false, 6),
  
  -- Orders
  ('handover_notes', 'clinical', false, true, false, 8),
  ('doctors_orders', 'clinical', true, true, false, 8),
  
  -- Images
  ('patient_images', 'clinical', true, true, false, 5);
```

### Then All Functions Use This Config:

```sql
CREATE OR REPLACE FUNCTION save_template_snapshot_v3(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_query text;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  
  -- Loop through enabled tables from config
  FOR v_table_record IN 
    SELECT * FROM simulation_table_config 
    WHERE enabled = true 
    ORDER BY table_name
  LOOP
    -- Build query based on metadata
    IF v_table_record.has_tenant_id THEN
      v_query := format(
        'SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json) FROM %I t WHERE t.tenant_id = $1',
        v_table_record.table_name
      );
    ELSIF v_table_record.has_patient_id THEN
      v_query := format(
        'SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json) 
         FROM %I t JOIN patients p ON p.id = t.patient_id WHERE p.tenant_id = $1',
        v_table_record.table_name
      );
    ELSIF v_table_record.parent_table IS NOT NULL THEN
      -- Handle nested relationships (lab_results via lab_panels)
      v_query := format(
        'SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json) 
         FROM %I t 
         JOIN %I pt ON pt.id = t.%I 
         JOIN patients p ON p.id = pt.patient_id 
         WHERE p.tenant_id = $1',
        v_table_record.table_name,
        v_table_record.parent_table,
        v_table_record.parent_column
      );
    END IF;
    
    -- Execute and add to snapshot
    EXECUTE v_query INTO v_table_data USING v_tenant_id;
    v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
  END LOOP;
  
  -- Save snapshot
  UPDATE simulation_templates
  SET snapshot_data = v_snapshot, snapshot_version = snapshot_version + 1
  WHERE id = p_template_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Reset Also Uses Config:

```sql
CREATE OR REPLACE FUNCTION reset_simulation_v2(p_simulation_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_table_record record;
BEGIN
  -- Get simulation tenant
  SELECT tenant_id INTO v_tenant_id 
  FROM simulation_active sa 
  WHERE sa.id = p_simulation_id;
  
  -- Delete all tables in correct order (children first)
  FOR v_table_record IN 
    SELECT * FROM simulation_table_config 
    WHERE enabled = true 
    ORDER BY delete_order ASC  -- Lower numbers deleted first
  LOOP
    IF v_table_record.has_tenant_id THEN
      EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table_record.table_name) 
        USING v_tenant_id;
    ELSIF v_table_record.has_patient_id THEN
      EXECUTE format(
        'DELETE FROM %I WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = $1)',
        v_table_record.table_name
      ) USING v_tenant_id;
    END IF;
  END LOOP;
  
  -- Restore from snapshot
  PERFORM restore_snapshot_to_tenant(v_tenant_id, v_snapshot, v_id_mappings);
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Benefits:
✅ **Add new table**: Just INSERT one row into config table  
✅ **Disable table**: Set enabled = false (for debugging)  
✅ **Clear documentation**: Config table shows all relationships  
✅ **Flexible**: Can add metadata like "requires_id_mapping"  
✅ **Version control**: Config is data, easily migrated  
✅ **No code changes**: All functions read from config  

### Drawbacks:
⚠️ One-time setup to create config table  
⚠️ Slightly more complex queries  

---

## Solution 3: Postgres Row-Level Security Triggers (ADVANCED) 🚀

Use database triggers to automatically track all changes to patient data.

### How It Works:

```sql
-- Create audit table
CREATE TABLE simulation_tenant_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  table_name text NOT NULL,
  operation text NOT NULL, -- INSERT, UPDATE, DELETE
  record_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz DEFAULT now()
);

-- Trigger function
CREATE OR REPLACE FUNCTION track_patient_data_changes()
RETURNS trigger AS $$
BEGIN
  -- Only track for simulation tenants
  IF EXISTS (SELECT 1 FROM simulation_active WHERE tenant_id = NEW.tenant_id) THEN
    INSERT INTO simulation_tenant_changes (tenant_id, table_name, operation, record_id, new_data)
    VALUES (NEW.tenant_id, TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to all patient tables (one-time setup per table)
CREATE TRIGGER track_changes_patient_vitals
  AFTER INSERT OR UPDATE ON patient_vitals
  FOR EACH ROW EXECUTE FUNCTION track_patient_data_changes();

-- Then reset just replays changes backwards
CREATE OR REPLACE FUNCTION reset_simulation_via_changes(p_simulation_id uuid)
RETURNS json AS $$
BEGIN
  -- Delete all records changed since snapshot
  DELETE FROM simulation_tenant_changes 
  WHERE tenant_id = v_tenant_id 
    AND changed_at > v_snapshot_time;
  
  -- Restore snapshot
  PERFORM restore_snapshot_to_tenant(...);
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

### Benefits:
✅ **Perfect history** of what changed  
✅ **Can rollback** to any point in time  
✅ **Audit trail** for compliance  
✅ **Automatic tracking** - no code needed  

### Drawbacks:
⚠️ Storage overhead (stores all changes)  
⚠️ Performance impact (trigger on every insert/update)  
⚠️ Complex setup (trigger per table)  

---

## My Recommendation for You 🎯

Use **Solution 2: Metadata-Driven Configuration**

### Why:
1. ✅ **Solves your maintenance problem** - Add new table = 1 INSERT statement
2. ✅ **Clear documentation** - Config table shows what's captured
3. ✅ **Flexible** - Can disable tables for debugging
4. ✅ **Not too complex** - Understandable SQL
5. ✅ **Preserves your existing logic** - Just makes it data-driven

### Implementation Plan:

**Phase 1: Setup Config (1 hour)**
1. Create `simulation_table_config` table
2. Populate with your current 15-17 tables
3. Test queries against config

**Phase 2: Migrate save_template_snapshot (2 hours)**
1. Create `save_template_snapshot_v3` using config
2. Test with existing template
3. Compare output with v1 (should be identical)
4. Switch production to v3

**Phase 3: Migrate restore_snapshot_to_tenant (3 hours)**
1. Create `restore_snapshot_to_tenant_v3` using config
2. Handle ID mappings from config metadata
3. Test launch simulation
4. Verify barcodes preserved

**Phase 4: Migrate reset_simulation (4 hours)**
1. Create `reset_simulation_v3` using config
2. Use delete_order from config
3. Test reset thoroughly
4. Deploy to production

**Phase 5: Future** - Just Add Config Rows!
```sql
-- Add new feature (e.g., nursing_shifts table)
INSERT INTO simulation_table_config 
  (table_name, category, has_tenant_id, has_patient_id, delete_order)
VALUES
  ('nursing_shifts', 'clinical', true, true, 5);

-- Done! Next snapshot automatically captures it.
```

---

## Alternative: Hybrid Approach (QUICK WIN)

Keep your current functions but add a **validation check**:

```sql
-- Function to check if all patient tables are captured
CREATE OR REPLACE FUNCTION validate_simulation_coverage()
RETURNS TABLE(
  table_name text,
  in_save_snapshot boolean,
  in_restore_snapshot boolean,
  in_reset_simulation boolean,
  status text
) AS $$
BEGIN
  RETURN QUERY
  WITH patient_tables AS (
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND (t.table_name LIKE 'patient_%' OR t.table_name IN ('diabetic_records', 'bowel_records', ...))
  ),
  captured_tables AS (
    SELECT unnest(ARRAY[
      'patients', 'patient_medications', 'patient_vitals', ... -- List from save_template_snapshot
    ]) as table_name
  )
  SELECT 
    pt.table_name,
    ct.table_name IS NOT NULL as in_save_snapshot,
    true as in_restore_snapshot, -- Would need to parse function
    true as in_reset_simulation,
    CASE 
      WHEN ct.table_name IS NULL THEN '❌ MISSING FROM SNAPSHOT'
      ELSE '✅ Captured'
    END as status
  FROM patient_tables pt
  LEFT JOIN captured_tables ct ON ct.table_name = pt.table_name;
END;
$$ LANGUAGE plpgsql;

-- Run this after adding new tables
SELECT * FROM validate_simulation_coverage();
```

This at least **alerts you** when you forget to add a table!

---

## Summary

| Solution | Setup Time | Maintenance | Flexibility | My Rating |
|----------|-----------|-------------|-------------|-----------|
| **Dynamic Discovery** | 2 hours | None | High | ⭐⭐⭐ |
| **Config Table** | 4 hours | 1 INSERT per table | Very High | ⭐⭐⭐⭐⭐ |
| **Trigger-Based** | 8+ hours | None | Extreme | ⭐⭐⭐⭐ |
| **Validation Check** | 30 min | Manual | Low | ⭐⭐ |
| **Current (Manual)** | 0 hours | 4-6 hours per table | None | ⭐ |

---

## Next Steps

Want me to:
1. **Create the config table** and populate it with your current tables?
2. **Build save_template_snapshot_v3** that uses config?
3. **Show you** how to add labs with just one INSERT?
4. **Keep current functions** and just add validation?

Which approach interests you most?
