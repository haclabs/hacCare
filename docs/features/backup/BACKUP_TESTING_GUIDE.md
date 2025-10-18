# Testing the Backup System

## Quick Test Steps

### 1. Test Small Backup (WITH Encryption)
1. Go to **Admin** → **Backup Management**
2. Select only these options:
   - ✅ Patient Records
   - ✅ Vital Signs
   - ✅ Medications
   - ❌ Uncheck everything else
3. Enable encryption: ✅ **Encrypt backup data**
4. Set password: `test123`
5. Click **Create Backup**
6. Should succeed in a few seconds ✅

### 2. Test Medium Backup (WITH Encryption)
1. Select these options:
   - ✅ Patient Records
   - ✅ Vital Signs
   - ✅ Medications
   - ✅ Patient Notes
   - ✅ Doctor's Orders
   - ✅ Wound Care
   - ✅ Wound Assessments
2. Enable encryption with password
3. Click **Create Backup**
4. Should succeed in 10-30 seconds ✅

### 3. Test Full Backup (ALL Data)
**Option A: WITH Encryption** (if < 50MB total)
1. Select **ALL** data types
2. Enable encryption with password
3. Watch console for backup size
4. Should succeed (may take 1-2 min if large)

**Option B: WITHOUT Encryption** (recommended for large data)
1. Select **ALL** data types
2. **Disable** encryption: ❌ Encrypt backup data
3. Click **Create Backup**
4. Should succeed quickly (no encryption overhead)

## What to Watch For

### Console Messages (F12 → Console)
```
✅ Good Messages:
- "Backup size: 2.45 MB"
- "Creating backup with XX records"
- "Backup created successfully"

⚠️ Warning (OK):
- "Large backup detected. Encryption may take some time..."
  (This is normal for >50MB backups)

❌ Errors to Report:
- "Failed to encrypt backup"
- "Maximum call stack size exceeded"
- Any other error messages
```

### Success Indicators
1. ✅ Green success message appears
2. ✅ Backup shows in list below
3. ✅ Download button works
4. ✅ Backup file downloads as JSON

### If Encryption Still Fails

Try these in order:

1. **Disable Encryption**:
   - Uncheck "Encrypt backup data"
   - Try again

2. **Reduce Data Types**:
   - Unselect: Simulations, Patient Images, Users, Tenants
   - Try again

3. **Use Date Range**:
   - Enable "Date Range"
   - Set last 30 days only
   - Try again

4. **Check Browser Console**:
   - Press F12
   - Look for specific error messages
   - Share error details if needed

## Expected Backup Sizes

**Your Data** (approximate):
- 9 patients per simulation × 2 simulations = ~18 patients
- ~5-10 medications per patient = ~180 medications
- Vitals, notes, orders, etc.

**Estimated Sizes:**
- Small backup (3-5 data types): ~1-5 MB
- Medium backup (7-10 data types): ~5-20 MB
- Full backup (all 18 data types): ~20-50 MB

**With Encryption:**
- Adds ~33% size overhead
- Example: 20MB → 26MB encrypted

## Verify Backup Contents

After download:

1. Open the JSON file in a text editor
2. Check structure:
   ```json
   {
     "metadata": {
       "version": "1.0.0",
       "backup_type": "full",
       "record_counts": {
         "patients": 18,
         "medications": 180,
         ...
       }
     },
     "data": {
       "patients": [...],
       "medications": [...],
       ...
     }
   }
   ```

3. Verify record counts match your data

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| "Password required" | Encryption enabled but no password | Enter a password |
| "Failed to encrypt" | Data too large for browser | Disable encryption OR reduce data types |
| "Insufficient permissions" | Not super admin | Login as super admin |
| Backup list empty | No backups created yet | Create first backup |
| Download fails | Backup expired or deleted | Create new backup |

## Performance Benchmarks

**Expected times** (on modern laptop):

| Data Size | Without Encryption | With Encryption |
|-----------|-------------------|----------------|
| < 5 MB    | 1-2 seconds      | 2-5 seconds    |
| 5-20 MB   | 2-5 seconds      | 5-15 seconds   |
| 20-50 MB  | 5-10 seconds     | 15-60 seconds  |
| > 50 MB   | 10-20 seconds    | 1-3 minutes    |

If it takes much longer, check:
- Browser performance
- Network connection
- Database query performance

---

## Success Checklist

- [ ] Small backup with encryption works
- [ ] Medium backup with encryption works  
- [ ] Full backup works (with or without encryption)
- [ ] Backup appears in list
- [ ] Download works
- [ ] JSON file is valid
- [ ] Record counts look correct

✅ All good? Your backup system is working perfectly!

❌ Still having issues? Share the console error messages for help.
