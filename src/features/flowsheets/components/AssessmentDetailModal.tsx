/**
 * AssessmentDetailModal
 *
 * Generic read-only viewer for a single patient_system_assessments row.
 * Shared across every native flowsheet form (opened from AssessmentHistoryStrip),
 * so it renders assessment_data generically rather than per-form layouts:
 *   - arrays of objects (e.g. BPMH's medication rows) → a list of field cards
 *   - arrays of primitives (e.g. selected history sources) → pill badges
 *   - booleans → Yes / No
 *   - empty/null/blank values are skipped entirely
 */

import React from 'react';
import { Clock, User, X } from 'lucide-react';

interface AssessmentDetailModalProps {
  title: string;
  recordedAt: string;
  nurseName: string | null;
  data: Record<string, unknown>;
  onClose: () => void;
}

// Local-only keys that should never surface even if they leak into older rows.
const SKIP_KEYS = new Set(['id']);

function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function renderPrimitive(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}

function renderEntries(data: Record<string, unknown>): React.ReactNode[] {
  return Object.entries(data)
    .filter(([key, value]) => !SKIP_KEYS.has(key) && !isEmptyValue(value))
    .map(([key, value]) => {
      const label = humanizeKey(key);

      // Array of objects — e.g. BPMH medication rows — render as field cards
      if (Array.isArray(value) && value.every(v => typeof v === 'object' && v !== null)) {
        return (
          <div key={key} className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500 mb-2">{label}</dt>
            <dd className="space-y-2">
              {(value as Record<string, unknown>[]).map((item, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  {Object.entries(item)
                    .filter(([k, v]) => !SKIP_KEYS.has(k) && !isEmptyValue(v))
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="block text-[11px] font-medium text-gray-500">{humanizeKey(k)}</span>
                        <span className="block text-sm text-gray-900">{renderPrimitive(v)}</span>
                      </div>
                    ))}
                </div>
              ))}
            </dd>
          </div>
        );
      }

      // Array of primitives — pill badges
      if (Array.isArray(value)) {
        return (
          <div key={key} className="sm:col-span-2">
            <dt className="text-xs font-medium text-gray-500 mb-1.5">{label}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {value.map((v, i) => (
                <span
                  key={i}
                  className="inline-block rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                >
                  {renderPrimitive(v)}
                </span>
              ))}
            </dd>
          </div>
        );
      }

      // Long free text gets its own full-width row
      if (typeof value === 'string' && value.length > 60) {
        return (
          <div key={key} className="sm:col-span-2">
            <DetailField label={label} value={<span className="whitespace-pre-wrap">{value}</span>} />
          </div>
        );
      }

      return <DetailField key={key} label={label} value={renderPrimitive(value)} />;
    });
}

export const AssessmentDetailModal: React.FC<AssessmentDetailModalProps> = ({
  title,
  recordedAt,
  nurseName,
  data,
  onClose,
}) => {
  const fields = renderEntries(data);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(recordedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {nurseName || 'Unknown'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {fields.length > 0 ? (
          <dl className="px-6 py-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {fields}
          </dl>
        ) : (
          <p className="px-6 py-8 text-sm text-gray-500 text-center">No details recorded for this entry.</p>
        )}
      </div>
    </div>
  );
};
