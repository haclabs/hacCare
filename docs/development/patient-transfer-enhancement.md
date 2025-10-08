# Patient Transfer Enhancement

## Overview

Enhanced the patient transfer/duplication feature to include ALL patient data types visible in the patient overview screen.

## Problem

The patient transfer modal was missing several important data types when duplicating or moving patients between tenants:

### Previously Available (4 options):
- ✅ Vital Signs
- ✅ Medications
- ✅ Notes
- ✅ Assessments

### Newly Added (6 options):
- ✅ **Handover Notes** - SBAR communication framework for care transitions
- ✅ **Doctors Orders** - Physician orders and prescriptions
- ✅ **Wound Care** - Wound assessments and treatments
- ✅ **Patient Alerts** - Active alerts and notifications
- ✅ **Diabetic Records** - Blood glucose monitoring and insulin administration
- ✅ **Bowel Records** - Bristol stool scale and bowel movement tracking

## Changes Made

### 1. Frontend - PatientTransferModal.tsx
Added 6 new checkbox options to the transfer modal:
- `transferHandoverNotes` - Handover Notes (SBAR) 🔄
- `transferDoctorsOrders` - Doctors Orders 🪺
- `transferWoundCare` - Wound Care 🏥
- `transferAlerts` - Patient Alerts 🚨
- `transferDiabeticRecords` - Diabetic Records 🩸
- `transferBowelRecords` - Bowel Records 📊

### 2. Service Layer - patientTransferService.ts
Updated the `PatientTransferOptions` interface to include all new options:
```typescript
export interface PatientTransferOptions {
  sourcePatientId: string;
  targetTenantId: string;
  preserveOriginal?: boolean;
  
  // Original options
  transferNotes?: boolean;
  transferVitals?: boolean;
  transferMedications?: boolean;
  transferAssessments?: boolean;
  
  // NEW options
  transferHandoverNotes?: boolean;
  transferAlerts?: boolean;
  transferDiabeticRecords?: boolean;
  transferBowelRecords?: boolean;
  transferWoundCare?: boolean;
  transferDoctorsOrders?: boolean;
  
  newPatientId?: string;
}
```

All new options default to `true` for comprehensive patient data transfer.

### 3. Database Function - duplicate_patient_to_tenant_enhanced.sql
Created an enhanced version of the database function that handles all the new data types.

**Location:** `/docs/development/database/functions/duplicate_patient_to_tenant_enhanced.sql`

**New Parameters:**
- `p_include_handover_notes` - Copy SBAR handover notes
- `p_include_alerts` - Copy patient alerts
- `p_include_diabetic_records` - Copy diabetic monitoring data
- `p_include_bowel_records` - Copy bowel movement records
- `p_include_wound_care` - Copy wound assessments AND treatments
- `p_include_doctors_orders` - Copy physician orders

**Features:**
- ✅ Checks if tables exist before attempting to copy (graceful handling)
- ✅ Properly sets `tenant_id` on all copied records
- ✅ Maintains referential integrity (wound treatments link to wound assessments)
- ✅ Returns detailed count of records copied for each type
- ✅ Uses `SECURITY DEFINER` with `search_path = public` for security

## Database Tables Involved

The function now copies data from these tables:

| Table | Description | Key Fields |
|-------|-------------|-----------|
| `handover_notes` | SBAR handover notes | situation, background, assessment, recommendations |
| `patient_alerts` | Active alerts | alert_type, severity, message |
| `diabetic_records` | Blood glucose tracking | blood_glucose, insulin_dose, carbohydrate_intake |
| `bowel_records` | Bowel movements | bristol_stool_scale, consistency, volume |
| `wound_assessments` | Wound evaluations | wound_location, dimensions, wound_bed, exudate |
| `wound_treatments` | Wound care treatments | treatment_type, dressing_type, topical_medication |
| `doctors_orders` | Physician orders | order_type, order_details, priority, status |

## Installation Instructions

### Step 1: Run the Enhanced Database Function
Run this SQL in Supabase SQL Editor:
```bash
/docs/development/database/functions/duplicate_patient_to_tenant_enhanced.sql
```

This will create or replace the `duplicate_patient_to_tenant` function with full support for all data types.

### Step 2: Test the Feature
1. Navigate to **Patient Management**
2. Select a patient with diverse data (vitals, wound care, handover notes, etc.)
3. Click the **Transfer** button
4. Choose **Duplicate** mode
5. Select target tenant
6. **Review the checkboxes** - you should now see 10 options instead of 4
7. Customize what to transfer
8. Execute the transfer

### Step 3: Verify Results
Check the target tenant to ensure all selected data was copied:
- Patient overview should show all data types
- Record counts should match the source patient (if all options were selected)
- All records should have the correct `tenant_id`

## Benefits

1. **Complete Patient Profiles** - No more missing data when transferring patients
2. **Flexible Selection** - Users can choose exactly what data to transfer
3. **Simulation Support** - Perfect for creating simulation scenarios with full patient history
4. **Training Cases** - Educators can duplicate complex patients for training exercises
5. **Tenant Migration** - Easily move complete patient records between organizations

## Data Preservation

When duplicating (not moving):
- ✅ Original patient remains untouched in source tenant
- ✅ New patient gets a unique ID (auto-generated or specified)
- ✅ All timestamps are preserved
- ✅ User references (created_by, recorded_by) are preserved
- ✅ Foreign keys are updated to link to the new patient

## Testing Checklist

- [ ] UI shows all 10 transfer options
- [ ] Default state has all checkboxes selected
- [ ] Can deselect individual options
- [ ] Transfer completes successfully with all options
- [ ] Transfer completes successfully with selective options
- [ ] Copied records have correct tenant_id
- [ ] Source patient unchanged when duplicating
- [ ] Source patient removed when moving
- [ ] New patient ID is unique
- [ ] Record counts match expectations

## Future Enhancements

Potential additions:
- [ ] File attachments (images, documents)
- [ ] Advanced directives
- [ ] Family contact information
- [ ] Care plans
- [ ] Lab results
- [ ] Discharge summaries
- [ ] Transfer requests

## Related Files

- `/src/components/Patients/PatientTransferModal.tsx` - UI component
- `/src/lib/patientTransferService.ts` - Service layer
- `/docs/development/database/functions/duplicate_patient_to_tenant_enhanced.sql` - Database function
- `/src/hooks/usePatientTransfer.ts` - React hook (no changes needed)

## Notes

- The database function gracefully handles missing tables (checks existence first)
- All new options default to `true` for backward compatibility
- The function uses type casting (`patient_id::text`) to handle UUID/TEXT mismatches
- Wound care includes BOTH assessments and treatments
- The function is `SECURITY DEFINER` to allow cross-tenant access with proper permissions
