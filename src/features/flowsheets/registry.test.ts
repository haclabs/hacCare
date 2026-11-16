import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLOWSHEET_REGISTRY } from './registry';
import { FORM_COMPONENTS } from './formRegistry';

const here = dirname(fileURLToPath(import.meta.url));

describe('flowsheet registry', () => {
  it('has a form component for every active native card', () => {
    const missing = FLOWSHEET_REGISTRY
      .filter(sheet => sheet.linkType === 'native' && sheet.status === 'active')
      .map(sheet => sheet.id)
      .filter(id => !FORM_COMPONENTS[id]);
    expect(missing).toEqual([]);
  });

  it('gives every native card a distinct system type', () => {
    const types = FLOWSHEET_REGISTRY.flatMap(sheet => (sheet.linkType === 'native' ? [sheet.systemType] : []));
    expect(new Set(types).size).toBe(types.length);
  });

  // The debrief only picks up rows with a nurse_name and is_baseline = false,
  // and the history strip looks rows up by system_type.
  it('wires every form to its card system type, the student name and the baseline flag', () => {
    const registrySource = readFileSync(join(here, 'formRegistry.ts'), 'utf8');
    const problems: string[] = [];
    for (const sheet of FLOWSHEET_REGISTRY) {
      if (sheet.linkType !== 'native' || sheet.status !== 'active') continue;
      const file = new RegExp(`'${sheet.id}':\\s*React\\.lazy\\(\\(\\) =>\\s*import\\('\\./forms/(\\w+)'\\)`).exec(registrySource)?.[1];
      if (!file) { problems.push(`${sheet.id}: no form file`); continue; }
      const form = readFileSync(join(here, 'forms', `${file}.tsx`), 'utf8');
      const systemType = /const SYSTEM_TYPE = '([^']+)'/.exec(form)?.[1];
      if (systemType !== sheet.systemType) problems.push(`${file}: saves '${systemType}', card expects '${sheet.systemType}'`);
      if (!/nurse_name:\s*studentName\.trim\(\)/.test(form)) problems.push(`${file}: does not save the student name`);
      if (!/is_baseline:\s*isBaseline/.test(form)) problems.push(`${file}: does not save the baseline flag`);
    }
    expect(problems).toEqual([]);
  });
});
