# hacCare Refactoring Roadmap

> Last updated: April 16, 2026  
> Branch: `fix/rls-policy-always-true`  
> Goal: Production-quality, scalable, zero security debt

---

## Phase 1 — Critical (Security / Correctness)

These are small-effort, high-impact fixes. Do before any structural refactor.

### 1.1 — ErrorBoundary wrappers around all lazy routes
- [ ] Wrap every `<Suspense>` block in `App.tsx` with `<ErrorBoundary>`
- [ ] Prioritize: `SimulationManager`, `BCMAAdministration`, `PatientCard`
- [ ] Verify `ErrorBoundary.tsx` is exporting correctly and logs to error service
- **Why it matters:** A lazy chunk crash = blank screen mid-student-session. Unacceptable in a live sim.

> Notes:

---

### 1.2 — Sanitization audit and duplicate removal
- [x] Trace the full chain: form input → `inputValidator.ts` → `security.ts` → sanitization
- [x] Confirm sanitization actually fires on patient data submission (MARModule, VitalsModule, PatientForm)
- [x] `sanitization.ts` and `sanitization-smart.ts` differ by only 44 lines — delete `sanitization-smart.ts` and consolidate
- [x] Verify the retained file has the OWASP-correct SQL injection comment (parameterized queries, not string filtering)
- **Why it matters:** Both files exist but neither is imported by any form component directly — chain may be broken.

> Notes: Chain was completely broken — none of the 3 utility files (sanitization.ts, sanitization-smart.ts, inputValidator.ts)
> were imported anywhere. sanitization-smart.ts deleted (inferior duplicate). sanitizeUserInput() now wired into
> PatientForm.handleSubmit for all free-text fields (first_name, last_name, diagnosis, allergies, room, emergency contact).
> Supabase parameterized queries handle SQL injection at DB layer; the sanitization adds XSS protection for stored data.
> All dangerouslySetInnerHTML usages audited — all safe (hardcoded SVG constants or static CSS strings, no user data).
> inputValidator.ts (InputValidator class w/ DOMPurify) remains available but unused — candidate for Phase 3 cleanup.

---

### 1.3 — Replace CustomEvent navigation with React Router
- [x] Remove `window.addEventListener('change-tab', ...)` in `App.tsx`
- [x] Remove `window.addEventListener('sidebar-toggle', ...)` in `App.tsx`
- [x] Remove `window.addEventListener('template-edit-change', ...)` in `App.tsx` (was dead — never dispatched)
- [x] Replace tab navigation with `useSearchParams` — `activeTab` is now `/app?tab=<name>` URL param
- [x] Identify all `dispatchEvent` call sites (SimulationTemplates.tsx, TemplateEditingBanner.tsx, SimulationPortal.tsx)
- [x] Update dispatch sites to use new navigation pattern
- [x] Test full template edit flow (Edit → patient editing → Save & Exit)
- **Why it matters:** CustomEvents don't clean up on remount, fire on unmounted components, and are completely untestable.

> Notes: `activeTab` state replaced with `useSearchParams` — tab is now a URL param (/app?tab=patients).
> Back/forward browser navigation and bookmarking now work correctly for tab state.
> `sidebar-toggle` event replaced with direct `onCollapsedChange` prop: App → Sidebar.
> Header.tsx sidebarCollapsed state + event listener removed entirely (it was tracked but never rendered).
> `template-edit-change` event listener removed — it was an orphaned listener (never dispatched anywhere).
> `template-edit-start` event kept (legitimately consumed by TemplateEditingBanner).
> SimulationPortal's setTimeout hack around dispatchEvent removed — no longer needed.

---

## Phase 2 — Structural Debt (High Priority)

### 2.1 — Complete `clinical/` → `patients/` migration
- [x] `MARModule.tsx` (1,869 lines) — move to `features/patients/components/mar/`
- [x] `BCMAAdministration.tsx` (923 lines) — move to `features/patients/components/`
- [x] `VitalsModule.tsx` (783 lines) — move to `features/patients/components/vitals/`
- [x] `useMedications.ts` (514 lines) — move to `features/patients/hooks/`
- [x] `BCMAVerification.tsx`, `BarcodeScanner.tsx`, `BarcodeGenerator.tsx` — move to `features/patients/`
- [x] `IntakeOutputCard.tsx`, `AddIntakeOutputModal.tsx` — move to `features/patients/`
- [x] Move types: `labs.ts`, `labOrders.ts`, `clinical.ts` → `features/patients/types/`
- [x] Update `src/types/index.ts` barrel exports
- [x] Update `ModularPatientDashboard.tsx` imports
- [x] Update `labService.ts`, `labOrderService.ts` imports
- [x] Delete `src/features/clinical/` folder entirely
- [x] Run `npm run type-check` to verify zero broken imports

> Notes: All 14 source files (types, hooks, components) moved with `git mv` to preserve history.
> Internal cross-references within the moved files were already correct (same folder depth), except:
> - `MARModule.tsx`: `../../../patients/components/mar/BBITTab` → `./BBITTab` (now a sibling)
> - `VitalsModule.tsx`: 3 roundabout `../../../../features/patients/components/vitals/*` → `./` siblings
> Created barrel index files: `patients/components/mar/index.ts`, `vitals/index.ts`, `intake-output/index.ts`
> `src/types/index.ts` barrel cleaned up (removed dead `clinical/types` re-export).
> `tsc --noEmit` clean, lint still at 14 errors (same pre-existing React Compiler issues).

