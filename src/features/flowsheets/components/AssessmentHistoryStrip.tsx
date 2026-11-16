/**
 * AssessmentHistoryStrip
 *
 * Generic horizontal strip showing previous assessments recorded in this
 * simulation session. Drop this at the top of any native flowsheet form.
 *
 * Props:
 *   patientId / tenantId / systemType  — identify which records to fetch
 *   formatSummary                       — form-specific key metric extractor;
 *                                         returns { label, color } so each
 *                                         form controls severity colouring
 *
 * Usage (PainAssessmentForm reference implementation):
 *
 *   <AssessmentHistoryStrip
 *     patientId={patient.id}
 *     tenantId={tenantId}
 *     systemType={SYSTEM_TYPE}
 *     formatSummary={(data) => {
 *       if (!data.painPresent) return { label: 'No pain', color: 'green' };
 *       const nrs = (data.nrsScore as number) ?? 0;
 *       return {
 *         label: `NRS ${nrs}`,
 *         color: nrs >= 7 ? 'red' : nrs >= 4 ? 'amber' : 'green',
 *       };
 *     }}
 *   />
 *
 * Adding to a new form: copy the usage above, adjust formatSummary to surface
 * the most clinically meaningful metric for that system type.
 */

import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useMarkEnteredInError, useSystemAssessmentHistory } from '../hooks/useSystemAssessment';
import { AssessmentDetailModal } from './AssessmentDetailModal';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AssessmentSummaryColor = 'green' | 'amber' | 'red' | 'blue' | 'gray';

export interface AssessmentSummary {
  label: string;
  color: AssessmentSummaryColor;
}

interface AssessmentHistoryStripProps {
  patientId: string;
  tenantId: string;
  systemType: string;
  formatSummary: (data: Record<string, unknown>) => AssessmentSummary;
  /** Title shown in the detail modal header. Defaults to a humanized systemType. */
  title?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

const COLOR_CLASSES: Record<AssessmentSummaryColor, string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red:   'bg-red-100   text-red-800   border-red-200',
  blue:  'bg-blue-100  text-blue-800  border-blue-200',
  gray:  'bg-gray-100  text-gray-700  border-gray-200',
};

function defaultTitle(systemType: string): string {
  return systemType
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ── Component ──────────────────────────────────────────────────────────────────

export const AssessmentHistoryStrip: React.FC<AssessmentHistoryStripProps> = ({
  patientId,
  tenantId,
  systemType,
  formatSummary,
  title,
}) => {
  const { data: history, isLoading } = useSystemAssessmentHistory(patientId, tenantId, systemType);
  const { markEnteredInError } = useMarkEnteredInError(patientId, tenantId, systemType);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEntry = history?.find(entry => entry.id === selectedId) ?? null;

  // Nothing to show yet — render nothing rather than an empty container
  if (isLoading || !history?.length) return null;

  return (
    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <ClipboardList className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-600">
          {history.length === 1
            ? '1 previous assessment this session'
            : `${history.length} previous assessments this session`}
        </span>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {history.map((entry) => {
          const summary = formatSummary(entry.assessment_data as Record<string, unknown>);
          const inError = !!entry.entered_in_error_at;
          return (
            <button
              type="button"
              key={entry.id}
              onClick={() => setSelectedId(entry.id)}
              className={`flex-shrink-0 w-40 rounded-lg border px-3 py-2.5 space-y-1.5 text-left transition-colors ${
                inError ? 'border-red-200 bg-red-50 hover:bg-red-100' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              {/* Relative timestamp */}
              <p className="text-[11px] font-medium text-gray-400 leading-none">
                {relativeTime(entry.recorded_at)}
              </p>

              {/* Key metric badge */}
              {inError ? (
                <span className="inline-block rounded-full border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold leading-none text-red-700">
                  Entered in error
                </span>
              ) : (
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none ${COLOR_CLASSES[summary.color]}`}
                >
                  {summary.label}
                </span>
              )}

              {/* Student name */}
              <p className="text-[11px] text-gray-500 truncate leading-none">
                {entry.nurse_name ?? '—'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      {selectedEntry && (
        <AssessmentDetailModal
          title={title ?? defaultTitle(systemType)}
          recordedAt={selectedEntry.recorded_at}
          nurseName={selectedEntry.nurse_name}
          data={selectedEntry.assessment_data}
          enteredInErrorAt={selectedEntry.entered_in_error_at}
          enteredInErrorBy={selectedEntry.entered_in_error_by}
          enteredInErrorReason={selectedEntry.entered_in_error_reason}
          onMarkEnteredInError={
            selectedEntry.is_baseline
              ? undefined
              : (by, reason) => markEnteredInError({ id: selectedEntry.id, by, reason })
          }
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};
