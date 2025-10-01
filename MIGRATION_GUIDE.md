# Database Migration Guide for Patient Medications

## Overview
This migration adds support for multiple administration times per day and updates the frequency system to a more user-friendly daily-based format.

## Before Migration
Your current medication example:
```sql
"frequency": "BID"
"admin_time": "21:00"
```

## After Migration
Will become:
```sql
"frequency": "BID (Twice daily)"
"admin_time": "21:00" 
"admin_times": ["21:00", "09:00"]  -- 12 hours apart
```

## Migration Steps

### Step 1: Backup Your Data (RECOMMENDED)
Before running any migration, create a backup of your patient_medications table:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run this backup command:
```sql
-- Create a backup table
CREATE TABLE patient_medications_backup AS 
SELECT * FROM patient_medications;
```

### Step 2: Run the Migration Script
1. Open the file: `/workspaces/hacCare/sql/migrate_patient_medications_supabase.sql`
2. Copy the entire script content
3. In Supabase SQL Editor, paste and run the script
4. The script will:
   - Add `admin_times` jsonb column
   - Update frequency formats (BID → "BID (Twice daily)")
   - Create admin_times arrays based on current admin_time
   - Provide verification queries

### Step 3: Verify Migration Results
After running the migration, check these queries in the SQL Editor:

```sql
-- Check your specific medication
SELECT name, frequency, admin_time, admin_times, category
FROM patient_medications 
WHERE name = 'Advair 250mcg';

-- Check frequency distribution
SELECT frequency, COUNT(*) as count 
FROM patient_medications 
GROUP BY frequency;

-- Check for any issues
SELECT id, name, frequency, admin_times,
       jsonb_array_length(admin_times) as times_count
FROM patient_medications 
WHERE admin_times IS NULL OR jsonb_array_length(admin_times) = 0;
```

### Step 4: Update Your TypeScript Types
Make sure your Medication type includes the new field:

```typescript
interface Medication {
  // ... existing fields
  admin_time: string;
  admin_times?: string[]; // New field
  // ... other fields
}
```

## Expected Results for Common Frequencies

| Old Format | New Format | Admin Times Example |
|------------|------------|-------------------|
| `BID` | `BID (Twice daily)` | `["08:00", "20:00"]` (12 hours apart) |
| `TID` | `TID (Three times daily)` | `["08:00", "16:00", "00:00"]` (8 hours apart) |
| `QID` | `QID (Four times daily)` | `["08:00", "14:00", "20:00", "02:00"]` (6 hours apart) |
| `Q8H` | `TID (Three times daily)` | `["08:00", "16:00", "00:00"]` |
| `Once daily` | `Once daily` | `["08:00"]` |

## Your Specific Medication
Your Advair medication will change from:
```json
{
  "frequency": "BID",
  "admin_time": "21:00"
}
```

To:
```json
{
  "frequency": "BID (Twice daily)",
  "admin_time": "21:00",
  "admin_times": ["21:00", "09:00"]
}
```

## Rollback Instructions
If you need to rollback the migration, uncomment and run the rollback section at the end of the migration script.

## Testing After Migration
1. Try adding a new medication in your app
2. Try editing the existing Advair medication
3. Verify that BCMA still works with the updated format
4. Check that alerts are generated at the correct times

## Notes
- The migration preserves your existing `admin_time` field for backward compatibility
- Multiple administration times are calculated based on equal intervals throughout the day
- The system will work with both old and new medication records
- New medications will use the `admin_times` array for scheduling