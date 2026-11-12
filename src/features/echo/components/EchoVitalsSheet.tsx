import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updatePatientVitals } from '../../../services/patient/patientService';
import { secureLogger } from '../../../lib/security/secureLogger';
import {
  EMPTY_VITALS_DRAFT,
  OXYGEN_DELIVERY_OPTIONS,
  OXYGEN_FLOW_OPTIONS,
  parseVitalsDraft,
  type VitalsDraft,
} from '../vitalsEntry';
import { EchoSheet } from './EchoSheet';

const inputClass =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-3 text-2xl font-semibold tabular-nums text-gray-900 placeholder:text-gray-300 dark:text-white dark:placeholder:text-gray-600 focus:border-haccare-mint focus:outline-none focus:ring-2 focus:ring-haccare-mint';

const NumberField: React.FC<{
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  placeholder?: string;
}> = ({ label, unit, value, onChange, decimal, placeholder }) => (
  <label className="block">
    <span className="mb-1 flex justify-between text-sm font-medium text-gray-600 dark:text-gray-300">
      {label}
      {unit && <span className="text-gray-400">{unit}</span>}
    </span>
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  </label>
);

/** Record a set of vitals from the bedside. Saves exactly as the desktop vitals form does. */
export const EchoVitalsSheet: React.FC<{
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ patientId, patientName, onClose, onSaved }) => {
  const [draft, setDraft] = useState<VitalsDraft>(EMPTY_VITALS_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof VitalsDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    const result = parseVitalsDraft(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePatientVitals(patientId, result.vitals, result.studentName);
      onSaved();
    } catch (err) {
      secureLogger.error('Echo: failed to save vitals', err);
      setError('Could not save vitals. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <EchoSheet
      title="Record vitals"
      subtitle={`${patientName} · enter what you measured`}
      onClose={onClose}
      footer={
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-haccare-teal py-4 text-lg font-semibold text-white hover:bg-haccare-teal-dark disabled:opacity-60"
        >
          {saving && <Loader2 className="h-5 w-5 animate-spin" />}
          Save vitals
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Temp" unit="°C" decimal value={draft.temperature} onChange={set('temperature')} placeholder="37.0" />
        <NumberField label="Pulse" unit="bpm" value={draft.heartRate} onChange={set('heartRate')} placeholder="80" />
        <div className="col-span-2">
          <span className="mb-1 flex justify-between text-sm font-medium text-gray-600 dark:text-gray-300">
            Blood pressure <span className="text-gray-400">mmHg</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Systolic"
              placeholder="120"
              value={draft.systolic}
              onChange={(e) => set('systolic')(e.target.value)}
              className={inputClass}
            />
            <span className="text-3xl text-gray-400">/</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Diastolic"
              placeholder="80"
              value={draft.diastolic}
              onChange={(e) => set('diastolic')(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <NumberField label="Resp" unit="/min" value={draft.respiratoryRate} onChange={set('respiratoryRate')} placeholder="16" />
        <NumberField label="SpO₂" unit="%" value={draft.oxygenSaturation} onChange={set('oxygenSaturation')} placeholder="98" />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">O₂ delivery</span>
          <select value={draft.oxygenDelivery} onChange={(e) => set('oxygenDelivery')(e.target.value)} className={`${inputClass} text-base`}>
            {OXYGEN_DELIVERY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">Flow rate</span>
          <select value={draft.oxygenFlowRate} onChange={(e) => set('oxygenFlowRate')(e.target.value)} className={`${inputClass} text-base`}>
            {OXYGEN_FLOW_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">Your name</span>
          <input
            type="text"
            autoComplete="name"
            value={draft.studentName}
            onChange={(e) => set('studentName')(e.target.value)}
            placeholder="Student name"
            className={`${inputClass} text-lg font-medium`}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </EchoSheet>
  );
};
