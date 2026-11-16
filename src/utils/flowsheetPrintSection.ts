/**
 * "Flowsheet Assessments" section of the printed patient record: every entry
 * from patient_system_assessments, grouped by form in hub order, newest first.
 */

import { FLOWSHEET_REGISTRY } from '../features/flowsheets/registry';
import { assessmentEntries, flowsheetTitle } from '../features/flowsheets/assessmentFormat';
import type { SystemAssessmentRow } from '../features/flowsheets/types';
import { escapeHtml as e } from './sanitization';

const HUB_ORDER = FLOWSHEET_REGISTRY.flatMap(sheet => (sheet.linkType === 'native' ? [sheet.systemType] : []));

function hubIndex(systemType: string): number {
  const i = HUB_ORDER.indexOf(systemType);
  return i === -1 ? HUB_ORDER.length : i;
}

function renderEntry(row: SystemAssessmentRow, first: boolean): string {
  const fields = assessmentEntries(row.assessment_data)
    .map(({ label, value }) => {
      const wide = value.length > 60 ? 'grid-column:span 2;' : '';
      return `<div style="${wide}"><span style="font-weight:600;color:#475569;">${e(label)}:</span> <span style="white-space:pre-wrap;">${e(value)}</span></div>`;
    })
    .join('');

  const inError = row.entered_in_error_at
    ? `<div style="margin-bottom:6px;font-size:12px;font-weight:bold;color:#b91c1c;">ENTERED IN ERROR — ${e(row.entered_in_error_by)}, ${e(new Date(row.entered_in_error_at).toLocaleString())}: ${e(row.entered_in_error_reason)}</div>`
    : '';
  const strike = row.entered_in_error_at ? 'text-decoration:line-through;color:#6b7280;' : '';

  return `
    ${first ? '' : '<hr style="margin:12px 0;border:none;border-top:1px solid #e5e7eb;">'}
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:#64748b;">
      <span><strong>${e(row.nurse_name || 'Unknown')}</strong>${row.is_baseline ? ' • Baseline (set by instructor)' : ''}</span>
      <span>${e(new Date(row.recorded_at).toLocaleString())}</span>
    </div>
    ${inError}
    ${fields
      ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px 12px;${strike}">${fields}</div>`
      : '<div style="font-style:italic;">No details recorded</div>'}`;
}

export function renderFlowsheetSection(rows: SystemAssessmentRow[] | null): string {
  const groups = new Map<string, SystemAssessmentRow[]>();
  for (const row of rows ?? []) {
    const list = groups.get(row.system_type) ?? [];
    list.push(row);
    groups.set(row.system_type, list);
  }

  const body = rows === null
    ? '<p style="text-align:center;font-weight:bold;color:#dc2626;margin:20px 0;">Flowsheet assessments could not be loaded — reprint to include them</p>'
    : groups.size === 0
    ? '<p style="text-align:center;font-style:italic;margin:20px 0;">No flowsheet assessments recorded</p>'
    : [...groups.entries()]
        .sort(([a], [b]) => hubIndex(a) - hubIndex(b))
        .map(([systemType, entries]) => `
          <div class="note-entry" style="background:#f0f9ff;border-color:#0ea5e9;">
            <div class="note-header" style="color:#0369a1;">🗂️ ${e(flowsheetTitle(systemType))} (${entries.length} on file)</div>
            <div class="note-content">${entries.map((row, i) => renderEntry(row, i === 0)).join('')}</div>
          </div>`)
        .join('');

  return `
    <div class="form-section">
      <div class="section-header">Flowsheet Assessments</div>
      <div class="section-content"><div class="notes-section">${body}</div></div>
    </div>`;
}
