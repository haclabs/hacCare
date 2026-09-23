# Applied migrations — historical record

Every `.sql` here was **already applied to Supabase by hand**. Nothing reads this
directory and nothing re-runs it. It is kept for archaeology: finding when and
why a column, policy or function changed.

**Do not add files here, and do not run them.** Several are superseded by later
files, so replaying them would move the schema backwards.

## Where new migrations go

`supabase/migrations/` — the only directory `supabase db push` reads. A migration
placed anywhere else silently never deploys. That is not hypothetical: it is how
a reset-function bug survived until 2026-09-22, when
`reset_simulation_with_template_updates` was found not to clear
`patient_intake_output_events` while `reset_simulation_for_next_session` did.

## Why the current schema is not the sum of these files

`supabase/migrations/20251113000000_initial_schema.sql` is a
`supabase db dump --schema public` of production. It already contains the
cumulative effect of everything here, which is why these files can be archived
without losing the schema they built.
