# Pre-Deployment Checklist

**Project:** hacCare  
**Purpose:** Ensure production-ready release  
**Last Updated:** November 29, 2025

---

## 🔍 Pre-Flight Checks

### Code Quality
- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] ESLint warnings addressed (`npm run lint`)
- [ ] No console.log/console.error in production code
- [ ] All TODOs/FIXMEs resolved or documented
- [ ] Code review completed and approved

### Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed in local environment
- [ ] Manual testing completed in staging environment
- [ ] Edge cases tested (empty states, errors, etc.)

### Database
- [ ] Database migrations tested locally
- [ ] Database migrations tested in staging
- [ ] All RPC functions tested
- [ ] RLS policies verified
- [ ] Database backup created before deployment
- [ ] Unused functions identified and marked for deletion

### Environment Variables
- [ ] All required env vars documented
- [ ] Production env vars configured in deployment platform
- [ ] API keys rotated if compromised
- [ ] Database connection strings verified

### Dependencies
- [ ] npm audit shows no critical vulnerabilities
- [ ] All dependencies up to date (or documented why not)
- [ ] No unused dependencies (`npx depcheck`)
- [ ] package-lock.json committed

---

## 📋 Feature-Specific Checks

### Simulation Auto-Kick Feature (Current Release)
- [ ] Timer displays correctly in sidebar
- [ ] Grace period countdown shows when timer expires
- [ ] Auto-kick redirects to simulation portal after grace period
- [ ] Exit simulation button redirects to portal
- [ ] Quick Intro popup works on simulation portal
- [ ] simulation_only users auto-route to portal on login
- [ ] RPC function `get_user_simulation_assignments` deployed
- [ ] Background refresh fails silently (no console errors)
- [ ] Session established properly on login (no manual refresh needed)

### Authentication
- [ ] Login works with all user types
- [ ] Logout works correctly
- [ ] Session persistence works
- [ ] Simulation-only routing works
- [ ] Multi-tenant switching works

### User Management
- [ ] User creation works
- [ ] User deactivation works
- [ ] User deletion works (if enabled)
- [ ] Permission levels enforced

---

## 🗄️ Database Checklist

### Schema Verification
```sql
-- Run these queries in Supabase SQL Editor before deployment

-- 1. Check for missing indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- 2. Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- 3. List all functions
SELECT n.nspname as schema, p.proname as function 
FROM pg_proc p 
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
ORDER BY p.proname;

-- 4. Check for orphaned data
-- Add specific queries for your schema
```

### Function Verification
- [ ] All 21 active functions exist in database
- [ ] Functions have correct SECURITY DEFINER settings
- [ ] Function permissions granted correctly
- [ ] Test each function with actual data

### Data Integrity
- [ ] No orphaned records in junction tables
- [ ] All foreign keys have valid references
- [ ] No NULL values in required fields
- [ ] Date ranges are valid (start < end)

---

## 🚀 Deployment Steps

### Pre-Deployment (1 day before)
1. [ ] Create git tag: `git tag v1.x.x`
2. [ ] Push tag: `git push origin v1.x.x`
3. [ ] Create GitHub release with changelog
4. [ ] Notify team of deployment window
5. [ ] Schedule deployment during low-traffic period

### Database Deployment (30 mins before code)
1. [ ] Create database backup in Supabase dashboard
2. [ ] Download backup locally as safety net
3. [ ] Apply database migrations (if any)
4. [ ] Verify migrations with smoke tests
5. [ ] Run function verification queries
6. [ ] Test critical RPC functions manually

### Code Deployment
1. [ ] Merge PR to main branch
2. [ ] Wait for CI/CD pipeline to complete
3. [ ] Verify deployment succeeded (check logs)
4. [ ] Clear CDN cache if applicable
5. [ ] Verify build artifacts deployed correctly

### Post-Deployment (immediately after)
1. [ ] Smoke test critical paths:
   - [ ] User login
   - [ ] User creation
   - [ ] Simulation launch
   - [ ] Patient data access
   - [ ] Simulation portal loading
2. [ ] Check error monitoring dashboard
3. [ ] Monitor server logs for errors
4. [ ] Test with real user account
5. [ ] Verify no increase in error rates

---

## 🔥 Rollback Plan

### If Deployment Fails

**Code Rollback:**
```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or roll back to specific tag
git reset --hard v1.x.x-previous
git push -f origin main
```

**Database Rollback:**
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Restore from pre-deployment backup
4. Verify data integrity after restore

**Emergency Contacts:**
- Primary: [Your contact]
- Secondary: [Team lead contact]
- Supabase Support: support@supabase.io

---

## 📊 Post-Deployment Monitoring

### First Hour
- [ ] Check error rates in monitoring dashboard
- [ ] Monitor server response times
- [ ] Watch for user-reported issues
- [ ] Verify database connection pool is healthy
- [ ] Check API rate limits not exceeded

### First Day
- [ ] Review all error logs
- [ ] Check for pattern in user issues
- [ ] Verify performance metrics acceptable
- [ ] Monitor database query performance
- [ ] Review user feedback

### First Week
- [ ] Analyze usage patterns
- [ ] Review any degradation in performance
- [ ] Document any issues found
- [ ] Plan fixes for minor issues
- [ ] Update documentation if needed

---

## 📝 Post-Deployment Tasks

### Documentation
- [ ] Update CHANGELOG.md with release notes
- [ ] Update API documentation if changed
- [ ] Update user guides if UI changed
- [ ] Document any workarounds or known issues

### Communication
- [ ] Notify team deployment is complete
- [ ] Send release notes to stakeholders
- [ ] Update status page (if applicable)
- [ ] Post announcement in team channel

### Cleanup
- [ ] Delete feature branches
- [ ] Archive completed tickets
- [ ] Update project board
- [ ] Plan next sprint/iteration

---

## ✅ Sign-Off

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  

**Checklist Completed:** ☐ Yes ☐ No  
**All Tests Passed:** ☐ Yes ☐ No  
**Rollback Plan Ready:** ☐ Yes ☐ No  

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

---

## 🎯 Success Criteria

Deployment is considered successful when:
- ✅ All smoke tests pass
- ✅ No critical errors in logs (first hour)
- ✅ User-reported error rate < 1%
- ✅ All critical features working
- ✅ Performance metrics within acceptable range
- ✅ Database queries performing normally
