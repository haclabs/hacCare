# 24-Hour Time Format Migration

## Overview
Migration to use consistent 24-hour time format across the application with current system time.

## Utility Functions Added

### Location: `/src/utils/time.ts`

1. **`format24HourDateTime(dateValue)`** - Main display format
   - Returns: "MMM dd, yyyy, HH:mm" (e.g., "Nov 02, 2025, 14:30")
   - Use for: All date+time displays

2. **`format24HourTime(dateValue)`** - Time only
   - Returns: "HH:mm" (e.g., "14:30")
   - Use for: Time-only displays

3. **`getCurrentLocalDateTimeString()`** - For form inputs
   - Returns: "YYYY-MM-DDTHH:mm" (e.g., "2025-11-02T14:30")
   - Use for: datetime-local input default values

## Migration Status

### ✅ Fixed
- **Labs Module** (`src/features/patients/components/Labs.tsx`)
  - Panel time display now uses `format24HourDateTime()`
  
- **Create Lab Panel Modal** (`src/features/patients/components/CreateLabPanelModal.tsx`)
  - Default time now uses current system time via `getCurrentLocalDateTimeString()`

### 🔄 Needs Update

#### High Priority
1. **Vitals Module** (`src/features/clinical/components/vitals/VitalsModule.tsx`)
   - Line 121: Success message timestamp
   - Line 321: Latest vitals timestamp
   
2. **MAR Module** (`src/features/clinical/components/mar/MARModule.tsx`)
   - Lines 840-841: Medication date ranges
   
3. **Medication History** (`src/features/clinical/components/mar/MedicationHistoryView.tsx`)
   - Line 23: Timestamp formatting function
   - Line 138: Last updated display

#### Medium Priority
4. **BCMA Administration** (`src/features/clinical/components/BCMAAdministration.tsx`)
   - Line 598: Glucose record timestamp
   
5. **Handover Notes** (`src/features/patients/components/handover/HandoverNotesForm.tsx`)
   - Line 170: Created timestamp
   
6. **Forms Module** (`src/features/forms/components/FormsModule.tsx`)
   - Lines 245, 280: Assessment and draft timestamps

7. **Wound Care** (multiple files)
   - Assessment dates
   - Treatment dates

#### Lower Priority
8. **Patient Dashboard** (`src/components/ModularPatientDashboard.tsx`)
   - Multiple date/time displays in bracelet generation
   - Vitals timestamps
   - Note timestamps

## Migration Pattern

### Before:
```typescript
new Date(value).toLocaleString()
new Date(value).toLocaleDateString()
new Date(value).toLocaleTimeString()
```

### After:
```typescript
import { format24HourDateTime, format24HourTime } from '../../../utils/time';

// For date + time
format24HourDateTime(value)

// For time only
format24HourTime(value)

// For form inputs (current time)
import { getCurrentLocalDateTimeString } from '../../../utils/time';
const [time, setTime] = useState(getCurrentLocalDateTimeString());
```

## Testing Checklist
- [ ] Lab panels show current system time when created
- [ ] Lab panel list displays in 24-hour format
- [ ] Vitals timestamps use 24-hour format
- [ ] MAR medication times use 24-hour format
- [ ] All new records use current system time (not hardcoded dates)
- [ ] Patient bracelet shows correct current time
- [ ] Handover notes show current time when created

## Notes
- All times should reflect the user's system time
- No hardcoded dates should be used anywhere
- Consistent format across all modules improves user experience
- 24-hour time format is standard for medical applications
