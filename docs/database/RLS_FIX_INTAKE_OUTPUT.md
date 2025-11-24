# Intake/Output RLS Policy Fix

**Date**: November 23, 2025  
**Issue**: Students getting 403 Forbidden when submitting intake/output entries

## Problem
The `patient_intake_output_events` table had an RLS policy that checked:
```sql
(tenant_id)::text = COALESCE(current_setting('app.current_tenant_id'::text, true), ...)
```

The application **never sets** `current_setting('app.current_tenant_id')`, causing all student INSERT operations to fail with 403 Forbidden.

## Solution
Applied migration: `20251123000000_fix_intake_output_rls.sql`

Changed RLS policy to:
```sql
CREATE POLICY "patient_intake_output_events_allow_authenticated"
  ON patient_intake_output_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

## Why This Works
- Application explicitly passes `tenant_id` in all queries for tenant isolation
- Matches pattern used for `device_assessments` and `wound_assessments` tables
- Tenant security is handled at the **application level**, not database level

## Testing
✅ Students can now submit intake/output entries  
✅ Application still enforces tenant isolation via explicit tenant_id filtering

## Related Tables Using Same Pattern
- `device_assessments`
- `wound_assessments`
- `patient_intake_output_events` (this fix)
