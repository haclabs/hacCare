# Clinical Flowsheets System

**Status:** Foundation complete — hub UI live, native forms in development  
**Last Updated:** May 20, 2026

## Overview

The Flowsheets Hub is a central clinical documentation hub accessible from the patient chart. It provides a single entry point to 33 clinical assessments and forms, organised across 8 care categories. The hub delegates to existing modules where forms already exist ("module shortcuts") and will host inline native forms for everything else.

---

## Architecture

### Two Card Types (Discriminated Union)

Every entry in the registry is one of two types, enforced via `linkType`:

```typescript
type FlowsheetDefinition =
  | NativeFlowsheetDefinition   // linkType: 'native'  — form renders inline inside the hub
  | ModuleShortcutDefinition;   // linkType: 'module-shortcut' — navigates to an existing module
```

**Module shortcuts** (12 entries) open an existing feature in the patient chart:
| `moduleTarget`        | Opens                              |
|-----------------------|------------------------------------|
| `vitals`              | Vitals & Assessments module        |
| `hacmap`              | HacMap body diagram (devices/wounds)|
| `intake-output`       | Intake & Output module             |
| `medications`         | MAR / BBIT module                  |
| `forms`               | Clinical Forms module              |
| `handover`            | Handover Notes (SBAR)              |
| `advanced-directives` | Advanced Directives module         |

**Native forms** (21 entries) render inline within the hub via a form wrapper component. All are currently `status: 'coming-soon'` — they show as disabled cards until their form component is built and registered.

### Hub State Machine

The hub owns its own internal routing with a discriminated union state:

```typescript
type HubView =
  | { mode: 'grid' }                    // default — shows all category sections
  | { mode: 'form'; formId: string };   // renders a single native form inline
```

This means **no URL changes, no router involvement** — the hub manages its own view transitions. The parent component only needs `onNavigateToModule` and `onNavigateToOverview` callbacks.

---

## File Structure

```
src/features/flowsheets/
├── types.ts              # All TypeScript types (HubView, FlowsheetDefinition, FlowsheetFormProps, …)
├── registry.ts           # Central registry — 33 entries + CATEGORY_META + CATEGORY_ORDER
├── index.ts              # Public barrel export
└── components/
    ├── FlowsheetsHub.tsx      # Hub shell — owns routing state, sticky nav, grid/form toggle
    ├── FlowsheetCard.tsx      # Compact card for horizontal scroll strip
    └── FlowsheetFormWrapper.tsx  # Visual shell for inline native forms (breadcrumb + patient context)
```

### Key Types (`types.ts`)

| Type | Purpose |
|------|---------|
| `HubView` | Hub routing state — `grid` or `form` with formId |
| `FlowsheetDefinition` | Discriminated union of native vs. shortcut |
| `NativeFlowsheetDefinition` | Has `status: 'active' \| 'coming-soon'` and `systemType` |
| `ModuleShortcutDefinition` | Has `moduleTarget: FlowsheetModuleTarget` |
| `FlowsheetFormProps` | Contract all native form components must implement |
| `FlowsheetCategory` | `'monitoring' \| 'systems' \| 'risk-safety' \| …` (8 categories) |
| `FlowsheetCategoryMeta` | Styling metadata (colors, icon, label) for each category |

---

## The 8 Categories

| Category | Color | Description |
|----------|-------|-------------|
| Monitoring & Vitals | Blue | Vital signs, neuro, newborn, pain |
| Systems Assessment | Indigo | Respiratory, cardiovascular, GI, GU, MSK, integumentary |
| Risk & Safety | Orange | Morse Fall Scale, Braden Scale, Restraint |
| Wound & Device Care | Rose | Device placement (HacMap), wound assessment |
| Fluid & Metabolic | Cyan | I&O, BBIT/blood glucose, bowel |
| Mental Health & Cognition | Violet | Biopsychosocial, cognitive screening, mood |
| Therapeutic Recreation | Emerald | 6 TRG-specific assessments (program-filtered) |
| Clinical Documentation | Slate | SBAR handover, advanced directives, consents, BPMH |

---

## Adding a Native Form Component (Phase 2 Checklist)

Building a new inline form requires **exactly 3 steps** in the frontend, plus the standard 4-part clinical table checklist from the project guide:

### Step 1 — Build the form component

Create `src/features/flowsheets/forms/[FormName]Form.tsx` implementing `FlowsheetFormProps`:

```typescript
import type { FlowsheetFormProps } from '../types';

export const PainAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient,
  tenantId,
  currentUser,
  onSaved,
  onCancel,
}) => {
  // Form implementation
};
```

`FlowsheetFormWrapper` (the breadcrumb shell + back button) is automatically applied by the hub — the form component only needs to render the form fields and submit logic.

### Step 2 — Register in `FORM_COMPONENTS`

In `FlowsheetsHub.tsx`, add to the `FORM_COMPONENTS` map at the top of the file:

