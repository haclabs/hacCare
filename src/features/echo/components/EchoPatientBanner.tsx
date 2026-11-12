import React from 'react';
import { AlertTriangle, ArrowLeft, ScanLine } from 'lucide-react';
import type { Patient } from '../../../types';

/**
 * Solid patient bar, pinned while scrolling. Allergies sit directly under the name (as on
 * hospital handhelds) so they are in view whenever the name is.
 */
export const EchoPatientBanner: React.FC<{ patient: Patient; onBack: () => void }> = ({ patient, onBack }) => {
  const allergies = (patient.allergies ?? []).filter(Boolean);

  return (
    <div className="sticky top-0 z-30 bg-blue-800 dark:bg-blue-950 px-3 py-3 text-white shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Next patient"
          className="flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-3 py-3 font-semibold hover:bg-white/25"
        >
          <ArrowLeft className="h-5 w-5" />
          <ScanLine className="h-5 w-5" />
          <span className="hidden sm:inline">Next patient</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold leading-tight">
            {patient.last_name}, {patient.first_name}
          </p>
          <span
            className={`mt-1 inline-flex max-w-full items-center gap-1 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
              allergies.length ? 'bg-red-600 text-white' : 'bg-white/15 text-blue-100'
            }`}
          >
            {allergies.length > 0 && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{allergies.length ? allergies.join(', ') : 'No known allergies'}</span>
          </span>
        </div>
        <div className="hidden shrink-0 text-right text-sm text-blue-100 sm:block">
          <p className="font-semibold text-white">
            Room {patient.room_number}
            {patient.bed_number}
          </p>
          <p>{patient.patient_id}</p>
          <p>DOB {patient.date_of_birth}</p>
        </div>
      </div>
      {/* Phones: identifiers move under the name row */}
      <p className="mt-2 truncate text-sm text-blue-100 sm:hidden">
        Room {patient.room_number}
        {patient.bed_number} · {patient.patient_id} · DOB {patient.date_of_birth}
      </p>
    </div>
  );
};
