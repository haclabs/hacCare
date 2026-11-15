import { describe, expect, it } from 'vitest';
import { FLOWSHEET_REGISTRY } from './registry';
import { FORM_COMPONENTS } from './formRegistry';

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
});
