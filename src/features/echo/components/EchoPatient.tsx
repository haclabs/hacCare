import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import { usePatientDashboard } from '../../patients/hooks/usePatientDashboard';
import { useMultiTenantPatients } from '../../patients/hooks/useMultiTenantPatients';
import { MARModule } from '../../patients/components/mar/MARModule';
import type { Patient } from '../../../types';
import { ECHO_PATH } from '../echoMode';
import { echoPatientPath, parseEchoTab } from '../echoTabs';
import { findPatientByWristband } from '../findPatientByWristband';
import { useEchoScan } from '../hooks/useEchoScan';
import { EchoPatientBanner } from './EchoPatientBanner';
import { EchoTabBar } from './EchoTabBar';
import { EchoVitalsTab } from './EchoVitalsTab';
import { EchoIntakeOutputTab } from './EchoIntakeOutputTab';
import { EchoOrdersTab } from './EchoOrdersTab';

/**
 * One patient at the bedside: the MAR plus phone-first vitals, I&O and orders tabs that read and
 * save the same data as the desktop modules.
 * Scanning another wristband jumps to that patient on the same tab.
 */
export const EchoPatient: React.FC = () => {
  const { id = '', tab: tabParam } = useParams<{ id: string; tab?: string }>();
  const tab = parseEchoTab(tabParam);
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

  useEchoScan((barcode) => {
    const match = findPatientByWristband(barcode, patients);
    if (match && match.id !== id) {
      setScanNotice(null);
      navigate(echoPatientPath(match.id, tab));
    } else if (!match) {
      setScanNotice(
        tab === 'meds'
          ? `"${barcode}" isn't a patient wristband in this simulation. Tap Administer on a medication to start a scan.`
          : `"${barcode}" isn't a patient wristband in this simulation.`
      );
    }
  });

  // Ignore the previous patient's cached copy while the next one loads
  const activePatient = localPatient?.id === id ? localPatient : patient;
  const backToScan = () => navigate(ECHO_PATH);

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

  const currentUser =
    user && profile
      ? {
          id: user.id,
          name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email || 'Unknown User',
          role: profile.role,
        }
      : undefined;

  const updatePatient = (changes: Partial<Patient>) => {
    setLocalPatient({ ...activePatient, ...changes });
    invalidatePatient();
  };
  const patientName = `${activePatient.first_name} ${activePatient.last_name}`;

  return (
    // Extra bottom padding (on top of the shell's) clears the tab bar and the camera button above it
    <div className="pb-20">
      <EchoPatientBanner patient={activePatient} onBack={backToScan} />

      {scanNotice && (
        <div role="status" className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {scanNotice}
        </div>
      )}

      {/* Keyed by patient so a module's open forms never carry over to the next patient */}
      <div key={`${activePatient.id}-${tab}`}>
        {tab === 'meds' && (
          <MARModule
            patient={activePatient}
            medications={activePatient.medications || []}
            onMedicationUpdate={(medications) => updatePatient({ medications })}
            currentUser={currentUser}
          />
        )}
        {tab === 'vitals' && (
          <EchoVitalsTab
            patientId={activePatient.id}
            patientName={patientName}
            dateOfBirth={activePatient.date_of_birth}
            vitals={activePatient.vitals || []}
            onSaved={invalidatePatient}
          />
        )}
        {tab === 'io' && <EchoIntakeOutputTab patientId={activePatient.id} patientName={patientName} />}
        {tab === 'orders' && <EchoOrdersTab patientId={activePatient.id} />}
      </div>

      <EchoTabBar patientId={activePatient.id} />
    </div>
  );
};
