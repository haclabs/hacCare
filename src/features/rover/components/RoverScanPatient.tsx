import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, BedDouble, ChevronRight, DoorOpen, Loader2, ScanLine } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { useMultiTenantPatients } from '../../patients/hooks/useMultiTenantPatients';
import { secureLogger } from '../../../lib/security/secureLogger';
import { ROVER_PATH } from '../roverMode';
import { findPatientByWristband } from '../findPatientByWristband';
import { useRoverScan } from '../hooks/useRoverScan';

/** In a simulation: scan a wristband (or tap a patient) to open that patient's MAR. */
export const RoverScanPatient: React.FC = () => {
  const navigate = useNavigate();
  const { exitSimulationTenant } = useTenant();
  const { patients = [], isLoading } = useMultiTenantPatients();
  const [scanError, setScanError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useRoverScan((barcode) => {
    const patient = findPatientByWristband(barcode, patients);
    if (patient) {
      setScanError(null);
      navigate(`${ROVER_PATH}/patient/${patient.id}`);
    } else {
      setScanError(`Wristband "${barcode}" doesn't match a patient in this simulation.`);
    }
  });

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await exitSimulationTenant();
    } catch (err) {
      secureLogger.error('Rover: failed to leave simulation', err);
    }
    window.location.assign(ROVER_PATH);
  };

  const sortedPatients = [...patients].sort((a, b) =>
    `${a.room_number}${a.bed_number}`.localeCompare(`${b.room_number}${b.bed_number}`, undefined, { numeric: true })
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="rounded-2xl border-2 border-dashed border-haccare-teal bg-white dark:bg-gray-800 p-8 text-center shadow-sm">
        <ScanLine className="mx-auto h-16 w-16 text-haccare-teal animate-pulse" />
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Scan patient wristband</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Point the scanner at the patient's wristband to open their MAR.
        </p>
      </div>

      {scanError && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {scanError}
        </div>
      )}

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Or select a patient
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-haccare-teal" />
        </div>
      ) : sortedPatients.length === 0 ? (
        <p className="rounded-lg bg-white dark:bg-gray-800 p-6 text-center text-gray-600 dark:text-gray-300">
          No patients in this simulation yet.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-md">
          {sortedPatients.map((patient) => (
            <li key={patient.id}>
              <button
                onClick={() => navigate(`${ROVER_PATH}/patient/${patient.id}`)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span className="flex h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  <BedDouble className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    {patient.room_number}
                    {patient.bed_number}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold text-gray-900 dark:text-white">
                    {patient.last_name}, {patient.first_name}
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">{patient.patient_id}</span>
                </span>
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleLeave}
        disabled={leaving}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-4 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
      >
        <DoorOpen className="h-5 w-5" />
        Leave simulation
      </button>
    </div>
  );
};
