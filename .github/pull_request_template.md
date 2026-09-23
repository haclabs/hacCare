## What and why

<!-- What changes, and what problem it solves. Prose is fine — delete the sections below that don't apply. -->

## Risk checks

Only tick what's relevant; delete the rest.

- [ ] **Tenant scoping** — every Supabase query filters by `tenant_id` explicitly. Omitting it is the most common source of bugs here, and RLS will not save you because components pass the tenant through directly.
- [ ] **Migration** — new `.sql` is in `supabase/migrations/`, not `database/migrations/history/`. Only the former is read by `supabase db push`; a migration in the wrong place silently never deploys.
- [ ] **New `patient_*` table** — all four wirings done: `DELETE` in *both* reset functions, a `simulation_table_config` row, a query in `studentActivityService.ts`, and a section in `EnhancedDebriefModal.tsx`. Miss one and rows accumulate across resets or vanish from debriefs.
- [ ] **Template ↔ simulation matching** — matched on immutable properties, never UUID or barcode. Launch regenerates both, and a barcode match returns NULL and skips records silently rather than erroring.
- [ ] **Secrets** — no keys, tokens or connection strings in the diff, including in docs and comments.

## Testing

<!-- What you actually ran or clicked. "Verified in a simulation as an instructor and a student" beats a ticked box. -->

## Deployment

- [ ] Needs `supabase db push` after merge
- [ ] Needs an Edge Function redeploy (`supabase functions deploy <name>`)
- [ ] Environment variable or Supabase secret added/changed
- [ ] Nothing special
