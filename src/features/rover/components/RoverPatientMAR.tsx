import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowLeft, Loader2, ScanLine } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import { usePatientDashboard } from '../../patients/hooks/usePatientDashboard';
import { useMultiTenantPatients } from '../../patients/hooks/useMultiTenantPatients';
import { MARModule } from '../../patients/components/mar/MARModule';
import type { Medication, Patient } from '../../../types';
import { ROVER_PATH } from '../roverMode';
import { findPatientByWristband } from '../findPatientByWristband';
import { useRoverScan } from '../hooks/useRoverScan';

/** Bedside MAR for one patient. Scanning another wristband jumps straight to that patient. */
export const RoverPatientMAR: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { currentTenant } = useTenant();
  const { patient, isLoading, error, invalidatePatient } = usePatientDashboard(id);
  const { patients = [] } = useMultiTenantPatients();
  const [localPatient, setLocalPatient] = useState<Patient | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (patient) setLocalPatient(patient);
  }, [patient]);

  useRoverScan((barcode) => {
    const match = findPatientByWristband(barcode, patients);
    if (match && match.id !== id) {
      setScanNotice(null);
      navigate(`${ROVER_PATH}/patient/${match.id}`);
    } else if (!match) {
      setScanNotice(`"${barcode}" isn't a patient wristband in this simulation. Tap Administer on a medication to start a scan.`);
    }
  });

  const activePatient = localPatient ?? patient;
  const backToScan = () => navigate(ROVER_PATH);

  const currentUser =
    user && profile
      ? {
          id: user.id,
          name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email || 'Unknown User',
          role: profile.role,
        }
      : undefined;

  const handleMedicationUpdate = (medications: Medication[]) => {
    if (activePatient) setLocalPatient({ ...activePatient, medications });
    invalidatePatient();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-haccare-teal" />
      </div>
    );
  }

  const wrongTenant = activePatient?.tenant_id && currentTenant && activePatient.tenant_id !== currentTenant.id;
  if (error || !activePatient || wrongTenant) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">Patient not found in this simulation</h1>
        <button
          onClick={backToScan}
          className="mt-6 rounded-lg bg-haccare-teal px-6 py-3 font-semibold text-white hover:bg-haccare-teal-dark"
        >
          Back to scan
        </button>
      </div>
    );
  }

  const allergies = (activePatient.allergies ?? []).filter(Boolean);

  return (
    <div className="pb-8">
      {/* Pinned so name and allergies stay in view while scrolling a long MAR */}
      <div className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={backToScan}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-haccare-teal px-4 py-3 font-semibold text-white hover:bg-haccare-teal-dark"
          >
            <ArrowLeft className="h-5 w-5" />
            <ScanLine className="h-5 w-5" />
            <span className="hidden sm:inline">Next patient</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-gray-900 dark:text-white">
              {activePatient.last_name}, {activePatient.first_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Room {activePatient.room_number}
              {activePatient.bed_number} · {activePatient.patient_id} · DOB {activePatient.date_of_birth}
            </p>
          </div>
        </div>
        <div
          className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            allergies.length ? 'bg-red-50 text-red-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {allergies.length ? `Allergies: ${allergies.join(', ')}` : 'No known allergies'}
        </div>
      </div>

      {scanNotice && (
        <div role="status" className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {scanNotice}
        </div>
      )}

      <div className="overflow-x-auto">
        <MARModule
          patient={activePatient}
          medications={activePatient.medications || []}
          onMedicationUpdate={handleMedicationUpdate}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};
