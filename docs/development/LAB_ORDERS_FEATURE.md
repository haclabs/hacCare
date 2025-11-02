# Lab Orders Feature - Deployment Guide

## Overview
Complete lab specimen ordering system with cascading dropdowns and printable 4x4" specimen labels.

## Features Implemented

### 1. Database Schema
**File:** `/database/migrations/lab_orders.sql`
- Table: `lab_orders` with comprehensive tracking
- Fields: procedure_category, procedure_type, source_category, source_type (text fields for flexibility)
- RLS policies using tenant_users pattern (same as hacMap)
- Auto-tenant triggers
- Status tracking: pending, collected, sent, resulted
- Label printing flags and timestamps

### 2. TypeScript Types & Constants
**File:** `/src/features/clinical/types/labOrders.ts`
- **LAB_PROCEDURES** object with 6 categories:
  - Urine Specimens (7 tests)
  - Swabs/Cultures (10 tests)
  - Blood Specimens (9 tests)
  - Stool Specimens (4 tests)
  - Sputum/Respiratory (4 tests)
  - Other Body Fluids (6 tests)

- **LAB_SOURCES** object with 6 categories:
  - Urine Sources (5 sites)
  - Respiratory Sources (7 sites)
  - Wound/Skin Sources (6 sites)
  - Blood Sources (5 sites)
  - GI/GU Sources (6 sites)
  - Other Body Sites (6 sites)

- Helper functions: getProcedureCategories(), getProcedureTypes(), getSourceCategories(), getSourceTypes()
- TypeScript interfaces: LabOrder, CreateLabOrderInput

### 3. Service Layer
**File:** `/src/services/clinical/labOrderService.ts`
- `createLabOrder(input, tenantId)` - Create new order
- `getLabOrders(patientId, tenantId)` - Fetch all patient orders
- `getLabOrder(orderId)` - Get single order
- `updateLabOrderStatus(orderId, status)` - Change status
- `markLabelPrinted(orderId)` - Track label printing
- `deleteLabOrder(orderId)` - Remove order

### 4. React Components

#### LabOrderEntryForm
**File:** `/src/features/patients/components/LabOrderEntryForm.tsx`
- Auto-populates patient info (name, MRN, DOB)
- Auto-populates current date/time (24-hour format)
- Cascading Procedure dropdown (category → specific test)
- Cascading Source dropdown (category → specific site)
- Initials field with verification note
- Notes field (optional)
- Submit → creates order + generates printable label

#### Labs Component (Enhanced)
**File:** `/src/features/patients/components/Labs.tsx`
- Added new "Enter Lab Order" tab (green button)
- Tab shows LabOrderEntryForm component
- Returns to "All" tab after successful order submission

### 5. Label Printing
- **Size:** 4x4 inches (288px x 288px)
- **Content:**
  - **Bold patient name**
  - MRN
  - DOB
  - Date & time
  - Procedure type (bold, highlighted)
  - Source type
  - Verified by initials
  - Order ID
- Opens in new window with print dialog
- Can be printed on standard printer until label printer is purchased

## Deployment Steps

### Step 1: Deploy Database Schema
```sql
-- Run in Supabase SQL Editor
-- File: /database/migrations/lab_orders.sql
```

This will create:
- `lab_orders` table
- RLS policies for tenant isolation
- Triggers for auto-tenant and timestamps
- Indexes for performance

### Step 2: Verify Installation
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'lab_orders';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'lab_orders';

-- Check policy exists
SELECT tablename, policyname FROM pg_policies 
WHERE tablename = 'lab_orders';
```

### Step 3: Test the Feature
1. Navigate to patient dashboard
2. Click "Labs" button
3. Click "Enter Lab Order" tab (green button)
4. Fill out form:
   - Patient info auto-populated ✓
   - Current date/time auto-populated ✓
   - Select procedure category (e.g., "Blood Specimens")
   - Select specific procedure (e.g., "Blood Culture")
   - Select source category (e.g., "Blood Sources")
   - Select specific source (e.g., "Peripheral Venous")
   - Enter your initials
   - Add notes (optional)
5. Click "Create Order & Print Label"
6. Label opens in new window
7. Print dialog appears automatically

## Security
- RLS enabled using tenant_users table lookup (NOT JWT claims)
- Super admin users can access all data
- Regular users can only access data from their assigned tenants
- Auto-tenant trigger ensures correct tenant_id on insert
- created_by and verified_by track user actions

## Technical Details

### Cascading Dropdown Logic
1. User selects procedure category → `handleProcedureCategoryChange()`
2. Component calls `getProcedureTypes(category)` → populates dropdown
3. User selects source category → `handleSourceCategoryChange()`
4. Component calls `getSourceTypes(category)` → populates dropdown

### Why Text Fields Instead of Enums?
- Maximum flexibility for medical terminology
- Easy to add new options without database migrations
- Supports comprehensive specimen types (40+ procedures, 30+ sources)
- Future-proof design

### Label Generation
- Pure HTML/CSS - no external libraries
- Uses window.open() + window.print()
- @media print CSS ensures proper 4x4" size
- setTimeout ensures content loads before print dialog

## Files Created/Modified

### Created
- `/database/migrations/lab_orders.sql`
- `/src/features/clinical/types/labOrders.ts`
- `/src/services/clinical/labOrderService.ts`
- `/src/features/patients/components/LabOrderEntryForm.tsx`
- `/docs/development/LAB_ORDERS_FEATURE.md` (this file)

### Modified
- `/src/features/patients/components/Labs.tsx` - Added "Enter Lab Order" tab
- `/src/components/ModularPatientDashboard.tsx` - Added patientDOB prop to Labs component

## Future Enhancements

### Potential Additions
1. **Lab Order History Tab** - Display all orders for patient
2. **Barcode Generation** - Add barcode/QR code to labels
3. **Status Updates** - Allow marking orders as collected/sent/resulted
4. **Reprint Labels** - Reprint label from order history
5. **Order Templates** - Save frequently used order combinations
6. **Batch Orders** - Create multiple orders at once
7. **Integration** - Connect to lab information system (LIS)
8. **Results Entry** - Enter lab results directly from order

### Label Printer Integration
When dedicated label printer is purchased:
- Update label dimensions to match printer specs
- Add printer-specific formatting
- Consider thermal printer compatibility
- May need to use printer's SDK/API

## Troubleshooting

### Issue: RLS blocking inserts
**Solution:** Ensure user has active record in tenant_users table

### Issue: Label not printing
**Solution:** Check browser popup blocker settings

### Issue: Cascading dropdowns not populating
**Solution:** Verify LAB_PROCEDURES and LAB_SOURCES objects in labOrders.ts

### Issue: Date/time showing wrong format
**Solution:** Uses 24-hour format by default, check time utility functions

## Support
For questions or issues, contact development team or refer to:
- `/docs/development/24_HOUR_TIME_FORMAT_MIGRATION.md` - Time format standards
- `/docs/database/PATIENT_TABLES_REFERENCE.md` - Database patterns
- `/docs/architecture/security/RLS_PATTERNS.md` - Security patterns

---

**Status:** ✅ Complete and ready for deployment
**Last Updated:** 2024-01-XX
**Version:** 1.0.0
