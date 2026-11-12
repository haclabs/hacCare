import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Camera, DoorOpen, Loader2, ScanLine } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { useMultiTenantPatients } from '../../patients/hooks/useMultiTenantPatients';
import { secureLogger } from '../../../lib/security/secureLogger';
import { ECHO_PATH } from '../echoMode';
import { echoPatientPath } from '../echoTabs';
import { findPatientByWristband } from '../findPatientByWristband';
import { useEchoScan } from '../hooks/useEchoScan';
import { useEchoCamera } from './EchoCamera';
import { EchoPatientCard } from './EchoPatientCard';

/** Echo home screen in a simulation: scan a wristband, or tap a patient card or one of its shortcuts. */
export const EchoScanPatient: React.FC = () => {
  const navigate = useNavigate();
  const { exitSimulationTenant } = useTenant();
  const { patients = [], isLoading } = useMultiTenantPatients();
  const [scanError, setScanError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { cameraAvailable, openCamera } = useEchoCamera();

  useEchoScan((barcode) => {
    const patient = findPatientByWristband(barcode, patients);
    if (patient) {
      setScanError(null);
      navigate(echoPatientPath(patient.id));
    } else {
      setScanError(`Wristband "${barcode}" doesn't match a patient in this simulation.`);
    }
  });

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await exitSimulationTenant();
    } catch (err) {
      secureLogger.error('Echo: failed to leave simulation', err);
    }
    window.location.assign(ECHO_PATH);
  };

  const sortedPatients = [...patients].sort((a, b) =>
    `${a.room_number}${a.bed_number}`.localeCompare(`${b.room_number}${b.bed_number}`, undefined, { numeric: true })
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-haccare-teal to-haccare-teal-dark p-6 text-center text-white shadow-lg sm:flex-row sm:text-left">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <ScanLine className="h-9 w-9 animate-pulse" />
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Scan patient wristband</h1>
          <p className="mt-1 text-white/90">Point the scanner at the wristband to open the patient's chart.</p>
        </div>
        {cameraAvailable && (
          <button
            onClick={openCamera}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-lg font-semibold text-haccare-teal-dark shadow hover:bg-gray-50"
          >
            <Camera className="h-6 w-6" />
            Camera
          </button>
        )}
      </div>

      {scanError && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {scanError}
        </div>
      )}

      <h2 className="mt-8 mb-3 flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Patients
        {!isLoading && <span className="normal-case tracking-normal font-normal">{patients.length} in this simulation</span>}
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {sortedPatients.map((patient) => (
            <EchoPatientCard key={patient.id} patient={patient} />
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
