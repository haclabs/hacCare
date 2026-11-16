/**
 * Plain-text formatting for patient_system_assessments.assessment_data, shared
 * by the debrief and the printed patient record so every flowsheet form reads
 * the same way everywhere, including BPMH's medication rows.
 */

import { FLOWSHEET_REGISTRY } from './registry';

const SKIP_KEYS = new Set(['id']);

export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function formatAssessmentValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const separator = value.some(v => typeof v === 'object' && v !== null) ? '; ' : ', ';
    return value.filter(v => !isEmptyValue(v)).map(formatAssessmentValue).join(separator);
  }
  if (typeof value === 'object' && value !== null) {
    return assessmentEntries(value as Record<string, unknown>)
      .map(({ label, value: v }) => `${label}: ${v}`)
      .join(', ');
  }
  return String(value);
}

export interface AssessmentEntry {
  key: string;
  label: string;
  value: string;
}

export function assessmentEntries(data: Record<string, unknown> | null | undefined): AssessmentEntry[] {
  if (!data) return [];
  return Object.entries(data)
    .filter(([key, value]) => !SKIP_KEYS.has(key) && !isEmptyValue(value))
    .map(([key, value]) => ({ key, label: humanizeKey(key), value: formatAssessmentValue(value) }))
    .filter(entry => entry.value !== '');
}

const TITLES = new Map(
  FLOWSHEET_REGISTRY.flatMap(sheet => (sheet.linkType === 'native' ? [[sheet.systemType, sheet.title] as const] : [])),
);

/** Display title for a stored system_type, e.g. 'bowel-assessment' → 'Bowel Assessment'. */
export function flowsheetTitle(systemType: string): string {
  return TITLES.get(systemType) ?? humanizeKey(systemType.replace(/-/g, ' '));
}
