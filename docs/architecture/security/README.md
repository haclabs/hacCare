# Security Architecture

> Rewritten 2026-09-22. This replaces three earlier documents
> (`SECURITY_HARDENING_RISK_ANALYSIS.md`, `docs/operations/SECURITY_HARDENING.md`
> and an index pointing at files that no longer existed). Those predated the
> 2026-09-21 tenant-access hardening and described a schema that has since
> changed. Git history has them if you need the archaeology.

## Where authorization lives

In Postgres, not in the client. There is no application server: the browser
talks to Supabase directly with an anon key that **ships in the bundle**. Row
Level Security is therefore the only barrier, and any table reachable from the
API is protected by its policies alone.

Two consequences worth internalising:

- A policy that admits "any authenticated user" admits anyone who can read the
  JavaScript bundle and sign up.
- Supabase's default grants give `anon` and `authenticated` full rights on
  every table in `public`. Creating a table without policies leaves it open.

## Tenant isolation

Every table carries `tenant_id`, and clinical policies resolve membership
through `tenant_users`. Membership is granted by `ensure_tenant_access()`, a
`SECURITY DEFINER` RPC gated on `user_may_join_tenant()`, which encodes who is
genuinely entitled to a tenant:

| Tenant type | Who may join |
|---|---|
| Any | existing active members; `super_admin` and `coordinator` |
| `simulation_active` | its launcher, assigned participants, and instructors/admins whose programs match the simulation's categories |
| `simulation_template`, patient-library template | its creator, and instructors/admins whose programs match |
| `institution`, `program` | nobody self-joins — provisioned by admins or `create_program_tenant()` |

Note the deliberate divergence: `templates_select` ends with
`OR status = 'ready'`, so any authenticated user can *see* a ready template.
Visibility must not confer join rights, so `user_may_join_tenant()` omits that
clause. Reusing the SELECT policy verbatim would reopen the hole.

## The 2026-09-21 hardening

`tenant_users` previously carried `USING (auth.uid() IS NOT NULL)` for both
SELECT and INSERT. Any authenticated account — including a simulation student —
could enumerate every tenant and enrol itself into one, which every clinical
policy then honoured. Migrations `20260921000000`–`20260921000003` replaced
those with entitlement-scoped policies, removed the forgeable
`auth.jwt() user_metadata` fallback from `current_user_is_super_admin()`, and
scoped the user directory and handover notes, both of which had been readable
platform-wide.

Deployed to production 2026-09-22.

## `user_tenant_cache` — a standing trap

**Materialized views do not enforce RLS.** `user_tenant_cache` mirrors
`tenant_users`, so RLS on that table confers nothing on the view. What protects
it is the grant, and only the grant: it is granted to `service_role` only.

Granting `SELECT` on it to `authenticated` would hand every logged-in user the
complete user-to-tenant mapping and silently undo the enumeration fix. An
earlier version of this document claimed RLS protected it; that was wrong.

## Verifying

```bash
docker cp supabase/tests/verify_rls_isolation.sql supabase_db_hacCare:/tmp/v.sql
docker exec -i supabase_db_hacCare psql -U postgres -d postgres -f /tmp/v.sql
```

`verify_rls_isolation.sql` impersonates a student and asserts what they cannot
see. It is read-only and always rolls back, so it is safe against a remote
database too (paste it into the Supabase SQL editor). Its first six assertions
need a user with role `student`; without one it prints `SKIP` and only the two
schema-level assertions run.

A green result is only meaningful if it can go red — reinstate a permissive
policy inside a transaction and confirm the suite fails before trusting it.

## Rolling back

`supabase/rollback/20260921_rollback_tenant_access_hardening.sql`, **not** a
backup restore. Backups are daily with PITR disabled, so the only restore
target discards a day of charting. The hardening touches only functions and
policies and rewrites no data, so a targeted revert is faster and lossless.

## Key files

| What | Where |
|---|---|
| Entitlement functions | `supabase/migrations/20260921000000_add_tenant_access_functions.sql` |
| Policy replacement | `supabase/migrations/20260921000002_drop_permissive_tenant_policies.sql` |
| Directory + handover scoping | `supabase/migrations/20260921000003_restrict_directory_and_handover_reads.sql` |
| Isolation test | `supabase/tests/verify_rls_isolation.sql` |
| Rollback | `supabase/rollback/20260921_rollback_tenant_access_hardening.sql` |
| Client entry points | `src/contexts/TenantContext.tsx`, `src/features/simulation/hooks/useActiveSimulations.ts` |