---

### 2.2 — `ModularPatientDashboard.tsx` (2,172 lines → React Query + sub-components)
Current state: 13+ useState hooks, manual fetch chains, all logic fused in one file.

- [ ] Extract patient data fetching to `usePatientDashboard(patientId, tenantId)` hook (React Query)
- [ ] Extract `<PatientHeader />` sub-component (patient name, age, room, allergies banner)
- [ ] Extract `<PatientAlerts />` sub-component
- [ ] Extract `<ModuleNavigation />` sub-component (tab bar)
- [ ] Extract `<QuickIntroModal />` sub-component
- [ ] Replace `setLoading/setError/setPatient` useState chains with `useQuery`
- [ ] Replace sequential `useEffect` fetch chains with parallel React Query queries
- [ ] Replace `labsRefreshTrigger` / `ordersRefreshTrigger` counters with `queryClient.invalidateQueries()`
- [ ] Verify component stays under 350 lines after extraction
- [ ] Run `npm run type-check`

> Notes:

---

### 2.3 — `PatientDetail.tsx` (1,242 lines → React Query)
- [x] Replace `useState` + `useEffect` fetch pattern with `useQuery` for patient, vitals, meds, notes
- [x] Extract tab panels to sub-components (`PatientDetailTabs.tsx`)
- [x] Verify tenant_id is included in all queries
- [x] Replace 705-line inline `handlePrintRecord` with `printPatientRecord()` from `patientRecordPrinter.ts`
- [x] Run `npm run type-check`

> Notes: PatientDetail.tsx: 1242 → 140 lines. PatientDetailTabs.tsx extracted (310 lines).
> useQuery replaces Promise.all + 7 useState setters + useEffect; refreshes via queryClient.invalidateQueries.
> Stale imports to clinical/components/mar replaced with patients/components/mar (Phase 2.1 path).
> tsc --noEmit: clean ✓

---

## Phase 3 — Code Quality (Systematic)

### 3.1 — `backupService.ts` (1,685 lines — 20+ `any[]` return types)
- [ ] Type all `private export*` methods — replace `Promise<any[]>` with proper interfaces
- [ ] Extract a generic `exportTable<T>(tableName, options, columns)` helper to replace the copy-paste export pattern
- [ ] Consider splitting into `BackupExportService` + `BackupRestoreService`
- [ ] Run `npm run type-check`

> Notes:

---

### 3.2 — `simulationService.ts` (1,196 lines — 3 domains mixed)
- [ ] Split into `templateService.ts` — create/update/delete/version templates
- [ ] Split into `simulationLifecycleService.ts` — launch/complete/reset/status
- [ ] Split into `simulationCompareService.ts` — compare functions
- [ ] Update all import references across the codebase
- [ ] Run `npm run type-check`

> Notes:

---

### 3.3 — `MARModule.tsx` (1,869 lines — form + history + grid fused)
> Note: Do after 2.1 (migration) is complete.
- [ ] Extract `<AddMedicationForm />` sub-component
- [ ] Extract `<EditMedicationForm />` sub-component
- [ ] Extract `<MedicationAdministrationGrid />` sub-component
- [ ] Extract `<BBITForm />` sub-component (or verify it's already in `patients/`)
- [ ] Replace `useState` loading pattern with `useMedications` hook
- [ ] Verify component stays under 350 lines

> Notes:

---

### 3.4 — Remaining large components (lower risk) ✅ COMPLETE
- [x] `SimulationLabelPrintModal.tsx` (1,460 → 260 lines) — extracted `LabelPreviewCard`, `LabelConfigPanel`, `useLabelPrint`, `LabelTypeSelector`
- [x] `EnhancedDebriefModal.tsx` (1,325 → 653 lines) — extracted `DebriefStudentSection`, `DebriefActivityItem`, `useDebriefData`
- [x] `AvatarBoard.tsx` (1,284 → 350 lines) — extracted `useAvatarBoard`, `AvatarCanvasPanel`, `AvatarRecordsList`, `WoundAssessmentViewer`
- [x] `ActiveSimulations.tsx` (1,079 → 249 lines) — extracted `useActiveSimulations`, `SimulationCard`, `SimulationInstructorGuide`, `EditCategoriesModal`
- [x] `Settings.tsx` (690 → 111 lines) — extracted `useSettingsMonitor`, `GeneralSettingsTab`

> Notes:

---

## Ongoing / Housekeeping

### Type Safety
- [ ] Reduce 356 `: any` usages — prioritize services touching patient data
- [ ] Enable `noImplicitAny` in `tsconfig.app.json` once count is below ~50
- [ ] Run `npm run type-check` on each PR

### Performance
- [ ] `ErrorBoundary` wrapping is also a perf guard (prevents full tree unmount on lazy errors)
- [ ] Review `studentActivityService.ts` (1,067 lines) — large `Promise.all` block; check for N+1 queries

### Database
- [ ] 69 migrations — review for consolidation opportunity in next quarterly window
- [ ] Document any new clinical table additions against the 4-part checklist (reset function, table config, debrief service, debrief modal)

---

## Completed

- [x] RLS multiple permissive policies fix (April 16, 2026) — `20260416000001_fix_multiple_permissive_policies.sql`
- [x] RLS always-true policy fix — `fix/rls-policy-always-true` branch
