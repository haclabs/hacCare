# hacCare Refactoring Roadmap

> Last updated: September 22, 2026 (status audited against the codebase)  
> Goal: Production-quality, scalable, zero security debt

**Audit, 2026-09-22.** Most of this roadmap was already done but never ticked.
Phase 1 is complete, Phase 2 is complete apart from four sub-component
extractions in 2.2, and Phase 3 is complete or moot. Every status below was
verified against the tree, not assumed. What genuinely remains is collected
under **Ongoing / Housekeeping**.

---

## Phase 1 — Critical (Security / Correctness)

These are small-effort, high-impact fixes. Do before any structural refactor.

### 1.1 — ErrorBoundary wrappers around all lazy routes
- [x] Wrap every `<Suspense>` block in `App.tsx` with `<ErrorBoundary>`
- [x] Prioritize: `SimulationManager`, `BCMAAdministration`, `PatientCard`
- [x] Verify `ErrorBoundary.tsx` is exporting correctly and logs to error service
- **Why it matters:** A lazy chunk crash = blank screen mid-student-session. Unacceptable in a live sim.

> Notes: Done via the `SafeSuspense` helper in `App.tsx` (ErrorBoundary + Suspense in one
> wrapper), applied at 22 sites covering all 19 lazy routes — so no bare `<Suspense>` remains
> in `App.tsx`. `ErrorBoundary` is a named export from `src/components/ErrorBoundary.tsx` and
> its `componentDidCatch` logs to both `secureLogger` and `systemLogger` with the component
> stack.
>
> Residual, minor: two nested lazy boundaries use a bare `<Suspense>` —
> `FlowsheetFormWrapper.tsx:70` and `ModuleContent.tsx:235`. Both sit *inside* a SafeSuspense
> subtree (ModuleContent under `PatientCard`, FlowsheetFormWrapper under `FlowsheetsHub`), so a
> chunk failure is still caught and the app does not blank. The only cost is blast radius: the
> enclosing route unmounts rather than just that tab. Wrap them in `SafeSuspense` if that
> matters. Verified 2026-09-22.

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
**PARTIALLY DONE** — 2,172 → 353 lines. The data layer landed; the sub-component
extractions did not.

- [x] Extract patient data fetching to `usePatientDashboard(patientId, tenantId)` hook (React Query)
- [ ] Extract `<PatientHeader />` sub-component (patient name, age, room, allergies banner)
- [ ] Extract `<PatientAlerts />` sub-component
- [ ] Extract `<ModuleNavigation />` sub-component (tab bar)
- [ ] Extract `<QuickIntroModal />` sub-component
- [x] Replace `setLoading/setError/setPatient` useState chains with `useQuery`
- [x] Replace sequential `useEffect` fetch chains with parallel React Query queries
- [ ] Replace `labsRefreshTrigger` / `ordersRefreshTrigger` counters with `queryClient.invalidateQueries()`
- [x] Verify component stays under 350 lines after extraction
- [x] Run `npm run type-check`

> Notes (2026-09-22 audit): `usePatientDashboard.ts` exists (89 lines, 5 React Query calls) and
> the component is down to 353 lines — 3 over the 350 convention. The four named sub-components
> were never created, and two `labsRefreshTrigger` / `ordersRefreshTrigger` references remain in
> the component. Those are the only open items here.

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

### 3.1 — `backupService.ts` (1,685 lines — 20+ `any[]` return types) ✅ MOOT
- [x] ~~Type all `private export*` methods~~
- [x] ~~Extract a generic `exportTable<T>(...)` helper~~
- [x] ~~Split into `BackupExportService` + `BackupRestoreService`~~

> Notes (2026-09-22 audit): `backupService.ts` no longer exists anywhere in `src/`. The legacy
> backup system was removed (see the 2026-08-25 DATABASE CLEANUP entry in CHANGELOG.md), so all
> 1,685 lines and their `any[]` returns went with it. Nothing to do.

