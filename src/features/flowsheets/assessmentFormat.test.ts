import { describe, expect, it } from 'vitest';
import { assessmentEntries, flowsheetTitle } from './assessmentFormat';
import { renderFlowsheetSection } from '../../utils/flowsheetPrintSection';
import type { SystemAssessmentRow } from './types';

describe('assessmentEntries', () => {
  it('formats BPMH medication rows instead of [object Object]', () => {
    const [meds] = assessmentEntries({
      medications: [
        { genericName: 'Metoprolol', dosage: '25', unit: 'mg', brandName: '' },
        { genericName: 'Ramipril', dosage: '5', unit: 'mg' },
      ],
    });
    expect(meds.label).toBe('Medications');
    expect(meds.value).toBe('Generic Name: Metoprolol, Dosage: 25, Unit: mg; Generic Name: Ramipril, Dosage: 5, Unit: mg');
  });

  it('labels camelCase keys, renders booleans and lists, and skips blanks', () => {
    expect(assessmentEntries({ admittingDiagnosis: 'CHF', isolation: false, quality: ['Sharp', 'Dull'], notes: ' ', score: 0 }))
      .toEqual([
        { key: 'admittingDiagnosis', label: 'Admitting Diagnosis', value: 'CHF' },
        { key: 'isolation', label: 'Isolation', value: 'No' },
        { key: 'quality', label: 'Quality', value: 'Sharp, Dull' },
        { key: 'score', label: 'Score', value: '0' },
      ]);
  });
});

describe('flowsheetTitle', () => {
  it('uses the card title when the stored type differs from the card id', () => {
    expect(flowsheetTitle('bowel-assessment')).toBe('Bowel Assessment');
    expect(flowsheetTitle('cognitive')).toBe('Cognitive Screening');
  });
});

describe('renderFlowsheetSection', () => {
  const row = (system_type: string, data: Record<string, unknown>): SystemAssessmentRow => ({
    id: system_type, patient_id: 'p', tenant_id: 't', system_type, assessment_data: data,
    nurse_id: null, nurse_name: '<b>Sam</b>', is_baseline: false,
    recorded_at: '2026-11-16T01:00:00Z', created_at: '2026-11-16T01:00:00Z',
  });

  it('groups entries by form in hub order and escapes student input', () => {
    const html = renderFlowsheetSection([row('bowel-assessment', { notes: '<script>' }), row('pain', { score: 4 })]);
    expect(html.indexOf('Pain')).toBeLessThan(html.indexOf('Bowel Assessment'));
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Sam</b>');
  });

  it('says so when the entries could not be loaded', () => {
    expect(renderFlowsheetSection(null)).toContain('could not be loaded');
  });

  it('keeps an entry marked in error, struck through, with who and why', () => {
    const html = renderFlowsheetSection([{
      ...row('pain', { score: 4 }),
      entered_in_error_at: '2026-11-16T02:00:00Z', entered_in_error_by: 'Sam Lee', entered_in_error_reason: 'Wrong patient',
    }]);
    expect(html).toContain('ENTERED IN ERROR — Sam Lee');
    expect(html).toContain('Wrong patient');
    expect(html).toContain('text-decoration:line-through');
    expect(html).toContain('Score');
  });
});
