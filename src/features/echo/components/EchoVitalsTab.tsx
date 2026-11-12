import React, { useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import type { VitalSigns } from '../../patients/types/patient';
import { EchoVitalsGlance } from './EchoVitalsGlance';
import { EchoVitalsSheet } from './EchoVitalsSheet';

const HISTORY_LIMIT = 10;

const formatWhen = (iso?: string) =>
  iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const Reading: React.FC<{ v: VitalSigns }> = ({ v }) => {
  const parts = [
    v.temperature != null && `T ${v.temperature}°`,
    v.heartRate != null && `P ${v.heartRate}`,
    v.bloodPressure && `BP ${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}`,
    v.respiratoryRate != null && `R ${v.respiratoryRate}`,
    v.oxygenSaturation != null && `SpO₂ ${v.oxygenSaturation}%`,
  ].filter(Boolean) as string[];
  const onOxygen = v.oxygenDelivery && v.oxygenDelivery !== 'Room Air';

  return (
    <li className="px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{formatWhen(v.recorded_at ?? v.lastUpdated)}</p>
      <p className="mt-0.5 flex flex-wrap gap-x-3 font-medium tabular-nums text-gray-800 dark:text-gray-100">
        {parts.map((p) => <span key={p}>{p}</span>)}
      </p>
      {onOxygen && (
        <p className="text-sm text-cyan-700 dark:text-cyan-300">
          {v.oxygenDelivery}
          {v.oxygenFlowRate && v.oxygenFlowRate !== 'N/A' ? ` · ${v.oxygenFlowRate}` : ''}
        </p>
      )}
    </li>
  );
};

/** Phone layout for vitals: latest glance, a big Record button and recent readings. */
export const EchoVitalsTab: React.FC<{
  patientId: string;
  patientName: string;
  dateOfBirth?: string;
  vitals: VitalSigns[];
  onSaved: () => void;
}> = ({ patientId, patientName, dateOfBirth, vitals, onSaved }) => {
  const [recording, setRecording] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  return (
    <div className="pb-4">
      <div className="px-4 pt-4">
        <button
          onClick={() => setRecording(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-haccare-teal py-4 text-lg font-semibold text-white shadow-md hover:bg-haccare-teal-dark"
        >
          <Plus className="h-6 w-6" />
          Record vitals
        </button>
        {savedAt && (
          <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            Vitals saved at {savedAt}
          </p>
        )}
      </div>

      {vitals.length === 0 ? (
        <p className="mx-4 mt-4 rounded-2xl bg-white dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400 shadow-sm">
          No vitals recorded yet.
        </p>
      ) : (
        <>
          <EchoVitalsGlance vitals={vitals} dateOfBirth={dateOfBirth} />
          <section className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md">
            <h2 className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">History</h2>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {vitals.slice(0, HISTORY_LIMIT).map((v, i) => (
                <Reading key={v.id ?? i} v={v} />
              ))}
            </ul>
          </section>
        </>
      )}

      {recording && (
        <EchoVitalsSheet
          patientId={patientId}
          patientName={patientName}
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            onSaved();
          }}
        />
      )}
    </div>
  );
};
