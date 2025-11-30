# Database & Codebase Cleanup Plan

**Created:** November 29, 2025  
**Updated:** November 30, 2025  
**Target Date:** Early December 2025  
**Goal:** Prepare for production release

---

## ✅ COMPLETED - November 30, 2025

### Security & Performance Fixes (PR #[number])
- ✅ Fixed 45 database functions with mutable search_path vulnerability
- ✅ Applied migration: `20251130_fix_function_search_paths_FINAL.sql`
- ✅ Fixed 3 GitHub CodeQL security alerts (#40, #39, #41)
- ✅ Removed 62 outdated files from `docs/development/archives/`
- ✅ Deleted 6 backup files (.bak, -old, .backup)
- ✅ Removed 3 broken/unused files with import errors
- ✅ Cleaned up 11 stale TODO comments
- ✅ Installed ts-prune (found zero unused exports)
- ✅ Consolidated documentation to `docs/operations/`
- ✅ Removed ~20,000 lines of legacy code
- ✅ Reduced repository size by ~2.5MB

---

## Phase 1: Database Function Audit ✅ COMPLETED

### Status
- [x] Document all actively used RPC functions (21 functions identified)
- [x] Fixed search_path security vulnerability (45 functions)
- [x] List all functions in Supabase database (135 total)
- [x] Compare and identify unused functions (21 scripts ready)
- [x] Create DROP statements for unused functions
- [x] Remove old simulation architecture (800 lines, 17 functions)
- [x] Identify debug functions for removal (4 functions)
- [ ] Test in staging environment
- [ ] Execute cleanup in production

### Results
**Removed from Source Code:**
- `src/simulation/engine/SimulationEngine.ts` (371 lines)
- `src/simulation/controllers/SimulationController.ts` (~300 lines)
- `src/simulation/types/` (269 lines)
- Total: ~800 lines of unused legacy code

**Database Functions Ready to Remove:**
- 17 old simulation system functions → `database/fixes/drop_old_simulation_functions.sql`
- 4 debug/test functions → `database/fixes/drop_debug_functions.sql`
- 21 total functions identified for removal

**Functions to Keep:**
- `reset_run` - Still used by useSimulation.ts
- `create_snapshot` - Still used by useSimulation.ts

### Resources
- See: `docs/operations/ACTIVE_SUPABASE_FUNCTIONS.md`
- See: `docs/operations/DATABASE_FUNCTION_ANALYSIS.md` (complete audit)
- See: `docs/operations/OLD_SIMULATION_SYSTEM_REMOVAL.md` (investigation)
- SQL: `database/fixes/drop_old_simulation_functions.sql`
- SQL: `database/fixes/drop_debug_functions.sql`
- Confidence: **95%** - All `supabase.rpc()` calls mapped from `src/` directory

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

## Phase 2: Archive Folder Cleanup ✅ COMPLETED

### Status
- [x] Deleted `archive/` folder (241 files, 1.7MB)
- [x] Deleted `backup/` folder (788KB)
- [x] Deleted `docs/development/archives/` (62 files)
- [x] Removed broken/unused components
- [x] Cleaned up test scripts

### Results
- Total removed: ~2.5MB of legacy code
- Repository is now much cleaner and better organized
- All active files remain intact and functional

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

## Phase 4: Debug/Test File Cleanup ✅ COMPLETED

### Removed Files
- [x] `test-email-function.js` (deleted)
- [x] `scripts/debug-fields.ts` (deleted)
- [x] `scripts/check-avatars.ts` (deleted)
- [x] All debug SQL scripts from archives (deleted)
- [x] Backup .bak/.old files (6 files deleted)

### Results
- Clean scripts directory
- Only active, maintained test files remain
- Debug SQL files properly organized in `database/fixes/`

---

## Phase 5: Documentation Cleanup ✅ COMPLETED

### Completed Actions
- [x] Consolidated security documentation to `docs/operations/SECURITY_HARDENING.md`
- [x] Moved PDF generation docs to `docs/operations/`
- [x] Moved email debrief setup to `docs/operations/`
- [x] Deleted obsolete PHASE docs (Oct 2025)
- [x] Organized all operational guides in `docs/operations/`
- [x] Cleaned up old migration patches and debug docs

### Results
- Well-organized documentation structure
- Single source of truth for operational procedures
- Easy to find relevant documentation

---

## Phase 6: Code Cleanup ✅ PARTIALLY COMPLETED

### Completed Actions
- [x] Ran ts-prune - found zero unused exports ✅
- [x] Removed 11 stale TODO comments
- [x] Removed broken imports (3 files with errors)
- [x] Cleaned up sessionStorage security comments

### Still To Do
- [ ] **PRIORITY: Refactor large files** (See Phase 6A below)
- [x] Review and optimize console.log statements - Auto-removed in production builds ✅
- [x] Run depcheck for unused dependencies ✅
- [x] Bundle size optimization - Code splitting implemented ✅

### Phase 6A: Large File Refactoring 🚨 NEXT PRIORITY

**Identified Large Files:**
- `ModularPatientDashboard.tsx` (2,056 lines) - Should be split
- `MARModule.tsx` (1,739 lines) - Should be split  
- `backupService.ts` (1,684 lines) - Could be modularized
- `EnhancedDebriefModal.tsx` (1,330 lines) - Consider splitting
- `PatientDetail.tsx` (1,239 lines) - Review for extraction

**Strategy: Safe Incremental Refactoring**
1. Document dependencies and identify natural seams
2. Extract components alongside existing code (don't replace yet)
3. Test thoroughly, especially simulation system
4. Only remove old code after new code proven stable

**Risk:** High - Simulation system is mission-critical  
**Recommendation:** Tackle after this security PR is merged and tested

---

## Phase 7: Dependency Cleanup ✅ COMPLETED

### Package Audit
- [x] Review `package.json` for unused dependencies
- [x] Run `npm outdated` to find outdated packages
- [x] Run `npm audit` - **0 vulnerabilities found** ✅
- [x] Remove unused dev dependencies

### Completed Actions
- Ran `npx depcheck` and identified 10 unused packages
- Removed **57 total packages** (including sub-dependencies):
  - `@tanstack/react-query-devtools` (dev-only, commented out)
  - `camelcase-css` (not used)
  - `class-variance-authority` (not used)
  - `clsx` (not used)
  - `dotenv` (not needed with Vite)
  - `@testing-library/jest-dom` (no tests)
  - `@testing-library/react` (no tests)
  - `@testing-library/user-event` (no tests)
  - `@vitest/coverage-v8` (no tests)
  - `ts-prune` (analysis complete)
- Build tested successfully - no breaking changes
- Created backup: `package.json.backup-20251130`

### Results
- **0 vulnerabilities** in remaining 463 packages
- Build size unchanged (5.0MB) - size is from application code, not dependencies
- 714 lines removed from package-lock.json

### Optional Future Actions
- [ ] Update outdated packages (10 found, all minor/patch versions)
- [ ] Consider upgrading to Tailwind v4 (currently v3.4.18)

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

- [x] Database security hardened (45 functions fixed)
- [x] Codebase reduced by ~20,000 lines ✅
- [x] Repository size reduced by ~2.5MB ✅
- [x] Documentation consolidated and organized ✅
- [x] Zero unused exports (verified with ts-prune) ✅
- [x] Security alerts resolved (CodeQL) ✅
- [x] No unused dependencies (removed 57 packages) ✅
- [x] Zero security vulnerabilities (npm audit clean) ✅
- [x] Bundle properly code-split (17 optimized chunks) ✅
- [x] PDF libraries lazy-loaded (535KB on-demand) ✅
- [x] Console logs removed in production ✅
- [ ] Large files refactored (NEXT PRIORITY)
- [ ] All tests passing

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

---

## Session History

### November 30, 2025 - Security & Cleanup Session
**Accomplishments:**
- Fixed 47 Supabase security warnings (45 functions + 1 materialized view + 1 manual config)
- Fixed 4 GitHub CodeQL alerts (3 fixed, 1 resolved via cleanup)
- Removed 20,000+ lines of legacy code
- Reduced repo size by 2.5MB
- Organized documentation structure
- PR merged to main successfully

**Branch:** `feature/security-performance-fixes`  
**Commits:** 9 total  
**Status:** ✅ Merged and deployed

**Next Steps:**
1. **Refactor large files** (ModularPatientDashboard, MARModule) - HIGH PRIORITY
2. **Bundle size optimization** - Review and implement code splitting
3. **Database function cleanup** - Identify and remove truly unused functions

### November 30, 2025 (Afternoon) - Dependency & Bundle Cleanup
**Accomplishments:**
- Ran depcheck and npm audit
- Removed 10 unused packages (57 total including sub-dependencies)
- Verified 0 security vulnerabilities
- Implemented intelligent bundle code splitting (17 chunks)
- Created lazy-loaded PDF library system (saves 535KB on initial load)
- Split vendor libraries by update frequency for optimal caching
- Split application features into separate chunks
- Console.log statements auto-removed in production builds
- Created comprehensive bundle optimization documentation
- Build tested successfully
- 714 lines cleaned from package-lock.json

**Technical Debt Found:**
- 1 TODO comment in AuthContext.tsx (low priority)
- Old release docs automatically removed (5 files in docs/operations/release/)
- vendor-misc chunk identified for future optimization (1,059KB)

**Branch:** `feature/security-performance-fixes`  
**Status:** ✅ Committed
