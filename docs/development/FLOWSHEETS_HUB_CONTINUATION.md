# Clinical Flowsheets Hub — Continuation Notes
**Branch:** `feature/flowsheets-hub`  
**PR:** https://github.com/haclabs/hacCare/pull/325  
**Last worked on:** May 21, 2026  
**Status: Ready for testing — PR open, all forms complete, scroll bug fixed**

---

## What Was Built

A full Clinical Flowsheets Hub with 19 native assessment forms backed by a single
`patient_system_assessments` JSONB table with a `system_type` discriminator column.

### Key Files
| File | Purpose |
|------|---------|
| `src/features/flowsheets/registry.ts` | All 19 flowsheet card definitions + metadata |
| `src/features/flowsheets/formRegistry.ts` | Maps flowsheet IDs → React.lazy() form components |
| `src/features/flowsheets/components/FlowsheetsHub.tsx` | Main hub component (grid ↔ form view) |
| `src/features/flowsheets/components/FlowsheetFormWrapper.tsx` | Consistent shell (header, breadcrumb, Suspense) |
| `src/features/flowsheets/hooks/useSystemAssessment.ts` | All 3 TanStack Query hooks |
| `src/features/flowsheets/types.ts` | All shared types |
| `src/features/flowsheets/index.ts` | Barrel export |
| `database/migrations/20260521000000_create_patient_system_assessments.sql` | Table + RLS |
| `database/migrations/20260521000001_add_is_baseline_to_system_assessments.sql` | `is_baseline` column |
| `database/missing/20260521000002_update_reset_for_system_assessments.sql` | Reset function update |
| `database/migrations/20260522000000_fix_psa_rls_super_admin.sql` | Super admin RLS bypass |

---

## All 19 Forms — IDs and system_types

| Registry ID | File | system_type |
|-------------|------|-------------|
| `pain` | PainAssessmentForm.tsx | `pain` |
| `respiratory` | RespiratoryAssessmentForm.tsx | `respiratory` |
| `cardiovascular` | CardiovascularAssessmentForm.tsx | `cardiovascular` |
| `gastrointestinal` | GastrointestinalAssessmentForm.tsx | `gastrointestinal` |
| `genitourinary` | GenitourinaryAssessmentForm.tsx | `genitourinary` |
| `musculoskeletal` | MusculoskeletalAssessmentForm.tsx | `musculoskeletal` |
| `integumentary` | IntegumentaryAssessmentForm.tsx | `integumentary` |
| `fall-risk` | FallRiskAssessmentForm.tsx | `fall-risk` |
| `braden-scale` | BradenScaleForm.tsx | `braden-scale` |
| `restraint` | RestraintAssessmentForm.tsx | `restraint` |
| `biopsychosocial` | BiopsychosocialAssessmentForm.tsx | `biopsychosocial` |
| `cognitive` | CognitiveScreeningForm.tsx | `cognitive` |
| `mood` | MoodAssessmentForm.tsx | `mood` |
| `tr-leisure-interest` | TRLeisureInterestForm.tsx | `tr-leisure-interest` |
| `tr-functional` | TRFunctionalAssessmentForm.tsx | `tr-functional` |
| `tr-social` | TRSocialParticipationForm.tsx | `tr-social` |
| `tr-goals` | TRGoalSettingForm.tsx | `tr-goals` |
| `tr-participation` | TRActivityNoteForm.tsx | `tr-participation` ⚠️ NOT `tr-activity-note` |
| `tr-qol` | TRQualityOfLifeForm.tsx | `tr-qol` |

**Still coming-soon (no form yet):** `consents` (system_type: `consent`) and `bpmh` (system_type: `bpmh`)

---

## Database

### Table: `patient_system_assessments`
```sql
CREATE TABLE patient_system_assessments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  system_type TEXT NOT NULL,          -- discriminator, e.g. 'respiratory'
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by TEXT,                   -- student name (free text)
  recorded_by_user_id UUID,           -- optional auth.uid()
  is_baseline BOOLEAN NOT NULL DEFAULT false,  -- TRUE = instructor baseline
  data        JSONB NOT NULL          -- entire form payload
);
```
RLS: tenant isolation + super_admin bypass policy `psa_super_admin`.

### Migrations applied to branch (need to be run on Supabase):
1. `20260521000000_create_patient_system_assessments.sql` — table + RLS
2. `20260521000001_add_is_baseline_to_system_assessments.sql` — is_baseline column
3. `20260521000002_fix_psa_rls_super_admin.sql` — super admin RLS

**⚠️ Migration 20260521000001 also updates `reset_simulation_for_next_session`** to delete
non-baseline rows (`is_baseline = false`) and strip the table from the snapshot restore.
This only covers that one reset function — see "Pending Work" below for the other one.

---

## React Query Hooks (useSystemAssessment.ts)

```typescript
// Read latest entry for a given patient + system_type
const { latest, isLoading } = useLatestSystemAssessment(patientId, tenantId, 'respiratory');

// Read all history (non-baseline, newest-first) for history panel
const { history, isLoading } = useSystemAssessmentHistory(patientId, tenantId, 'respiratory');

// Save a new entry (INSERT only, never UPDATE)
const { save, isSaving, error } = useSaveSystemAssessment(patientId, tenantId, 'respiratory');
await save({ ...payload, patient_id, tenant_id, system_type: 'respiratory' });
```

Query key structure: `['system-assessment', systemType, patientId, tenantId]`  
On save: invalidates `['system-assessment', ...]` and `['patients', ...]`

---

## Form Component Contract

