/**
 * Small shared controls for native flowsheet forms: chip pickers, labelled
 * text fields and the student-name + save footer every form ends with.
 */

import { AlertCircle, Loader2 } from 'lucide-react';

export type ChipTone = 'neutral' | 'good' | 'warn' | 'bad';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  tone?: ChipTone;
}

const SELECTED_TONE: Record<ChipTone, string> = {
  neutral: 'bg-blue-50 border-blue-400 text-blue-700',
  good: 'bg-green-50 border-green-400 text-green-700',
  warn: 'bg-amber-50 border-amber-400 text-amber-700',
  bad: 'bg-red-50 border-red-400 text-red-700',
};

const UNSELECTED = 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-haccare-teal focus:ring-1 focus:ring-haccare-mint outline-none';

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

interface ChipSelectProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T | '';
  onChange: (value: T | '') => void;
  required?: boolean;
}

/** Single-choice chips; clicking the selected chip clears it. */
export function ChipSelect<T extends string>({ label, options, value, onChange, required }: ChipSelectProps<T>) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(value === opt.value ? '' : opt.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              value === opt.value ? SELECTED_TONE[opt.tone ?? 'neutral'] : UNSELECTED
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ChipMultiSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
}

export function ChipMultiSelect({ label, options, value, onChange, hint }: ChipMultiSelectProps) {
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter(v => v !== item) : [...value, item]);
  return (
    <div>
      <FieldLabel label={label} />
      {hint && <p className="text-xs text-gray-500 -mt-1 mb-2">{hint}</p>}
      <div className="flex gap-2 flex-wrap">
        {options.map(item => (
          <button
            key={item}
            type="button"
            aria-pressed={value.includes(item)}
            onClick={() => toggle(item)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              value.includes(item) ? SELECTED_TONE.neutral : UNSELECTED
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Renders a textarea with this many rows instead of a single-line input. */
  rows?: number;
}

export function TextField({ label, value, onChange, placeholder, required, rows }: TextFieldProps) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
          placeholder={placeholder} className={`${inputClass} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={inputClass} />
      )}
    </div>
  );
}

interface StudentSaveFooterProps {
  studentName: string;
  onStudentNameChange: (value: string) => void;
  attestation: string;
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
}

export function StudentSaveFooter({
  studentName, onStudentNameChange, attestation, error, isSaving, onCancel,
}: StudentSaveFooterProps) {
  return (
    <>
      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Student Name <span className="text-red-500 ml-1">*</span>
        </label>
        <input type="text" value={studentName} onChange={e => onStudentNameChange(e.target.value)}
          placeholder="e.g. Jane Smith" autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none" />
        <p className="text-xs text-gray-500">{attestation}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {error && (
            <div role="alert" className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={onCancel} disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-haccare-teal hover:bg-haccare-teal-dark text-sm font-medium text-white disabled:opacity-60 transition-colors">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </div>
    </>
  );
}
