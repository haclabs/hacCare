# Supabase Development Setup

This directory holds the Supabase CLI configuration, the local-stack baseline and
the Edge Functions for hacCare.

## Where migrations actually live

There are two migration directories, and they are **not** interchangeable:

- **`database/migrations/`** — the working location. New schema changes go here.
  See `CLAUDE.md`.
- **`supabase/migrations/`** — only what the Supabase CLI needs to build a local
  stack from nothing: a squashed baseline plus anything not yet folded into it.

```
supabase/
├── config.toml   # Supabase CLI configuration
├── migrations/   # Baseline + pending migrations, for `supabase start`
├── functions/    # Edge Functions
├── tests/        # SQL assertions run against a local or dev database
├── seed.sql      # Local-only fixture data
├── schema.sql    # Reference pg_dump of the live database (not applied)
└── .gitignore
```

## Linked project

```bash
npx supabase projects list   # shows which project is linked
```

Currently linked to **hacCare Canada** (`ydmbinljlpzcbleupjaa`), region
`ca-central-1` — this is production. There is also a **hacCare Dev** project
(`zzjmpkzkmqimexojvibu`).

> `supabase db push` writes to whatever is linked. Confirm the link before
> pushing.

## Common Commands

### Type Generation
```bash
npm run supabase:types
```

### Migrations
```bash
npx supabase migration new <name>     # create
npx supabase migration list           # local vs remote history
npx supabase db push                  # apply pending to the LINKED project
npx supabase db pull                  # pull remote schema (requires Docker)
```

### Local Development (requires Docker)
```bash
npx supabase start    # start the stack
npx supabase stop     # stop it
npx supabase db reset # recreate: baseline -> migrations -> seed.sql
```

Studio: <http://localhost:54323> · API: <http://127.0.0.1:54321> ·
DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Copy the URL and anon key from `npx supabase status` into `.env`. The anon key
is fixed per CLI version — read it from `status` rather than pasting one from
elsewhere.

On WSL this needs a running Docker daemon, which in turn needs systemd
(`[boot] systemd=true` in `/etc/wsl.conf`, then `wsl --shutdown` and reopen).

## Baseline Migration

`migrations/20251113000000_initial_schema.sql` is a `supabase db dump --schema public`
of the live database. The two migrations dated after it are no-op stubs: their
changes are already inside the baseline, and they exist only so local and remote
migration history line up.

**Refreshing the baseline** — when the local stack fails with `relation "…" does
not exist`, the baseline has drifted behind production:

```bash
npx supabase db dump --linked --schema public -f supabase/migrations/20251113000000_initial_schema.sql
npx supabase db reset
```

Rewriting the baseline's contents has no remote effect: the remote history
already records that version as applied, so it is never re-run there.

## Seed data

`seed.sql` builds a small two-institution fixture — a program, a template, a
launched simulation, an instructor, a student and two patients — sized to
exercise every branch of `user_may_join_tenant()`. It is local-only; never put
production data in it.

It opens with a plain `REFRESH MATERIALIZED VIEW public.user_tenant_cache`.
`pg_dump` emits materialized views `WITH NO DATA`, and the statement-level
trigger on `tenant_users` calls `REFRESH … CONCURRENTLY`, which Postgres rejects
on a view that was never populated. Removing that line breaks `db reset`.

## Tests

```bash
docker cp supabase/tests/verify_rls_isolation.sql supabase_db_hacCare:/tmp/v.sql
docker exec -i supabase_db_hacCare psql -U postgres -d postgres -f /tmp/v.sql
```

`verify_rls_isolation.sql` impersonates a seeded student and asserts what they
cannot see. It is read-only and always rolls back, so it is also safe to run
against a remote database. Its first six assertions need a user with role
`student`; on a database without one it prints `SKIP` and only the two
schema-level assertions run.

## Troubleshooting

### Docker not available
Without Docker you can still create and push migrations, generate types and view
migration history — but you cannot run the local stack or test migrations before
pushing.

### `CONCURRENTLY cannot be used when the materialized view is not populated`
The `REFRESH MATERIALIZED VIEW` line at the top of `seed.sql` is missing or was
reordered below the first `tenant_users` insert.

### `relation "<table>" does not exist` while applying a migration
The baseline predates that table. Refresh it — see **Baseline Migration**.
