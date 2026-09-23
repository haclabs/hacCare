/**
 * Guards the simulation reset wiring described in CLAUDE.md.
 *
 * Adding a clinical table requires a `DELETE FROM <table> WHERE tenant_id = ...`
 * in BOTH reset_simulation_for_next_session AND
 * reset_simulation_with_template_updates. Miss one and rows accumulate across
 * resets -- the next cohort inherits the previous cohort's charting. Nothing
 * errors; the data is simply wrong, and only on one of the two reset paths,
 * which look identical to an instructor.
 *
 * That is exactly what happened with patient_intake_output_events: present in
 * the first function, absent from the second, for 30 tables' worth of drift
 * before anyone noticed. Fixed in
 * supabase/migrations/20260922000000_fix_intake_output_not_cleared_on_template_reset.sql.
 *
 * This reads SQL rather than talking to a database, so it runs in CI with no
 * Postgres. The source of truth is the effective definition: the LAST
 * `CREATE OR REPLACE FUNCTION` across the schema baseline followed by
 * database/migrations/ in timestamp order -- the same order Postgres saw.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = 'supabase/migrations';
const ACTIVITY_SERVICE = 'src/services/simulation/studentActivityService.ts';

const RESET_FUNCTIONS = [
  'reset_simulation_for_next_session',
  'reset_simulation_with_template_updates',
] as const;

/**
 * Every .sql that can redefine a function, oldest first.
 *
 * Only `supabase/migrations/` counts. Its baseline
 * (20251113000000_initial_schema.sql) is a `supabase db dump` of production, so
 * it already contains the cumulative effect of everything in
 * `database/migrations/` -- those are a record of changes applied by hand, not a
 * queue, and reading them here would resurrect superseded definitions.
 * Filenames are timestamp-prefixed, so lexical order is apply order.
 */
function sqlSourcesInApplyOrder(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(join(MIGRATIONS, name), 'utf-8'));
}

/**
 * The last definition of `name` across all sources -- what Postgres actually
 * runs. Matches both pg_dump's quoted form and hand-written SQL.
 */
function effectiveFunctionBody(name: string): string {
  // No \b after the quoted form: the next character is `(`, and two non-word
  // characters give no word boundary, so `"name"\b` never matches pg_dump output.
  const pattern = new RegExp(
    String.raw`CREATE OR REPLACE FUNCTION\s+(?:"public"|public)\s*\.\s*(?:"${name}"|${name}\b)[\s\S]*?\$\$;`,
    'g',
  );
  let body = '';
  for (const source of sqlSourcesInApplyOrder()) {
    const matches = source.match(pattern);
    if (matches?.length) body = matches[matches.length - 1];
  }
  return body;
}

function deleteTargets(body: string): Set<string> {
  const targets = new Set<string>();
  for (const [, table] of body.matchAll(
    /DELETE\s+FROM\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi,
  )) {
    targets.add(table.toLowerCase());
  }
  return targets;
}

describe('simulation reset wiring', () => {
  it('finds both reset functions', () => {
    for (const name of RESET_FUNCTIONS) {
      expect(effectiveFunctionBody(name), `${name} not found in any .sql`).not.toBe('');
    }
  });

  it('clears the same tables on both reset paths', () => {
    const [nextSession, templateUpdates] = RESET_FUNCTIONS.map((name) =>
      deleteTargets(effectiveFunctionBody(name)),
    );

    const missingFromTemplateUpdates = [...nextSession].filter((t) => !templateUpdates.has(t)).sort();
    const missingFromNextSession = [...templateUpdates].filter((t) => !nextSession.has(t)).sort();

    // Asserted as a pair so a failure names both directions at once.
    expect({
      clearedOnPlainResetButNotTemplateReset: missingFromTemplateUpdates,
      clearedOnTemplateResetButNotPlainReset: missingFromNextSession,
    }).toEqual({
      clearedOnPlainResetButNotTemplateReset: [],
      clearedOnTemplateResetButNotPlainReset: [],
    });
  });

  it('clears everything the debrief reads back', () => {
    // If the debrief queries a table that reset does not clear, the next
    // cohort's debrief silently includes the previous cohort's work.
    const service = readFileSync(ACTIVITY_SERVICE, 'utf-8');
    const queried = new Set(
      [...service.matchAll(/\.from\('([a-z_]+)'\)/g)].map((m) => m[1]),
    );

    const cleared = deleteTargets(effectiveFunctionBody(RESET_FUNCTIONS[0]));

    /**
     * Tables the debrief reads that reset deliberately does not DELETE.
     * Each needs a reason -- do not add to this list to silence a failure.
     */
    const exempt: Record<string, string> = {
      patients: 'never deleted on reset -- barcodes are printed and reused for a semester',
      simulation_active: 'the simulation row itself, not charting',
      simulation_history: 'the audit trail reset writes to',
      lab_ack_events:
        'cleared by cascade, not an explicit DELETE: panel_id is NOT NULL with ' +
        'ON DELETE CASCADE to lab_panels, which reset does delete',
    };

    const unexplained = [...queried].filter((t) => !cleared.has(t) && !(t in exempt)).sort();
    expect(unexplained).toEqual([]);
  });

  it('keeps the migration that fixed the intake/output divergence', () => {
    // Regression pin: the baseline still carries the broken definition, so the
    // fix only holds while this migration is applied after it.
    const fix = join(
      MIGRATIONS,
      '20260922000000_fix_intake_output_not_cleared_on_template_reset.sql',
    );
    // Must live in supabase/migrations/: `supabase db push` reads only that
    // directory, so the same file under database/migrations/ would never deploy.
    expect(existsSync(fix), `${fix} is missing -- the intake/output fix regressed`).toBe(true);

    const body = effectiveFunctionBody('reset_simulation_with_template_updates');
    expect(deleteTargets(body).has('patient_intake_output_events')).toBe(true);
  });
});
