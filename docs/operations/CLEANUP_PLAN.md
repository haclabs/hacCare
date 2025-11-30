# Database & Codebase Cleanup Plan

**Created:** November 29, 2025  
**Target Date:** Early December 2025  
**Goal:** Prepare for production release

---

## Phase 1: Database Function Audit ✅ STARTED

### Status
- [x] Document all actively used RPC functions (21 functions identified)
- [ ] List all functions in Supabase database
- [ ] Compare and identify unused functions
- [ ] Create DROP statements for unused functions
- [ ] Test in staging environment
- [ ] Execute cleanup in production

### Resources
- See: `docs/operations/ACTIVE_SUPABASE_FUNCTIONS.md`
- Confidence: **95%** - All `supabase.rpc()` calls mapped from `src/` directory

### Potential Gaps
- Functions called dynamically via variables
- Functions used by Supabase Edge Functions
- Functions used by external cron jobs/webhooks
- Functions with different names in DB vs code

### SQL Query to List All Functions
```sql
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  d.description
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_description d ON p.oid = d.objoid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND p.prokind = 'f'
ORDER BY n.nspname, p.proname;
```

---

## Phase 2: Archive Folder Cleanup

### Folders to Review
```
/workspaces/hacCare/archive/                    # Legacy components/contexts
/workspaces/hacCare/backup/simulation-legacy/   # Old simulation system
/workspaces/hacCare/docs/development/archives/  # Archived docs
```

### Decision Criteria
- **Keep if:** Historical reference needed, contains migration notes
- **Delete if:** Superseded by new implementation, no documentation value
- **Compress if:** May need future reference but not immediate

### Recommendations
1. Review each archive folder for documentation value
2. Move truly obsolete code to external archive (outside repo)
3. Update `.gitignore` to prevent new archive accumulation
4. Add README to remaining archives explaining their purpose

---

## Phase 3: Migration File Cleanup

### Location
`/workspaces/hacCare/database/migrations/`

### Action Items
- [ ] Review all migration files
- [ ] Identify failed/rolled-back migrations
- [ ] Remove duplicate or superseded migrations
- [ ] Ensure sequential naming is correct
- [ ] Document migration history in CHANGELOG

### Caution
⚠️ **Do not delete successful migrations** - they serve as database schema history

---

## Phase 4: Debug/Test File Cleanup

### Files to Review
```
/workspaces/hacCare/tests/simulation-manual.ts
/workspaces/hacCare/test-email-function.js
/workspaces/hacCare/database/fixes/          # Various one-off SQL fixes
/workspaces/hacCare/archive/sql/debug/       # Debug SQL scripts
/workspaces/hacCare/archive/sql/checks/      # SQL check scripts
/workspaces/hacCare/scripts/debug-fields.ts
/workspaces/hacCare/scripts/check-avatars.ts
```

### Decision Criteria
- **Keep if:** Still used for manual testing, useful for debugging
- **Delete if:** One-time fix, no longer relevant
- **Move to docs if:** Good example/reference but not executable

---

## Phase 5: Documentation Cleanup

### Multiple READMEs
- [ ] Review all README.md files in subdirectories
- [ ] Consolidate or remove outdated READMEs
- [ ] Ensure remaining READMEs are accurate and up-to-date

### Outdated Docs
- [ ] Review `/docs/development/archives/`
- [ ] Archive or delete superseded documentation
- [ ] Update main docs to reflect current architecture

---

## Phase 6: Code Cleanup

### Unused Components
- [ ] Run ESLint/TSC to find unused imports
- [ ] Search for unused exported components
- [ ] Remove commented-out code blocks
- [ ] Clean up console.log statements (or convert to proper logging)

### Tools
```bash
# Find unused exports
npx ts-prune

# Find unused files
npx unimported

# Find TODO/FIXME comments
grep -r "TODO\|FIXME" src/
```

---

## Phase 7: Dependency Cleanup

### Package Audit
- [ ] Review `package.json` for unused dependencies
- [ ] Run `npm outdated` to find outdated packages
- [ ] Update critical security patches
- [ ] Remove unused dev dependencies

### Commands
```bash
# Find unused dependencies
npx depcheck

# Audit for vulnerabilities
npm audit

# Update packages
npm update
```

---

## Phase 8: Environment & Config Cleanup

### Files to Review
- [ ] `.env` - Remove unused variables
- [ ] `vite.config.ts` - Clean up unused config
- [ ] `tsconfig.json` - Verify paths/settings
- [ ] `netlify.toml` / `vercel.json` - Ensure correct deployment config

---

## Risk Assessment

### Low Risk (Safe to Delete)
- ✅ Archive folders (if not referenced)
- ✅ Debug scripts used once
- ✅ Commented-out code
- ✅ Unused npm packages

### Medium Risk (Review Carefully)
- ⚠️ Database functions (may have hidden usage)
- ⚠️ Migration files (needed for schema history)
- ⚠️ Test files (may be used manually)

### High Risk (Don't Delete Without Testing)
- 🚨 Active database functions
- 🚨 Current migration files
- 🚨 Production config files
- 🚨 Core services/components

---

## Execution Plan

### Week 1: Database Audit
1. Run function list query in Supabase
2. Compare against documented functions
3. Identify unused functions (get list of ~10-20 candidates)
4. Verify each candidate isn't used elsewhere
5. Create DROP script

### Week 2: Code Cleanup
1. Delete archive folders not needed for reference
2. Remove debug/test files from main branch
3. Run automated cleanup tools (ts-prune, depcheck)
4. Remove unused imports/exports

### Week 3: Documentation & Testing
1. Update all documentation to reflect cleanup
2. Test application thoroughly in staging
3. Verify no broken references
4. Update CHANGELOG with cleanup notes

### Week 4: Production Deployment
1. Execute database cleanup in production
2. Deploy cleaned codebase
3. Monitor for issues
4. Document any rollback procedures

---

## Success Metrics

- [ ] Database has only actively used functions
- [ ] Codebase reduced by 20%+ (excluding node_modules)
- [ ] All tests passing
- [ ] Documentation is accurate and current
- [ ] No unused dependencies
- [ ] Clean ESLint/TSC output

---

## Rollback Plan

If issues arise after cleanup:

1. **Database Functions:**
   - Keep backup SQL file with all CREATE statements
   - Can recreate functions from `/database/functions/` folder

2. **Code:**
   - Tag current state before cleanup: `git tag pre-cleanup-nov-2025`
   - Can revert via: `git revert <commit-range>`

3. **Dependencies:**
   - Keep backup of current `package.json`
   - Can restore via: `npm install` from backup

---

## Notes

- Always test in staging before production
- Keep this document updated as cleanup progresses
- Document any surprising findings or dependencies
- Consider creating a "cleanup" branch for safety
