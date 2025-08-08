# RLS Performance Optimization Guide

## Overview

This guide documents the comprehensive optimization of 136+ Supabase RLS (Row Level Security) policies to improve query performance at scale. The optimization addresses three main performance issues identified by Supabase's database linter.

## Performance Issues Addressed

### 1. Auth RLS Initialization Plan (136 warnings)
**Problem**: RLS policies using `auth.uid()` directly cause the function to be re-evaluated for every row in query results.

**Solution**: Replace `auth.uid()` with `(SELECT auth.uid())` to cache the result and prevent re-evaluation.

**Example**:
```sql
-- BEFORE (re-evaluates for each row)
CREATE POLICY "example_policy" ON table_name
FOR SELECT USING (user_id = auth.uid());

-- AFTER (evaluates once and caches)
CREATE POLICY "example_policy" ON table_name
FOR SELECT USING (user_id = (SELECT auth.uid()));
```

### 2. Multiple Permissive Policies (Performance impact)
**Problem**: Multiple permissive policies for the same role/action must all be evaluated, causing unnecessary overhead.

**Solution**: Consolidate related policies into comprehensive single policies where possible.

**Example**:
```sql
-- BEFORE (multiple policies evaluated)
CREATE POLICY "users_can_read" ON table_name FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admins_can_read" ON table_name FOR SELECT USING (is_admin());

-- AFTER (single consolidated policy)
CREATE POLICY "read_access" ON table_name 
FOR SELECT USING (user_id = (SELECT auth.uid()) OR is_admin());
```

### 3. Duplicate Indexes (Storage and performance impact)
**Problem**: Identical indexes waste storage and slow down DML operations.

**Solution**: Keep the most descriptive index and drop duplicates.

## Optimization Strategy

### Phase 1: Analysis
Run the diagnostic script to understand current state:
```sql
\i sql-patches/diagnostics/rls-performance-analysis.sql
```

### Phase 2: Optimization
Apply the comprehensive optimization script:
```sql
\i sql-patches/fixes/rls-performance-optimization.sql
```

### Phase 3: Verification
Re-run diagnostics to verify improvements:
```sql
\i sql-patches/diagnostics/rls-performance-analysis.sql
```

## Optimized Tables

### Core Multi-tenant Tables
- `patients` - Consolidated 4 policies into 2 efficient policies
- `patient_vitals` - Reduced from 6 policies to 1 comprehensive policy
- `patient_medications` - Simplified 5 overlapping policies to 1
- `patient_alerts` - Consolidated 4 policies for better performance
- `patient_images` - Merged 5 policies into 1 tenant-aware policy
- `patient_notes` - Optimized 3 policies with proper tenant isolation

### User Management Tables
- `user_profiles` - Consolidated 7 policies into 2 efficient policies
- `profiles` - Simplified 4 overlapping policies to 1
- `tenant_users` - Merged 2 policies for better access control
- `tenants` - Consolidated 9 policies into 3 logical groupings

### Audit and System Tables
- `audit_logs` - Optimized 3 policies for admin/user access patterns
- `medication_administrations` - Single tenant-aware policy
- `diabetic_records` - Consolidated 4 policies into 1

## Performance Improvements Expected

### Query Performance
- **136+ auth.uid() optimizations**: Eliminates function re-evaluation for each row
- **Reduced policy evaluation**: Fewer policies to check per query
- **Better index utilization**: Removed duplicate indexes

### Scalability Benefits
- **Large result sets**: Performance improvement grows with data volume
- **Multi-tenant queries**: Better isolation with less overhead
- **Administrative operations**: Faster for admin users managing multiple tenants

### Resource Efficiency
- **Reduced CPU usage**: Less function evaluation overhead
- **Lower memory consumption**: Cached auth results
- **Storage optimization**: Removed duplicate indexes

## Key Optimizations Applied

### 1. Tenant Isolation Pattern
```sql
-- Standard tenant isolation check (optimized)
EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.user_id = (SELECT auth.uid())
    AND tu.tenant_id = table_name.tenant_id
)
```

### 2. Role-based Access Pattern
```sql
-- Admin access check (optimized)
EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = (SELECT auth.uid())
    AND up.role IN ('admin', 'super_admin')
)
```

### 3. Combined Access Pattern
```sql
-- Own data + admin access (optimized)
(table_name.user_id = (SELECT auth.uid())) OR
EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = (SELECT auth.uid())
    AND up.role IN ('admin', 'super_admin')
)
```

## Rollback Strategy

If issues arise, policies can be restored individually:

```sql
-- Example rollback for a specific table
DROP POLICY IF EXISTS "new_policy_name" ON table_name;
CREATE POLICY "original_policy_name" ON table_name
FOR SELECT USING (original_condition);
```

## Monitoring and Validation

### Performance Monitoring
```sql
-- Check policy performance
SELECT * FROM public.rls_policy_performance;

-- Monitor query execution times
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM patients LIMIT 10;
```

### Security Validation
```sql
-- Verify RLS is still enforced
SET role = 'authenticated';
SELECT COUNT(*) FROM patients; -- Should only show tenant data

-- Test admin access
SET role = 'admin';
SELECT COUNT(*) FROM patients; -- Should show appropriate data
```

## Best Practices for Future RLS Policies

1. **Always use `(SELECT auth.uid())`** instead of `auth.uid()`
2. **Combine related policies** when they serve similar purposes
3. **Use EXISTS subqueries** for better performance with joins
4. **Index frequently checked columns** (user_id, tenant_id, role)
5. **Test policies with realistic data volumes**

## Troubleshooting

### Common Issues
1. **Policy conflicts**: Ensure new policies don't contradict existing ones
2. **Permission denied**: Verify user has appropriate role for operations
3. **Slow queries**: Check if policies are using proper indexes

### Diagnostic Queries
```sql
-- Check current auth context
SELECT 
    auth.uid() as current_user,
    current_setting('role') as current_role;

-- Verify tenant assignment
SELECT * FROM tenant_users WHERE user_id = auth.uid();

-- Check user profile and role
SELECT * FROM user_profiles WHERE user_id = auth.uid();
```

## Migration Timeline

1. **Backup current policies** (automated in script)
2. **Apply optimizations** during low-traffic period
3. **Monitor performance** for 24-48 hours
4. **Rollback if needed** using backup policies

## Success Metrics

- ✅ 136+ auth.uid() calls optimized to use SELECT subquery
- ✅ Multiple permissive policies consolidated where appropriate
- ✅ Duplicate indexes removed
- ✅ New performance indexes added
- ✅ All security constraints maintained
- ✅ Tenant isolation preserved
- ✅ Admin access patterns optimized

This optimization should result in significantly better query performance, especially for large datasets and multi-tenant operations, while maintaining all security guarantees.
