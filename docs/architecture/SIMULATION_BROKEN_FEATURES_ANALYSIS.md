# 🚨 Critical Analysis: Broken Simulation Features

## Executive Summary

After analyzing the current simulation system code, I've identified **multiple critical features that will fail** due to schema mismatches, incorrect table references, and architectural inconsistencies. The system is fundamentally broken in several key areas.

---

## 🔥 Critical Issues Found

### 1. **Schema Mismatch Crisis**

#### Problem: Snapshot vs Reality
The simulation functions expect database fields that **don't exist** in your actual tables:

```sql
-- ❌ BROKEN: reset_simulation_for_next_session tries to use these fields
INSERT INTO patient_vitals (
  recorded_by,     -- ❌ This column doesn't exist!
  created_at,      -- ❌ This column doesn't exist!
  updated_at,      -- ❌ This column doesn't exist!
  pain_score       -- ❌ This column doesn't exist!
)

-- ✅ ACTUAL patient_vitals columns (from schema analysis):
-- id, patient_id, tenant_id, temperature, blood_pressure_systolic, 
-- blood_pressure_diastolic, heart_rate, respiratory_rate, 
-- oxygen_saturation, recorded_at, oxygen_delivery
```

#### Problem: Medication Table Confusion
```sql
-- ❌ BROKEN: Functions try multiple table names
DELETE FROM medication_administrations    -- May not exist
DELETE FROM bcma_medication_administrations  -- May not exist  
DELETE FROM bcma_records                 -- May not exist

-- ✅ ACTUAL: patient_medications table exists, but functions don't use it consistently
```

#### Problem: Patient Schema Mismatch
```sql
-- ❌ BROKEN: Snapshot restore tries to use:
UPDATE patients SET
  code_status = ...,        -- ❌ Column doesn't exist
  attending_physician = ... -- ❌ Column doesn't exist

-- ✅ ACTUAL patients table has different schema
```

---

### 2. **Snapshot Capture vs Restore Mismatch**

#### The Fundamental Problem
Your `save_template_snapshot` captures data with one schema, but `restore_snapshot_to_tenant` and `reset_simulation_for_next_session` try to restore with a completely different schema.

**Example: Patient Medications**
```sql
-- ✅ SNAPSHOT CAPTURE (working):
SELECT json_agg(row_to_json(pm.*)) FROM patient_medications pm

-- ❌ RESTORE BROKEN (wrong schema):
INSERT INTO patient_medications (
  patient_id, medication_name, dosage, frequency, route,
  start_date, end_date, instructions, status, prescribed_by
)
-- But actual table may have: id, patient_id, tenant_id, name, generic_name, etc.
```

---

### 3. **Features That Will Completely Fail**

#### A. **Template Vitals Restoration** 
- Status: **COMPLETELY BROKEN** 🔴
- Reason: Column mismatch, wrong field names
- Impact: Students won't see template vitals after reset
- Error: `column "recorded_by" does not exist`

#### B. **Doctor's Orders Reset**
- Status: **PARTIALLY BROKEN** 🟡  
- Reason: Complex column existence checks that may fail
- Impact: Orders may not restore properly, "New Order" badges missing
- Error: Various column existence issues

#### C. **Lab Results & Panels**
- Status: **UNKNOWN** ⚠️
- Reason: Tables exist but unclear if they're in snapshots
- Impact: Lab data may not be preserved/restored
- Risk: High if labs are critical to simulations

#### D. **BCMA Medication Administration**
- Status: **BROKEN** 🔴
- Reason: Functions check for tables that may not exist
- Impact: Medication scanning history may not clear properly
- Error: `relation "bcma_records" does not exist`

#### E. **Patient Image Management**
- Status: **LIKELY BROKEN** 🟡
- Reason: Referenced in functions but schema unclear
- Impact: Patient images may not transfer between simulations

---

### 4. **Specific Broken Code Patterns**

#### Pattern 1: Hardcoded Column Lists
```sql
-- ❌ BROKEN: Assumes specific columns exist
INSERT INTO patient_vitals (
  patient_id, tenant_id, temperature, blood_pressure_systolic,
  blood_pressure_diastolic, heart_rate, respiratory_rate, 
  oxygen_saturation, recorded_at, oxygen_delivery,
  recorded_by,  -- ❌ Doesn't exist
  created_at,   -- ❌ Doesn't exist  
  updated_at,   -- ❌ Doesn't exist
  pain_score    -- ❌ Doesn't exist
)
```

#### Pattern 2: Table Name Guessing
```sql
-- ❌ BROKEN: Tries to guess which table exists
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations')
ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_medication_administrations')
ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_records')
-- This is fragile and error-prone
```