Every form gets these props:
```typescript
interface FlowsheetFormProps {
  patient: Patient;
  tenantId: string;
  currentUser?: { id: string; name: string; role: string };
  isBaseline: boolean;  // true when editing a simulation template
  onSaved: () => void;  // hub returns to grid on success
  onCancel: () => void; // hub returns to grid on cancel
}
```

`isBaseline` comes from: `currentTenant?.tenant_type === 'simulation_template'`

---

## is_baseline Flag

- `true` → instructor editing a simulation template (entries survive sim reset)
- `false` → student entry during active simulation (wiped on `reset_simulation_for_next_session`)
- `simulation_table_config` table controls snapshot capture — `patient_system_assessments`
  needs to be registered there if instructor baselines should be snapshot-captured
  (check if it was added; if not, add it)

---

## Pending Work

### 1. `reset_simulation_with_template_updates` — ON HOLD until testing
This sibling reset function was NOT updated to delete non-baseline system assessments.
Add a migration to redeploy it with:
```sql
DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id AND is_baseline = false;
```
File to update: `database/functions/reset_simulation_with_template_updates.sql`
Then create a migration to `CREATE OR REPLACE FUNCTION` it in the live DB.

### 2. simulation_table_config registration — CHECK THIS
The `simulation_table_config` table controls what gets captured in template snapshots.
`patient_system_assessments` may or may not be registered.
```sql
SELECT * FROM simulation_table_config WHERE table_name = 'patient_system_assessments';
```
If missing:
```sql
INSERT INTO simulation_table_config 
  (table_name, category, has_patient_id, has_tenant_id, requires_id_mapping, delete_order, enabled, notes)
VALUES 
  ('patient_system_assessments', 'student_work', true, true, true, 5, true, 
   'Native flowsheet form entries - is_baseline=true entries are instructor baseline');
```

### 3. Debrief pipeline — FOLLOW-UP PR
System assessments don't appear in the student debrief report yet. Two files need updating:
- `src/services/simulation/studentActivityService.ts` — add query for `patient_system_assessments`
- `src/features/simulation/components/EnhancedDebriefModal.tsx` — add render section

**Recommended approach (Option B — config-driven):**
```typescript
// In studentActivityService.ts — single query, loop over FLOWSHEET_REGISTRY:
const { data: assessments } = await supabase
  .from('patient_system_assessments')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('is_baseline', false)
  .not('recorded_by', 'is', null);

// Group by system_type, attach to student activities
// In EnhancedDebriefModal, loop over FLOWSHEET_REGISTRY to auto-generate sections
```

### 4. consents and bpmh forms — ✅ DONE (May 27, 2026)
Both forms built and wired up:
- `src/features/flowsheets/forms/ConsentForm.tsx` — Canadian informed consent (type, procedure, disclosure, capacity/SDM, interpreter, decision, witness)
- `src/features/flowsheets/forms/BPMHForm.tsx` — Best Possible Medication History with dynamic multi-row medication list (generic/brand name, dosage + unit, route, formulation, frequency, verification source), history sources, allergy confirmation, discrepancy notes
- Both added to `formRegistry.ts` and flipped to `status: 'active'` in `registry.ts`

---

## Bugs Fixed This Session

| Bug | Fix |
|-----|-----|
| Opening a form scrolled down to student name field | `scrollToTop()` was defined in FlowsheetsHub but never called on form open/close. Added call in `handleCardOpen()` and `handleBackToGrid()`. |
| TRActivityNoteForm system_type mismatch | registry.ts used `tr-participation`, form used `tr-activity-note`. Fixed form to use `tr-participation`. |
| Dependabot #61: brace-expansion DoS (GHSA-jxxr-4gwj-5jf2) | `npm audit fix` → 5.0.6 |

---

## Architecture Notes

### How Hub Navigation Works
1. Hub starts in `{ mode: 'grid' }` — shows all 19 cards
2. Card click → `setHubView({ mode: 'form', formId: sheet.id })` + `scrollToTop()`
3. `FlowsheetsHub` renders `<FlowsheetFormWrapper>` with the active form lazy-loaded inside
4. Form calls `onSaved()` or `onCancel()` → `handleBackToGrid()` → `setHubView({ mode: 'grid' })` + `scrollToTop()`
5. `scrollToTop()` walks up the DOM to find the nearest scrollable ancestor and calls `.scrollTo({ top: 0 })`

### scrollToTop Implementation (FlowsheetsHub.tsx ~line 60)
Uses parent DOM traversal (not `scrollIntoView`) to avoid horizontal scroll wobble caused
by the `-mx-8` scroll strip containers.

### Lazy Loading
All 19 form components are code-split via `React.lazy()` in `formRegistry.ts`.
The `Suspense` boundary is inside `FlowsheetFormWrapper` so the header stays visible
during load. This keeps the initial bundle small.

### Template Editing (isBaseline)
When an instructor edits a simulation template, `currentTenant.tenant_type === 'simulation_template'`.
This gets passed as `isBaseline={true}` to all form components. Forms pass it straight
through to `useSaveSystemAssessment` → INSERT sets `is_baseline = true` on the row.
Those baseline rows are NOT deleted on simulation reset.

---

## How to Resume Tomorrow

1. **Run migrations** — if not already applied to Supabase, run the 3 migrations in order
2. **Test forms** — open a patient, go to Clinical Flowsheets tab, test each form category
3. **Verify scroll** — should land at top of form, back button should land at top of grid
4. **Check history panel** — past entries should show below "History" toggle per form
5. **If all good** → merge PR #325 then start follow-up PR for debrief pipeline (item #3 above)

### Quick start after Codespace resume:
```bash
cd /workspaces/hacCare
git status           # confirm on feature/flowsheets-hub
npm run dev          # Vite dev server on http://localhost:5173
npm run type-check   # should be clean (was clean at end of session)
```