```typescript
import { PainAssessmentForm } from '../forms/PainAssessmentForm';

const FORM_COMPONENTS: Partial<Record<string, React.ComponentType<FlowsheetFormProps>>> = {
  'pain': PainAssessmentForm,
  // … other registered forms
};
```

### Step 3 — Flip registry entry to active

In `registry.ts`, change the entry's status:

```typescript
{
  id: 'pain',
  // ...
  linkType: 'native',
  status: 'active',   // ← was 'coming-soon'
  systemType: 'pain',
},
```

The card immediately becomes clickable and routes to the form. **No other files need to change for the hub routing to work.**

### Step 4 — Database + debrief wiring (required per project guide)

Follow the 4-part checklist in `.github/copilot-instructions.md` under "CRITICAL: Adding a New Clinical Table":

1. **Reset functions** — add `DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id AND system_type = 'pain'` to both reset functions via a new migration
2. **`simulation_table_config`** — add a row so template snapshots capture the data
3. **`studentActivityService.ts`** — add query + processing block for debrief aggregation
4. **`EnhancedDebriefModal.tsx`** — add render section for the debrief report

---

## Integration with Simulation System

### Template Editing

The hub works in template editing mode without any special handling. When an instructor enters a template tenant via `TemplateEditingBanner`, `currentTenant` switches to the template tenant. All flowsheet forms that write to the database include `tenantId` (passed via `FlowsheetFormProps`) so data is correctly scoped to the template tenant.

Module shortcuts (vitals, HacMap, etc.) are unaffected — they delegate to existing modules that already handle template tenant context.

### Snapshot & Restore

Native forms write to `patient_system_assessments` (and any form-specific tables). These tables must be registered in `simulation_table_config` for `save_template_snapshot_v2` to include them in the template baseline.

When `restore_snapshot_to_tenant_v2` runs on session reset, it wipes and restores these tables as part of the standard snapshot restore — no flowsheet-specific code needed, as long as the table is registered.

### `lastRecorded` Timestamps (Not Yet Implemented)

`FlowsheetCard` accepts a `lastRecorded?: string | null` prop that displays as "Last: X ago" on the card. Currently all cards show `—`. 

When implementing:
- Query `MAX(recorded_at)` per `system_type` from `patient_system_assessments` grouped by patient
- For module shortcuts, query the relevant table (e.g., `MAX(recorded_at)` from `patient_vitals`)
- Pass results into `FlowsheetsHub` via a `lastRecordedMap` prop and forward to each `FlowsheetCard`

---

## Navigation & UX

### Entry Points

The hub is accessible from two places:
- **PatientActionBar** — position 2 (`LayoutGrid` icon, label "Flowsheets")
- **PatientOverview** inline nav bar — position 2 (same icon + label)

Both trigger `setActiveModule('flowsheets')` in `ModularPatientDashboard` → rendered by `ModuleContent` → `FlowsheetsHub`.

### Sticky Category Nav

A sticky nav bar sits below the page header (`sticky top-0 z-10`). It contains:
- **← Patient Overview** button — calls `onNavigateToOverview` to leave the hub
- **8 category icon buttons** — `scrollIntoView({ behavior: 'smooth', block: 'start' })` to the section

Sections use `id="flowsheet-cat-{catId}"` and `className="scroll-mt-16"` (accounts for sticky nav height).

### Back to Top

An inline pill button at the bottom of the content calls `scrollToTop()` — a utility that walks up the DOM to find the actual scrollable container and sets `scrollTop = 0`. Does **not** use `scrollIntoView` (which corrects all axes and causes a horizontal shift due to the `-mx-8` bleed on scroll strips).

---

## Database

### `patient_system_assessments` table

```sql
CREATE TABLE patient_system_assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  patient_id   UUID NOT NULL REFERENCES patients(id),
  system_type  TEXT NOT NULL,   -- matches NativeFlowsheetDefinition.systemType
  data         JSONB NOT NULL,  -- flexible schema per form
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by  UUID REFERENCES user_profiles(id),
  student_name TEXT
);
```

`system_type` values map directly to `NativeFlowsheetDefinition.systemType` in the registry (e.g. `'pain'`, `'respiratory'`, `'fall-risk'`).

Migration: `database/migrations/20260520000000_create_patient_system_assessments.sql`

---

## Current Status

| Category | Ready | Coming Soon |
|----------|-------|-------------|
| Monitoring | Vitals, Neuro, Newborn (→ Vitals module) | Pain |
| Systems | — | Respiratory, Cardiovascular, GI, GU, MSK, Integumentary |
| Risk & Safety | — | Fall Risk, Braden Scale, Restraint |
| Wound & Device | Device Placement, Wound (→ HacMap) | — |
| Fluid & Metabolic | I&O (→ I&O), BBIT (→ MAR), Bowel (→ Forms) | — |
| Mental Health | — | Biopsychosocial, Cognitive Screening, Mood |
| Therapeutic Rec | — | 6 TRG assessments |
| Clinical Docs | Handover, Directives, Nursing/Admission Assessment (→ existing modules) | Consents, BPMH |

**12 live (module shortcuts) · 21 coming soon (native forms)**
