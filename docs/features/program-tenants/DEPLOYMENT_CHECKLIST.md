# Program Tenants - Deployment Checklist

## Pre-Deployment

- [ ] Review `IMPLEMENTATION_GUIDE.md` for architecture overview
- [ ] Backup database before running migration
- [ ] Test migration in development/staging environment first
- [ ] Verify all instructors have programs assigned in `user_programs` table

## Deployment Steps

### 1. Run Database Migration
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy contents of `database/migrations/20260127000000_implement_program_tenants.sql`
- [ ] Execute migration
- [ ] Verify output shows program tenants created:
  ```
  ✅ Created program tenant: NESA Program
  ✅ Created program tenant: PN Program  
  ✅ Created program tenant: SIM Hub Program
  ✅ Created program tenant: BNAD Program
  ```

### 2. Verify Database Changes
- [ ] Check `tenants` table has new records with `tenant_type = 'program'`
- [ ] Check `tenant_users` table shows instructors granted access
- [ ] Run verification queries from `IMPLEMENTATION_GUIDE.md`

### 3. Deploy Frontend Code
- [ ] Merge feature branch to main
- [ ] Deploy to production (Netlify/Vercel auto-deploy)
- [ ] Clear any CDN/edge caches if needed

### 4. Test Deployment

#### Single Program Instructor
- [ ] Login as instructor with 1 program assignment
- [ ] Should auto-land in program workspace
- [ ] Verify ProgramContextBanner shows at top
- [ ] Verify Sidebar shows program badge
- [ ] Verify no patient data visible

#### Multi-Program Instructor  
- [ ] Login as instructor with 2+ programs
- [ ] ProgramSelectorModal should appear
- [ ] Select a program
- [ ] Should land in that program's workspace
- [ ] Click "Switch Program" in banner
- [ ] Select different program
- [ ] Should reload and switch contexts

#### Persistence
- [ ] Login to program workspace
- [ ] Refresh browser
- [ ] Should remain in same program (no modal)
- [ ] Check localStorage has `current_program_tenant` key

## Post-Deployment Monitoring

- [ ] Monitor for any login errors in logs
- [ ] Check Sentry/error tracking for exceptions
- [ ] Verify instructor logins working normally
- [ ] Confirm super admins can still switch tenants
- [ ] Test simulation launching still works
- [ ] Test template editing still works

## Rollback Plan (If Needed)

If critical issues found:

1. **Quick Rollback** (keeps data, just disables feature):
   ```sql
   UPDATE tenants SET tenant_type = 'institution' WHERE tenant_type = 'program';
   ```

2. **Revert Code**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Full Rollback** (removes all changes):
   - See "Rollback Plan" section in `IMPLEMENTATION_GUIDE.md`

## Known Issues / Limitations

- [ ] Template management in program workspace is placeholder UI only
- [ ] Announcements feature not implemented yet (Phase 2)
- [ ] Program analytics/stats show zeros (Phase 2)
- [ ] No file upload feature yet (Phase 3)

## Support Contacts

- **Database Issues**: Check Supabase logs, review RLS policies
- **Frontend Issues**: Check browser console, verify TenantContext state
- **Migration Issues**: Review migration SQL output for errors

## Success Criteria

✅ All instructors can login successfully  
✅ Single-program instructors auto-land in program workspace  
✅ Multi-program instructors see selector modal  
✅ Program switching works via banner dropdown  
✅ No patient data visible in program workspaces  
✅ Existing functionality (simulations, templates, patient management) unaffected  

---

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Sign-off**: _________________