> Notes:

---

### 3.2 — `simulationService.ts` (1,196 lines — 3 domains mixed) ✅ COMPLETE
- [x] Split into `templateService.ts` — create/update/delete/version templates
- [x] Split into `simulationLifecycleService.ts` — launch/complete/reset/status
- [x] ~~Split into `simulationCompareService.ts`~~ — comparison folded into `templateService.ts` instead
- [x] Update all import references across the codebase
- [x] Run `npm run type-check`

> Notes (2026-09-22 audit): `simulationService.ts` is now a 13-line barrel re-exporting
> `templateService.ts` (343), `simulationLifecycleService.ts` (474) and
> `simulationHistoryService.ts`. Existing imports kept working unchanged, so no call sites needed
> touching. No separate compare service was created — the comparison functions live in
> `templateService.ts`, which is a reasonable home for them.

---

### 3.3 — `MARModule.tsx` (1,869 lines — form + history + grid fused)
> Note: Do after 2.1 (migration) is complete.
- [x] Extract `<AddMedicationForm />` sub-component
- [x] Extract `<EditMedicationForm />` sub-component
- [x] Extract `<MedicationAdministrationGrid />` sub-component
- [x] Extract `<BBITForm />` sub-component (or verify it's already in `patients/`)
- [x] Replace `useState` loading pattern with `useMedications` hook
- [x] Verify component stays under 350 lines

> Notes (2026-09-22 audit): MARModule.tsx is 329 lines, under the limit. All named extractions
> exist in `features/patients/components/mar/`: AddMedicationForm, EditMedicationForm,
> MedicationAdministrationGrid, BBITTab, plus MedicationHistoryView and CatalogMedicationPicker.
> `useMedications.ts` is in `features/patients/hooks/`.

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

## Phase 4 — Connect the generated types to the Supabase client

**The single highest-value change available, and the root cause of the `any` debt.**

`src/lib/api/supabase.ts` calls `createClient(...)` without the `<Database>`
generic. The 69 generated `Row` types in `src/types/supabase.ts` are therefore
wired to nothing: every `.from('patients').select('*')` returns untyped rows.
`npm run supabase:types` regenerates the file dutifully and no code consumes it.

That is why 319 `no-explicit-any` warnings existed. They are a symptom. Typing
the client makes the Postgres schema the compile-time source of truth, which is
the only durable defence against the silent-data-bug class this project keeps
hitting.

### Measured cost (2026-09-23)

Adding the generic and running `tsc`:

```
397 errors across 47 files
  215  TS2322  not assignable      (mostly nullable column -> non-null field)
   66  TS2345  argument mismatch
   50  TS2339  property missing    (see below -- mostly cascades)
   23  TS2769  no overload matches (insert/update shapes)
   23  TS2352  unsafe conversion
    8  TS18047 possibly null
```

Concentrated: `services/clinical` 92, `services/patient` 84,
`services/simulation` 41, `hooks/useSimulation.ts` 30,
`scripts/migrateMedications.ts` 27.

### 397 errors is NOT 397 fixes

The TS2339s look alarming ("property does not exist") but most cascade from a
handful of malformed `.select()` strings. Example: one select in
`medicationService.ts` makes Supabase's parser resolve `frequency` against
`user_profiles`, producing ~20 errors from a single root cause. Fix the select,
the cascade disappears.

The TS2322 majority is nullability -- Postgres `column | null` meeting an
interface that declared it required. Mechanical, and each one is a latent
`undefined` at runtime.

### Do it in this order

- [x] **4.1** Fix the malformed `.select()` strings first, with the client still
      untyped. **DONE 2026-09-23 — all 50 TS2339s cleared, total 397 -> 326.**
      They were not malformed selects. Three causes:
      - `simulation_patients` / `_vitals` / `_medications` / `_notes` do not
        exist. Three code paths queried them behind `if (simulationId)`, which
        was unreachable because `launch_simulation` never sets
        `tenants.simulation_id`. Dead code that looked load-bearing; deleted
        along with its parameters and eight call-site lookups.
      - `src/scripts/migrateMedications.ts`, a one-off already applied and
        imported by nothing, contributed 27. Deleted.
      - The rest were property access on `Json` at `supabase.rpc()` boundaries
        and JSONB columns. Added `lib/api/json.ts` with `asJsonObject()` and
        `expectJsonObject()`, which validate at runtime instead of asserting.
        `SimulationFunctionResult` was also missing `error`, `detail`, `status`,
        `state_id`, `patients_preserved` and `medications_preserved`, all of
        which the deployed reset functions return -- callers were reading
        `error` only because the value was untyped.
- [x] **4.2** Provide a per-file opt-in instead of a global switch.
      **DONE 2026-09-23** — `src/lib/api/supabase.ts` now also exports `db`, the
      same runtime client with `<Database>` applied. A service migrates by
      changing one import; everything else keeps working and the build stays
      green. Validated on `labService.ts`: switching its import surfaced exactly
      that file's 12 errors and nothing else.

      **Correction to the original plan.** It claimed that annotating call sites
      with `Row<'table'>` would "get most of the safety without a big bang" and
      thereby shrink the migration. Only the first half is true. Annotating
      `medicationService.ts` and `doctorsOrdersService.ts` validated their loop
      bodies and fixed real defects, but the typed-client error count barely
      moved (326 -> 325): annotations check what the body does with a row, while
      the client surfaces what the query itself returns. Overlapping sets, not
      the same one. Do both, but do not expect annotation alone to reduce 4.4.

      Shared helpers now live in `src/lib/api/`:
      `tables.ts` (`Row`, `Insert`, `Update`, `orUndefined`) and `json.ts`
      (`asJsonObject`, `expectJsonObject`).

      Use `Pick<Row<'t'>, 'a' | 'b'>` for a narrowed `.select('a, b')`. Claiming
      the full `Row` there asserts columns the query never fetched, which is the
      same lie the `any` was telling.
- [ ] **4.3** Migrate services to `db` one at a time, in risk order:
      `services/clinical` -> `services/patient` -> `services/simulation` ->
      hooks -> features. Current cost per area, measured 2026-09-23:
      clinical 73, patient 72, simulation 33, `hooks/useSimulation.ts` 31,
      admin 29, hacmap 19.

      **Expect hand-written domain types to be the real work.** `LabResultRef`
      is a 13-field mirror of `lab_result_refs` that differs only in nullability
      and in typing the `sex_ref` JSONB properly. Deriving it
      (`Omit<Row<'lab_result_refs'>, 'sex_ref'> & { sex_ref: SexSpecificRange | null }`)
      makes drift impossible, but ripples to every consumer, and `LabPanel` and
      `LabResult` need the same. Attempted and reverted on 2026-09-23 as a
      whole-domain change rather than a per-file one -- budget it that way.
- [ ] **4.4** Only once the count is low, add `<Database>` to `createClient` and
      clear the remainder. This is the commit that makes drift impossible, so it
      lands last, not first.
- [ ] **4.5** Add `npm run supabase:types` to the release checklist. The file had
      drifted 185 lines by 2026-09-23 because nothing consumed it; once the
      client is typed, staleness becomes a build failure instead of silence.

### What it buys

A renamed or dropped column fails the build instead of silently producing
`undefined` in a chart. Tonight's pass, covering three service areas and the
debrief pipeline, found by this method alone:

- `bloodPressure` emitted as `{systolic: null, diastolic: null}`, making
  `if (vitals.bloodPressure)` truthy for a patient with no BP recorded
- five debrief fields reading columns that do not exist, always undefined
- `wound_assessments.drainage_type` declared `string`, actually `text[]`
- unvalidated enum values reaching CHECK-constrained columns
- seven `secureLogger.error(err)` calls putting the error in the message slot

None of these would have been found by reading the code.

### Risks

- It is a large diff touching clinical services. Land it in area-sized PRs, not
  one change.
- Some errors will be genuine behaviour decisions rather than mechanical fixes
  (a dead field could be removed or remapped -- those are product calls).
- Do not "fix" errors with `as any`. That reintroduces exactly what this removes.

---

## Ongoing / Housekeeping

### Type Safety
- [ ] Reduce the remaining **345** `no-explicit-any` warnings — prioritize services touching patient data
  - Was 424 before 2026-09-22; all 79 `catch (e: any)` bindings are done, narrowed through
    `src/lib/errors.ts`. What is left: `(x: any) =>` callbacks (59), `as any` assertions (40),
    `: any[]` (25), `Record<string, any>` (12), plus 26 `react-refresh/only-export-components`.
  - Biggest concentrations: `studentActivityService.ts` (29), `simulationLifecycleService.ts` (23),
    `templateService.ts` (18), `labService.ts` (17), `schemaEngine.ts` (17).
- [ ] Enable `noImplicitAny` in `tsconfig.app.json` once count is below ~50
- [x] Run `npm run type-check` on each PR — now enforced in CI, and it was a no-op before
      2026-09-22 (bare `tsc --noEmit` resolved the root solution tsconfig with `"files": []`,
      so it checked zero files and always passed)

### Performance
- [x] `ErrorBoundary` wrapping is also a perf guard (prevents full tree unmount on lazy errors) — see 1.1
- [ ] Review `studentActivityService.ts` — large `Promise.all` block; check for N+1 queries
  - **It has grown, not shrunk: 1,067 → 1,448 lines** as of 2026-09-22. Also the single largest
    holder of `any` warnings (29). It is on the debrief path, so a regression here is only
    noticed after a session ends.
- [ ] 12 components still exceed the 350-line convention, none of them tracked above:
      `SimulationTemplates.tsx` (1,194), `reactPdfGenerator.tsx` (990),
      `ManagementDashboard.tsx` (940), `LaunchSimulationModal.tsx` (926),
      `MedicationForm.tsx` (917), `Changelog.tsx` (915), `LandingPage.tsx` (901),
      `BBITTab.tsx` (867), `BCMAAdministration.tsx` (835), `SimulationHistory.tsx` (820),
      `DeviceForm.tsx` (798), `VitalsModule.tsx` (788). Section 3.4 is marked COMPLETE, and is —
      for the five files it names. It was never the whole list.

### Database
- [ ] Migrations — review for consolidation in the next quarterly window. The count is **47**,
      not 69: 40 in `database/migrations/` plus 7 in `supabase/migrations/` (baseline, two no-op
      stubs kept for history alignment, and the four 2026-09-21 security migrations).
- [ ] Document any new clinical table additions against the 4-part checklist (reset function, table config, debrief service, debrief modal)
- [ ] Post-1.0: migrate `patient_advanced_directives` + `patient_admission_records` into the generic
      `patient_system_assessments` (system_type + JSONB) pattern already proven by `consents`/`bpmh`.
      Both are true one-row-per-patient config records with no relational/numeric-graphing needs —
      collapsing them eliminates the manual 4-part wiring entirely and the orphaned-row duplicate-key
      class of bug (Aug 18, 2026 incident). Do NOT do this for vitals/meds/labs/wounds/devices/TR —
      those need typed columns or relational structure.
- [ ] Build a dev-only "seed all 28 flowsheets + validate lifecycle" harness (seeder using real
      save hooks + a report checking template → snapshot → launch → debrief → reset per table) so new
      flowsheet wiring can be regression-tested without manually filling every form each time.

---

## Completed

- [x] RLS multiple permissive policies fix (April 16, 2026) — `20260416000001_fix_multiple_permissive_policies.sql`
- [x] RLS always-true policy fix — `fix/rls-policy-always-true` branch
