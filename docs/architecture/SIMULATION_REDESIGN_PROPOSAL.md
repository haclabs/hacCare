# 🎯 Simulation System Redesign Proposal

## Current Problems

### 1. Schema Dependency Hell
- Every table change requires updating 3+ simulation functions
- Snapshots become incompatible when schema changes
- Complex column existence checks everywhere
- Brittle hardcoded field mappings

### 2. Maintenance Burden
- Adding a new feature = updating simulation code
- Old templates break when database evolves
- Error-prone manual schema synchronization
- Complex restore logic for every table

### 3. The Root Cause
**The simulation system shouldn't know about specific database schemas!**

## Better Architecture: Schema-Agnostic Design

### Core Principle
Instead of capturing specific table structures, capture **generic data operations** that work regardless of schema changes.

## Option 1: Dynamic Schema-Aware Snapshots (Recommended)

### How It Works
```sql
-- Instead of hardcoded table lists, discover tables dynamically
CREATE OR REPLACE FUNCTION save_template_snapshot_v2(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  
  -- Dynamically discover all tables with tenant_id column
  FOR v_table_record IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
  LOOP
    -- Capture data from each tenant-aware table
    EXECUTE format('
      SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json)
      FROM %I t WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data
    USING v_tenant_id;
    
    -- Add to snapshot
    v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
  END LOOP;
  
  -- Also capture tables linked via patients (dynamic discovery)
  FOR v_table_record IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns c2 WHERE c2.table_name = t.table_name AND c2.column_name = 'tenant_id')
  LOOP
    -- Capture data linked to patients in this tenant
    EXECUTE format('
      SELECT COALESCE(json_agg(row_to_json(t.*)), ''[]''::json)
      FROM %I t 
      JOIN patients p ON p.id = t.patient_id 
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data
    USING v_tenant_id;
    
    -- Add to snapshot
    v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
  END LOOP;
  
  -- Store snapshot with schema version
  UPDATE simulation_templates SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready'
  WHERE id = p_template_id;
  
  RETURN json_build_object('success', true, 'tables_captured', jsonb_object_keys(v_snapshot));
END;
$$ LANGUAGE plpgsql;
```

### Benefits
✅ **Zero maintenance** - works with any new tables/columns  
✅ **Schema evolution proof** - automatically adapts  
✅ **No hardcoded table lists** - discovers dynamically  
✅ **Future-proof** - new features work automatically  

## Option 2: State-Based Templates (Even Better)

### Concept
Instead of snapshots, use **template state definitions** that generate data on-demand:

```yaml
# Template: ICU Patient Scenario
template_id: "icu-patient-basic"
name: "ICU Patient - Basic Vitals"

# State definitions (not actual data)
patients:
  - template_id: "patient_001"
    demographics:
      age_range: [65, 75]
      gender: "M"
      condition: "Post-op cardiac surgery"
    
vitals_pattern:
  - vital_type: "blood_pressure"
    range: [120-140, 80-90]
    frequency: "every_4_hours"
    trend: "stable"
  
medications:
  - name: "Metoprolol"
    dose: "25mg"
    frequency: "BID"
    route: "PO"
```

### How It Works
1. **Template Definition**: Describes what SHOULD exist, not specific data
2. **Runtime Generation**: Creates actual data when simulation starts
3. **Schema Agnostic**: Works with any table structure
4. **Intelligent**: Generates realistic data based on patterns

## Option 3: Tenant Cloning (Simplest)

### Concept
Instead of complex snapshots, simply clone the entire template tenant:

```sql
-- Clone all data from template tenant to simulation tenant
CREATE OR REPLACE FUNCTION launch_simulation_v2(p_template_id uuid, p_name text)
RETURNS json AS $$
DECLARE
  v_template_tenant_id uuid;
  v_new_tenant_id uuid;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_template_tenant_id FROM simulation_templates WHERE id = p_template_id;
  
  -- Create new simulation tenant
  INSERT INTO tenants (name, tenant_type, parent_tenant_id, is_simulation)
  VALUES (p_name, 'simulation', v_template_tenant_id, true)
  RETURNING id INTO v_new_tenant_id;
  
  -- Clone ALL tenant data (schema-agnostic)
  PERFORM clone_tenant_data(v_template_tenant_id, v_new_tenant_id);
  
  RETURN json_build_object('success', true, 'tenant_id', v_new_tenant_id);
END;
$$;

-- Generic tenant cloning function
CREATE OR REPLACE FUNCTION clone_tenant_data(p_source_tenant_id uuid, p_target_tenant_id uuid)
RETURNS void AS $$
DECLARE
  v_table_record record;
BEGIN
  -- Clone all tenant-aware tables
  FOR v_table_record IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'tenant_id' AND table_schema = 'public'
    GROUP BY table_name
  LOOP
    EXECUTE format('INSERT INTO %I SELECT * FROM %I WHERE tenant_id = $1', 
                   v_table_record.table_name, v_table_record.table_name)
    USING p_source_tenant_id;
    
    -- Update tenant_id in cloned records
    EXECUTE format('UPDATE %I SET tenant_id = $1 WHERE tenant_id = $2', 
                   v_table_record.table_name)
    USING p_target_tenant_id, p_source_tenant_id;
  END LOOP;
END;
$$;
```

### Benefits
✅ **Simple** - just copy everything  
✅ **Schema agnostic** - works with any tables  
✅ **Zero maintenance** - no function updates needed  
✅ **Reliable** - perfect data fidelity  

## Recommended Solution

I recommend **Option 1 (Dynamic Schema-Aware Snapshots)** because:

1. **Preserves existing UI/UX** - templates still work the same way
2. **Zero maintenance burden** - automatically works with new features  
3. **Backward compatible** - can migrate existing templates
4. **Classroom friendly** - still preserves medication IDs for printed labels

## Migration Plan

### Phase 1: Replace Current Functions
```sql
-- Drop broken functions
DROP FUNCTION save_template_snapshot(uuid);
DROP FUNCTION reset_simulation_for_next_session(uuid);

-- Install new schema-agnostic versions
-- (See implementation above)
```

### Phase 2: Test & Verify
1. Create new template with current schema
2. Take snapshot using new function
3. Launch simulation to verify restore works
4. Test reset functionality

### Phase 3: Clean Up
- Remove all hardcoded table references
- Delete complex column existence checks
- Simplify codebase dramatically

## The Bottom Line

**Stop fighting schema evolution!** 

Your simulation system should be a **generic data cloning mechanism**, not a healthcare-specific schema-aware monster.

With this approach:
- ✅ New features automatically work in simulations
- ✅ No more function updates when you add tables/columns  
- ✅ No more schema compatibility issues
- ✅ Much simpler, more reliable codebase
- ✅ Better developer experience
- ✅ Less maintenance burden

**Want to implement this? I can build the new functions right now.**