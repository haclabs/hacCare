# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # vite build + scripts/prerender.mjs (SSR snapshot of landing page)
npm run preview        # Serve the production build
npm run lint           # ESLint, --max-warnings 0
npm run lint:fix       # ESLint with --fix
npm run type-check     # tsc --noEmit -p tsconfig.app.json
npm run test           # Vitest (run mode)
npm run test:watch     # Vitest watch
npm run supabase:types # Regenerate src/types/supabase.ts from the linked Supabase project
```

Run a single test file or a single case:

```bash
npx vitest run src/services/clinical/bcmaService.test.ts
npx vitest run -t "name of the test"
```

Vitest is configured inline in `vite.config.ts` (`test` block): `environment: 'node'`,
`include: ['src/**/*.test.{ts,tsx}']`. Rendering a component test needs a DOM environment, which
is **not installed** — add `jsdom` and `@testing-library/react`, then a `// @vitest-environment
jsdom` docblock in the file. Test coverage is thin (2 files); most verification is manual.

Path alias: `@` → `./src`.

Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (see `.env.example`).

## Architecture

hacCare is a multi-tenant healthcare simulation platform (a teaching EMR) for clinical education.
React 19 + TypeScript (strict) + Vite, with Supabase/PostgreSQL as the entire backend — there is no
application server. Authorization lives in Postgres Row Level Security, not in the client.

### Tenancy is the central concept

Every table carries `tenant_id UUID NOT NULL` and RLS policies enforce isolation. `tenant_type`
distinguishes `production`, `institution`, `program`, `simulation_template`, and `simulation_active`.

- **Institutions** contain **programs** (e.g. NESA, PN, SIM Hub, BNAD). Program tenants are empty
  instructor workspaces — no patient data, just template and simulation management.
- **Templates are live tenants**, not frozen data. Editing a template means temporarily switching
  `currentTenant` into that template's tenant (`enterTemplateTenant()` in `TenantContext`), which
  also upserts the user into `tenant_users` so RLS lets them through. `exitTemplateTenant()` calls
  `save_template_snapshot()` and switches back. The `snapshot_data` JSONB column is the frozen copy
  used at launch.
- **Launching a simulation** copies a template snapshot into a brand-new tenant, generating **fresh
  UUIDs and fresh barcodes for everything**. See the matching rule below.
- Role hierarchy: `super_admin` → `coordinator` → `admin` → `instructor` (scoped to assigned
  programs via `user_programs`) → `nurse` (simulation participants). Filtering logic is in
  `src/hooks/useUserProgramAccess.ts`; role changes need a logout/login to take effect.

Simulations use the same components and workflows as production — there is no separate code path.
In production they run on a `simulation.` subdomain that auto-redirects to `/simulation-portal`
(detected in `src/App.tsx`).

### Data access

- All server state goes through TanStack Query. Query client and centralized keys:
  `src/lib/api/queryClient.ts`. Supabase client: `src/lib/api/supabase.ts`.
- **Always filter by `tenant_id` explicitly** in Supabase queries. RLS expects
  `app.current_tenant_id`, but components pass the tenant through directly; omitting it is the
  single most common source of bugs here. Canonical pattern:
  `src/features/patients/hooks/useMultiTenantPatients.ts`.
- Prefer React Query hooks over calling Supabase directly from components.
- Do not use localStorage/sessionStorage for domain data — Supabase owns persistence. (sessionStorage
  is used for transient UI state like `editing_template`.)
- `src/types/supabase.ts` is generated; never hand-edit it.

### Provider hierarchy

Composed in `src/main.tsx`, and the order is load-bearing:
`ErrorBoundary` → `BrowserRouter` → `QueryClientProvider` → `ThemeProvider` →
`SimulationAwareAuthProvider` → (on `/app/*`) `TenantProvider` → `PatientProvider` →
`ProtectedRoute` → `App`. Public routes (`/`, `/login`, `/privacy`, `/set-password`) sit outside
the tenant providers. `App.tsx` holds the authenticated routes and lazy-loads heavy ones.

### Code layout

- `src/features/<domain>/` — `patients`, `simulation`, `admin`, `flowsheets`, `forms`, `hacmap`,
  `settings`, `therapeutic-recreation`, `training`. Each has `components/`, `hooks/`, sometimes
  `services/`. Max 3 levels deep; barrel `index.ts` for the public API.
- `src/services/<area>/` — cross-cutting service modules (`clinical`, `simulation`, `admin`,
  `auth`, `monitoring`, `export`, …).
- `src/lib/` — infrastructure: `api`, `barcode`, `security`, `validation`, `media`, `infrastructure`.
- `.tsx` for components, `.ts` for everything else. Use `import type` for type-only imports.

### Database changes

- **New migrations go in `supabase/migrations/`.** That is the only directory `supabase db push`
  reads, so a migration placed anywhere else silently never deploys. Its baseline
  (`20251113000000_initial_schema.sql`) is a `supabase db dump --schema public` of production;
  refresh it when a local `supabase start` fails with `relation "…" does not exist`.
- `database/migrations/` is a **historical record of changes applied by hand** to Supabase, not a
  queue. Nothing reads it automatically. Do not add to it.
- Reusable function definitions live in `database/functions/`.
- **Editing a `.sql` file in `database/functions/` does not change the live database.** Postgres
  runs its own compiled copy. Any change to a deployed function needs a migration that does
  `CREATE OR REPLACE FUNCTION`.
- Privileged cross-tenant work uses `SECURITY DEFINER` RPCs — `launch_simulation`,
  `complete_simulation`, `reset_simulation_for_next_session`,
  `reset_simulation_with_template_updates`, `restore_snapshot_to_tenant`,
  `save_template_snapshot_v2`. Call via `supabase.rpc(...)`.
- RLS policies that query their own table cause infinite recursion. Use a `SECURITY DEFINER`
  function instead of a recursive lookup.

## Two rules that cause silent data bugs

**1. Never match template ↔ simulation records by UUID or barcode.** Launch regenerates both.
Match on immutable properties instead: patients by `first_name` + `last_name` + `date_of_birth`;
medications by `name` + `dosage` + `route`; orders by `order_text` + `category`; labs by
`test_name` + `panel_name`. A barcode-based match returns NULL and silently skips records rather
than erroring.

**2. Adding a new `patient_*` clinical table requires four separate wirings**, or entries will
accumulate across resets or vanish from debriefs:
1. A `DELETE FROM <table> WHERE tenant_id = v_tenant_id` in **both**
   `reset_simulation_for_next_session` and `reset_simulation_with_template_updates` — deployed via
   migration, not just edited locally.
2. A row in the `simulation_table_config` registry, so `save_template_snapshot_v2` captures it.
3. Query + processing in `src/services/simulation/studentActivityService.ts` (debrief pipeline).
4. A section in `src/features/simulation/components/EnhancedDebriefModal.tsx` (debrief render).

## Conventions

- Component size limit is **350 lines**; extract sub-components past that.
- Tech-debt removal is treated as a first-class task: delete unused code when you find it, and note
  significant cleanup in `CHANGELOG.md`.
- Color semantics are consistent across the UI: blue = primary/navigation, green = active
  simulations/success, amber = templates/editing mode, purple = program/instructor features,
  red = destructive/alerts, indigo = system admin.
- Heavy routes (PDF, barcode) are `React.lazy()`-loaded; manual chunking in `vite.config.ts`
  deliberately does *not* split feature folders because of cross-imports.

## Further reference

`.github/copilot-instructions.md` holds an extended version of this guidance, including detailed
write-ups of past bugs (empty-array handling in snapshot restore, nullable vital signs, program
tenant setup) with the exact symptoms and fixes. Worth consulting when touching the simulation
snapshot/reset machinery.

Domain docs are under `docs/`: `architecture/` (security, RLS), `features/` (bcma, simulation,
patients, labs), `database/`, `operations/` (deployment, troubleshooting), `user-guides/`.

Deployment is Netlify (`netlify.toml`), with SPA fallback and a `simulation.haccare.app` subdomain
redirect. CI (`.github/workflows/ci.yml`) runs lint, type-check, tests, build, plus npm audit,
Snyk, and CodeQL. Lint, type-check, tests and `npm audit --audit-level=high` all block as of
2026-09-22; before that they were `continue-on-error` and a green check meant nothing. Lint runs
as `lint:ci` (gates on errors only) because the tree carries 424 warnings — ratchet those down,
then switch it to `npm run lint`.

`main` requires linear history, so PRs squash- or rebase-merge; a merge commit is not offered.
After a squash-merge of `develop`, merge `main` back into `develop` or the next PR conflicts.
Required checks are `Test & Lint` and `Security Audit`.
