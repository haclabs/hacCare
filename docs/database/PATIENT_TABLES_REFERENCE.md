# Patient Data Tables Reference

This document maps all patient-related tables and their columns for use in:
- Patient Transfer (duplicate_patient_to_tenant)
- Simulation Snapshot (save_template_snapshot)
- Simulation Restore (restore_snapshot_to_tenant)
- Backup/Export Functions

## Core Patient Tables

### 1. patients
Primary patient record

COLUMNS:
- id (UUID, primary key)
- tenant_id (UUID, references tenant)
- patient_id (TEXT, unique identifier like "P12345")
- first_name (TEXT)
- last_name (TEXT)
- date_of_birth (DATE)
- gender (TEXT)
- admission_date (TIMESTAMPTZ)
- room_number (TEXT)
- bed_number (TEXT)
- allergies (TEXT)
- condition (TEXT)
- diagnosis (TEXT)
- blood_type (TEXT)
- emergency_contact_name (TEXT)
- emergency_contact_relationship (TEXT)
- emergency_contact_phone (TEXT)
- assigned_nurse (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: One-to-many with all other patient tables via patient_id

---

### 2. patient_vitals
Vital signs records (temperature, BP, HR, etc.)

COLUMNS:
- id (UUID, primary key)
- patient_id (UUID or TEXT, references patients)
- tenant_id (UUID)
- temperature (NUMERIC)
- blood_pressure_systolic (INTEGER)
- blood_pressure_diastolic (INTEGER)
- heart_rate (INTEGER)
- respiratory_rate (INTEGER)
- oxygen_saturation (INTEGER)
- oxygen_delivery (TEXT)
- recorded_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: Many vitals records per patient
TRANSFER: Yes (if p_include_vitals = true)

---

### 3. patient_medications
Current and historical medications

COLUMNS:
- id (UUID, primary key)
- patient_id (UUID or TEXT, references patients)
- tenant_id (UUID)
- name (TEXT)
- dosage (TEXT)
- frequency (TEXT)
- route (TEXT)
- start_date (DATE)
- end_date (DATE)
- prescribed_by (TEXT)
- admin_time (TEXT)
- admin_times (TEXT[])
- last_administered (TIMESTAMPTZ)
- next_due (TIMESTAMPTZ)
- status (TEXT: active, completed, discontinued)
- category (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: Many medications per patient
TRANSFER: Yes (if p_include_medications = true)
NOTE: Generates new barcode via UUID for BCMA scanning

---

### 4. medication_administrations (bcma_medication_administrations)
Medication administration history

COLUMNS:
- id (UUID, primary key)
- patient_id (UUID or TEXT)
- tenant_id (UUID)
- medication_id (UUID, references patient_medications)
- administered_at (TIMESTAMPTZ)
- administered_by_id (UUID)
- administered_by_name (TEXT)
- dose_given (TEXT)
- route_used (TEXT)
- notes (TEXT)
- status (TEXT)
- created_at (TIMESTAMPTZ)

RELATIONSHIP: Many administrations per medication
TRANSFER: Yes (if p_include_medications = true)

---

### 5. patient_notes
Clinical notes and assessments

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT, references patients.patient_id)
- tenant_id (UUID)
- note_type (TEXT: nursing_note, assessment, physical, pain, neurological)
- note_text (TEXT)
- created_by_id (UUID)
- created_by_name (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: Many notes per patient
TRANSFER: Yes (if p_include_assessments = true)
NOTE: Nursing assessments stored here with specific note_types

---

### 6. patient_alerts
Active patient alerts and warnings

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT)
- tenant_id (UUID)
- alert_type (TEXT)
- title (TEXT)
- description (TEXT)
- severity (TEXT: info, warning, critical)
- created_by_id (UUID)
- created_by_name (TEXT)
- acknowledged (BOOLEAN)
- acknowledged_by (TEXT)
- acknowledged_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)

RELATIONSHIP: Many alerts per patient
TRANSFER: Yes (if p_include_alerts = true)

---