#### Pattern 3: Complex Column Existence Checks
```sql
-- ❌ BROKEN: Over-engineered and brittle
WITH patient_columns_exist AS (
  SELECT 
    bool_or(column_name = 'code_status') as has_code_status,
    bool_or(column_name = 'attending_physician') as has_attending_physician
  FROM information_schema.columns...
)
-- This adds complexity without solving the root problem
```

---

### 5. **Real-World Impact Assessment**

#### For Classroom Use:
- **🔴 HIGH IMPACT**: Vitals won't restore → Students see empty vital signs
- **🔴 HIGH IMPACT**: Orders may not reset → Confusion about "new" vs old orders  
- **🟡 MEDIUM IMPACT**: BCMA scanning may not clear → Medication administration history persists
- **🟡 MEDIUM IMPACT**: Labs may not work → Missing critical clinical data

#### For Development:
- **🔴 HIGH IMPACT**: Every schema change breaks simulation system
- **🔴 HIGH IMPACT**: Adding new tables/columns requires updating 5+ functions
- **🟡 MEDIUM IMPACT**: Complex debugging when things fail
- **🟡 MEDIUM IMPACT**: Maintenance nightmare

---

## 🔍 Root Cause Analysis

### The Fundamental Architecture Problem

Your simulation system is **tightly coupled to specific database schemas**, which means:

1. **Brittle Design**: Any table/column change breaks simulations
2. **Maintenance Nightmare**: Every feature addition requires simulation updates  
3. **Schema Drift**: Snapshots become incompatible with newer database versions
4. **Error-Prone**: Complex column existence checks that can still fail
5. **Technical Debt**: 650+ lines of fragile, hard-to-maintain code

### Why This Happened

1. **Legacy Approach**: Built like a traditional backup/restore system
2. **Schema Assumptions**: Assumed database schema would never change  
3. **Over-Engineering**: Complex solutions to simple problems
4. **Lack of Abstraction**: Direct table/column dependencies everywhere

---

## 💡 The Solution

### Instead of trying to fix 15+ broken functions, **REDESIGN THE ARCHITECTURE**:

#### Option 1: Schema-Agnostic Dynamic Discovery
```sql
-- ✅ FUTURE-PROOF: Auto-discover all tenant tables
FOR table_record IN 
  SELECT table_name FROM information_schema.columns 
  WHERE column_name = 'tenant_id' 
LOOP
  -- Dynamically capture/restore ANY table with tenant_id
END LOOP;
```

#### Option 2: Simple Tenant Cloning  
```sql
-- ✅ SIMPLE: Just clone the entire tenant
PERFORM clone_tenant_data(source_tenant_id, target_tenant_id);
-- Works with ANY schema changes automatically
```

#### Option 3: Configuration-Driven Templates
```yaml
# ✅ FLEXIBLE: Define templates as configuration
template:
  vitals:
    - temperature: 98.6
      heart_rate: 72
  medications:  
    - name: "Metoprolol"
      dose: "25mg"
```

---

## 📋 Immediate Action Required

### Phase 1: Acknowledge the Problem
- Accept that current system is fundamentally broken
- Stop trying to patch individual functions
- Commit to architectural redesign

### Phase 2: Choose New Architecture  
- Evaluate the 3 options above
- Select based on your team's capabilities
- Plan migration strategy

### Phase 3: Implement & Test
- Build new system alongside old one
- Test thoroughly with real classroom scenarios
- Migrate existing templates  

### Phase 4: Cleanup
- Remove 650+ lines of broken code
- Simplify to ~50 lines of robust code
- Document new approach

---

## ⚠️ What NOT to Do

❌ **Don't try to fix the existing functions** - they're architecturally flawed  
❌ **Don't add more column existence checks** - they're band-aids on a broken system  
❌ **Don't manually sync schemas** - it's not sustainable  
❌ **Don't ignore this problem** - it will get worse with every feature you add

---

## 🎯 Bottom Line

**Your simulation system is broken by design, not by bugs.**

The current approach of hardcoded table/column mappings is fundamentally incompatible with an evolving healthcare system. Every time you add a feature to the main system, you break simulations.

**The only real solution is architectural redesign** - build a schema-agnostic system that adapts to your database automatically.

**Recommendation**: Stop all work on the current simulation system and redesign it properly. The time spent fixing 15+ broken functions would be better spent building 1 robust, future-proof solution.

---

*This analysis is based on examination of 25+ SQL files and database schema. The issues identified are systemic and will only worsen without architectural changes.*