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

- **Institutions** contain **programs** (e.g. PROG-A, PROG-B). Program tenants are empty
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
- `src/lib/` — infrastructure: `api`, `barcode`, `security`, `validation`, `infrastructure`.
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
- **A `SECURITY DEFINER` RPC bypasses RLS, so it must check its caller itself.** Its first
  statement is a `PERFORM public.assert_*(...)` guard (`assert_can_manage_simulation`,
  `assert_can_manage_simulation_template`, `assert_can_manage_patient_template`, …) marked
  `-- access guard`. Keep that line when redeploying a function, and add one to any new RPC;
  `supabase/tests/verify_rls_isolation.sql` fails if a guard goes missing.
- Templates and simulations belong to an institution (`owner_institution_id`); restrictive RLS
  policies hide them from other institutions even when program codes match.
- Coordinators and admins are institution-scoped, not platform-wide: restrictive `*_institution_scope`
  policies and `caller_can_administer_user()` limit them to users, programs and tenants of their
  own institution. Only `super_admin` crosses institutions. Don't add role-only checks for them.
- RLS policies that query their own table cause infinite recursion. Use a `SECURITY DEFINER`
  function instead of a recursive lookup.

## Rules that cause silent data bugs

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

**3. Program codes are not unique across institutions** (`programs` is `UNIQUE (tenant_id, code)`).
Never grant access on a code match alone — pair it with the institution (`owner_institution_id`,
`caller_in_institution()`). New code paths that create templates must pass the current tenant as
`p_owner_tenant_id`, or the template is stamped with a guessed (or no) institution.

**4. Debrief attribution comes from a name column on each row** (`student_name`, or `nurse_name` /
`recorded_by` / `clinician_name` on newer tables). Rows without one are dropped from the debrief, and a
form that saves without asking for the name loses that student's work. Single-row-per-patient
upserts (e.g. the newborn assessment) credit only the last named writer — never overwrite a stored
name with an empty one.

## Working on the live database

- **Migration versions:** `supabase db push` and the Supabase MCP `apply_migration` both record a
  version in `supabase_migrations.schema_migrations`. `apply_migration` stamps the current time, so
  name the local file with the version it recorded (check `supabase migration list --linked`), or the
  next `db push` will try to run it again.
- **Proving an RLS change** (see `supabase/tests/verify_rls_isolation.sql`): impersonate inside a
  transaction with `SET LOCAL role authenticated` plus `set_config('request.jwt.claims',
  '{"sub":"<uuid>","role":"authenticated"}', true)`, and end with `RAISE EXCEPTION` so it rolls back.
  Compare every user's row counts with and without the new policy (drop it inside the same
  transaction) before shipping. Two traps: look up target IDs *before* switching role (RLS hides them
  afterwards and you get NULL), and RPCs wrapped in `EXCEPTION WHEN OTHERS` return
  `{success:false}` instead of raising, so check the result rather than catching an exception.
- **New institution:** a single `tenants` row with `tenant_type = 'institution'`; nothing else fires.
  Inserting a `programs` row triggers `create_program_tenant()`, which names the program tenant's
  subdomain after the lowercased code and falls back to `<code>_<8 chars>` if it's taken. To choose
  the subdomain, insert the program with `is_active = false`, create its tenant yourself, then
  activate it.
- **Building a patient template in SQL:** create the `patient_template` tenant, the
  `patient_templates` row (with `owner_institution_id`) and a `tenant_users` admin row, insert the
  clinical rows with that `tenant_id`, then call `save_patient_template_snapshot()` — it captures
  every table that has a `tenant_id` column. Medications pick up catalog barcodes via `catalog_id`;
  free-entry ones get one from the `assign_free_entry_medication_barcode` trigger.

## Conventions

- **Never name a real tenant in anything committed** — code, comments, migrations, tests, docs or
  `CHANGELOG.md`. No institution or program names, subdomains, tenant/user/patient UUIDs, user
  emails or patient names. Describe them generically ("a second institution", "a program code") and
  look real records up at runtime instead of hard-coding them.
- Component size limit is **350 lines**; extract sub-components past that.
- Tech-debt removal is treated as a first-class task: delete unused code when you find it, and note
  significant cleanup in `CHANGELOG.md`.
- Primary action buttons (Submit, Save, Add, …) use the hacCare teal:
  `bg-haccare-teal hover:bg-haccare-teal-dark text-white` (colours in the `@theme` block of
  `src/index.css` — Tailwind v4 ignores `tailwind.config.js`). Don't
  put white text on `haccare-mint` (#3fbf9a) — it fails WCAG AA contrast; mint is for focus rings,
  accents and tinted backgrounds. Older screens still have blue submit buttons; switch them to teal
  when you touch them.
- Color semantics are consistent across the UI: blue = navigation/info, green = active
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