### 7. handover_notes
SBAR handover notes for shift changes

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT)
- tenant_id (UUID)
- situation (TEXT)
- background (TEXT)
- assessment (TEXT)
- recommendation (TEXT)
- created_by_id (UUID)
- created_by_name (TEXT)
- shift_date (DATE)
- shift_time (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: Many handover notes per patient
TRANSFER: Yes (if p_include_handover_notes = true)

---

### 8. doctors_orders
Physician orders and treatments

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT)
- tenant_id (UUID)
- order_type (TEXT)
- order_text (TEXT)
- ordered_by (TEXT)
- ordered_at (TIMESTAMPTZ)
- status (TEXT: active, completed, cancelled)
- priority (TEXT: routine, urgent, stat)
- completed_at (TIMESTAMPTZ)
- completed_by (TEXT)
- notes (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: Many orders per patient
TRANSFER: Yes (if p_include_doctors_orders = true)

---

## Specialized Patient Tables

### 9. diabetic_records
Blood glucose monitoring and insulin administration

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT)
- tenant_id (UUID)
- blood_glucose (NUMERIC)
- insulin_dose (NUMERIC)
- insulin_type (TEXT)
- meal_type (TEXT: fasting, pre-meal, post-meal, bedtime)
- recorded_at (TIMESTAMPTZ)
- recorded_by_id (UUID)
- recorded_by_name (TEXT)
- notes (TEXT)
- created_at (TIMESTAMPTZ)

RELATIONSHIP: Many records per patient
TRANSFER: Yes (if p_include_diabetic_records = true)

---

