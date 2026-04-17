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
- [ ] Remove `window.addEventListener('change-tab', ...)` in `App.tsx`
- [ ] Remove `window.addEventListener('sidebar-toggle', ...)` in `App.tsx`
- [ ] Remove `window.addEventListener('template-edit-change', ...)` in `App.tsx`
- [ ] Replace tab navigation with `useSearchParams` or a `NavigationContext`
- [ ] Identify all `dispatchEvent` call sites (SimulationTemplates.tsx, TemplateEditingBanner.tsx)
- [ ] Update dispatch sites to use new navigation pattern
- [ ] Test full template edit flow (Edit → patient editing → Save & Exit)
- **Why it matters:** CustomEvents don't clean up on remount, fire on unmounted components, and are completely untestable.

> Notes:

---

## Phase 2 — Structural Debt (High Priority)

### 2.1 — Complete `clinical/` → `patients/` migration
- [ ] `MARModule.tsx` (1,869 lines) — move to `features/patients/components/mar/`
- [ ] `BCMAAdministration.tsx` (923 lines) — move to `features/patients/components/`
- [ ] `VitalsModule.tsx` (783 lines) — move to `features/patients/components/vitals/`
- [ ] `useMedications.ts` (514 lines) — move to `features/patients/hooks/`
- [ ] `BCMAVerification.tsx`, `BarcodeScanner.tsx`, `BarcodeGenerator.tsx` — move to `features/patients/`
- [ ] `IntakeOutputCard.tsx`, `AddIntakeOutputModal.tsx` — move to `features/patients/`
- [ ] Move types: `labs.ts`, `labOrders.ts`, `clinical.ts` → `features/patients/types/`
- [ ] Update `src/types/index.ts` barrel exports
- [ ] Update `ModularPatientDashboard.tsx` imports
- [ ] Update `labService.ts`, `labOrderService.ts` imports
- [ ] Delete `src/features/clinical/` folder entirely
- [ ] Run `npm run type-check` to verify zero broken imports

> Notes:

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
- [ ] Replace `useState` + `useEffect` fetch pattern with `useQuery` for patient, vitals, meds, notes, orders
- [ ] Extract tab panels to sub-components
- [ ] Verify tenant_id is included in all queries
- [ ] Run `npm run type-check`

> Notes:

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

### 3.4 — Remaining large components (lower risk)
- [ ] `SimulationLabelPrintModal.tsx` (1,460 lines) — extract per-label-type sub-components
- [ ] `EnhancedDebriefModal.tsx` (1,325 lines) — extract section render blocks
- [ ] `AvatarBoard.tsx` (1,284 lines) — extract action panels
- [ ] `ActiveSimulations.tsx` (1,079 lines) — extract simulation cards, filter bar
- [ ] `Settings.tsx` (690 lines) — extract settings sections

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