### 10. bowel_records
Bowel movement assessments

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT)
- tenant_id (UUID)
- nurse_id (TEXT)
- nurse_name (TEXT)
- recorded_at (TIMESTAMPTZ)
- bowel_incontinence (TEXT: Continent, Incontinent, Partial)
- stool_appearance (TEXT: Normal, Abnormal, Blood present, Mucus present)
- stool_consistency (TEXT: Formed, Loose, Watery, Hard, Soft)
- stool_colour (TEXT: Brown, Green, Yellow, Black, Red, Clay colored)
- stool_amount (TEXT: Small, Moderate, Large, None)
- notes (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: Many records per patient
TRANSFER: Yes (if p_include_bowel_records = true)

---

### 11. patient_wounds
Wound tracking and documentation

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT)
- tenant_id (UUID)
- wound_location (TEXT)
- wound_type (TEXT)
- wound_stage (TEXT)
- length (NUMERIC)
- width (NUMERIC)
- depth (NUMERIC)
- status (TEXT: active, healing, healed)
- first_observed (DATE)
- created_by_id (UUID)
- created_by_name (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: Many wounds per patient
TRANSFER: Yes (if p_include_wound_care = true)

---

### 12. wound_assessments
Wound assessment details

COLUMNS:
- id (UUID, primary key)
- wound_id (UUID, references patient_wounds)
- patient_id (TEXT)
- tenant_id (UUID)
- assessed_by_id (UUID)
- assessed_by_name (TEXT)
- assessed_at (TIMESTAMPTZ)
- appearance (TEXT)
- drainage_type (TEXT)
- drainage_amount (TEXT)
- pain_level (INTEGER)
- odor (TEXT)
- surrounding_skin (TEXT)
- measurement_length (NUMERIC)
- measurement_width (NUMERIC)
- measurement_depth (NUMERIC)
- notes (TEXT)
- created_at (TIMESTAMPTZ)

RELATIONSHIP: Many assessments per wound
TRANSFER: Yes (if p_include_wound_care = true)

---

### 13. wound_treatments
Wound care interventions

COLUMNS:
- id (UUID, primary key)
- wound_id (UUID, references patient_wounds)
- patient_id (TEXT)
- tenant_id (UUID)
- treatment_type (TEXT)
- dressing_type (TEXT)
- performed_by_id (UUID)
- performed_by_name (TEXT)
- performed_at (TIMESTAMPTZ)
- notes (TEXT)
- next_treatment_due (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)

RELATIONSHIP: Many treatments per wound
TRANSFER: Yes (if p_include_wound_care = true)

---

### 14. patient_admission_records
Admission details and social history

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT, unique per patient)
- tenant_id (UUID)
- admission_type (TEXT)
- attending_physician (TEXT)
- insurance_provider (TEXT)
- insurance_policy (TEXT)
- admission_source (TEXT)
- chief_complaint (TEXT)
- height (TEXT)
- weight (TEXT)
- bmi (TEXT)
- smoking_status (TEXT)
- alcohol_use (TEXT)
- exercise (TEXT)
- occupation (TEXT)
- family_history (TEXT)
- marital_status (TEXT)
- secondary_contact_name (TEXT)
- secondary_contact_relationship (TEXT)
- secondary_contact_phone (TEXT)
- secondary_contact_address (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: One admission record per patient
TRANSFER: Yes (included in patient transfer)

---

### 15. patient_advanced_directives
Legal and care preferences

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT, unique per patient)
- tenant_id (UUID)
- living_will_status (TEXT)
- living_will_date (TEXT)
- healthcare_proxy_name (TEXT)
- healthcare_proxy_phone (TEXT)
- dnr_status (TEXT)
- organ_donation_status (TEXT)
- organ_donation_details (TEXT)
- religious_preference (TEXT)
- special_instructions (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

RELATIONSHIP: One directives record per patient
TRANSFER: Yes (included in patient transfer)

---

### 16. patient_images
Patient photos and wound photos

COLUMNS:
- id (UUID, primary key)
- patient_id (TEXT)
- tenant_id (UUID)
- image_type (TEXT: profile, wound, other)
- image_url (TEXT)
- image_caption (TEXT)
- uploaded_by_id (UUID)
- uploaded_by_name (TEXT)
- created_at (TIMESTAMPTZ)

RELATIONSHIP: Many images per patient
TRANSFER: Optional (not currently included in standard transfer)
NOTE: Requires file storage handling, not just database copy

---

## Table Relationships Summary

```
patients (1)
├── patient_vitals (many)
├── patient_medications (many)
│   └── medication_administrations (many)
├── patient_notes (many)
├── patient_alerts (many)
├── handover_notes (many)
├── doctors_orders (many)
├── diabetic_records (many)
├── bowel_records (many)
├── patient_wounds (many)
│   ├── wound_assessments (many)
│   └── wound_treatments (many)
├── patient_admission_records (one)
├── patient_advanced_directives (one)
└── patient_images (many)
```

## Functions That Use These Tables

### duplicate_patient_to_tenant
Copies patient and selected data types to another tenant

PARAMETERS:
- p_source_patient_id (TEXT): Source patient identifier
- p_target_tenant_id (UUID): Destination tenant
- p_new_patient_id (TEXT, optional): New patient ID
- p_include_vitals (BOOLEAN): Copy vitals
- p_include_medications (BOOLEAN): Copy medications
- p_include_assessments (BOOLEAN): Copy notes/assessments
- p_include_handover_notes (BOOLEAN): Copy SBAR notes
- p_include_alerts (BOOLEAN): Copy alerts
- p_include_diabetic_records (BOOLEAN): Copy glucose records
- p_include_bowel_records (BOOLEAN): Copy bowel records
- p_include_wound_care (BOOLEAN): Copy wounds/assessments/treatments
- p_include_doctors_orders (BOOLEAN): Copy physician orders

TABLES COPIED:
1. patients (always)
2. patient_vitals (if p_include_vitals)
3. patient_medications (if p_include_medications)
4. medication_administrations (if p_include_medications)
5. patient_notes (if p_include_assessments)
6. handover_notes (if p_include_handover_notes)
7. patient_alerts (if p_include_alerts)
8. diabetic_records (if p_include_diabetic_records)
9. bowel_records (if p_include_bowel_records)
10. patient_wounds (if p_include_wound_care)
11. wound_assessments (if p_include_wound_care)
12. wound_treatments (if p_include_wound_care)
13. doctors_orders (if p_include_doctors_orders)
14. patient_admission_records (always, if exists)
15. patient_advanced_directives (always, if exists)

NOT COPIED:
- patient_images (requires file storage handling)

---

### save_template_snapshot
Saves simulation state including all patient data

SHOULD INCLUDE ALL TABLES:
- All tables listed above
- Simulation-specific state (active medications, current time, etc.)

---

### restore_snapshot_to_tenant
Restores saved snapshot to a tenant

SHOULD RESTORE ALL TABLES:
- All patient tables from snapshot
- Reset state to snapshot timestamp

---

### Backup/Export Functions
Full tenant data export for disaster recovery

SHOULD INCLUDE ALL TABLES:
- All patient tables
- All clinical data
- Full relationship preservation

---

## Common Patterns

### Patient Identifier Field Names
- patients.id (UUID)
- patients.patient_id (TEXT like "P12345")
- Other tables reference via:
  - patient_id (UUID) - joins to patients.id
  - patient_id (TEXT) - joins to patients.patient_id
  
NOTE: Check each table schema for whether it uses UUID or TEXT

### Tenant Isolation
ALL patient tables MUST have:
- tenant_id (UUID) column
- RLS policies filtering by user's active_tenant_id
- Indexes on tenant_id for performance

### Standard Audit Fields
Most tables include:
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- created_by_id (UUID, optional)
- created_by_name (TEXT, optional)

### Barcode Generation
Barcodes auto-generate from UUIDs when labels printed:
- Patient barcode: PT{patient.id}
- Medication barcode: MED{medication.id}
- No manual barcode field needed

---

## ✅ Function Coverage Status (Updated Oct 30, 2025)

### duplicate_patient_to_tenant - ✅ COMPLETE
**Location:** `database/functions/duplicate_patient_to_tenant_enhanced.sql`
**Status:** All 15 tables implemented
**Includes:**
- All core tables (patients, vitals, medications, medication_administrations)
- All assessment tables (notes, alerts, handover_notes, doctors_orders)
- All specialized records (diabetic_records, bowel_records, wounds, wound_assessments, wound_treatments)
- All administrative records (patient_admission_records, patient_advanced_directives)

### save_template_snapshot - ✅ COMPLETE
**Location:** `database/schema.sql` line 4233
**Status:** All 16 tables captured in snapshot
**Includes:**
- ✅ patients
- ✅ patient_vitals
- ✅ patient_medications
- ✅ patient_notes
- ✅ patient_alerts
- ✅ diabetic_records
- ✅ bowel_records (newly added)
- ✅ patient_admission_records (newly added)
- ✅ patient_advanced_directives (newly added)
- ✅ patient_wounds
- ✅ wound_assessments
- ✅ handover_notes
- ✅ doctors_orders
- ✅ patient_images

### restore_snapshot_to_tenant - ✅ COMPLETE
**Location:** `database/schema.sql` line 4368
**Status:** All 16 tables restored from snapshot
**Includes:**
- ✅ patients (with ID mapping)
- ✅ patient_vitals
- ✅ patient_medications
- ✅ patient_notes
- ✅ patient_alerts
- ✅ diabetic_records
- ✅ bowel_records (newly added)
- ✅ patient_admission_records (newly added)
- ✅ patient_advanced_directives (newly added)
- ✅ patient_wounds (with ID mapping)
- ✅ wound_assessments
- ✅ handover_notes
- ✅ doctors_orders
- ✅ patient_images

### backup functions - ⚠️ NEEDS VERIFICATION
**Status:** Need to check if backup scripts include new tables
**Should verify:**
- bowel_records (newly added)
- patient_admission_records (newly added)
- patient_advanced_directives (newly added)

---

## Quick Reference: Table Names List

Core patient data:
1. patients
2. patient_vitals
3. patient_medications
4. medication_administrations
5. patient_notes
6. patient_alerts
7. handover_notes
8. doctors_orders

Specialized assessments:
9. diabetic_records
10. bowel_records
11. patient_wounds
12. wound_assessments
13. wound_treatments

Administrative:
14. patient_admission_records
15. patient_advanced_directives
16. patient_images

Total: 16 patient-related tables
