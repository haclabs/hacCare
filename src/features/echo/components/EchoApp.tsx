import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useTenant } from '../../../contexts/TenantContext';
import { ECHO_PATH, setEchoPreferred } from '../echoMode';
import { EchoHeader } from './EchoHeader';
import { EchoSimulationList } from './EchoSimulationList';
import { EchoScanPatient } from './EchoScanPatient';
import { EchoPatientMAR } from './EchoPatientMAR';
import { EchoCameraProvider } from './EchoCamera';

/**
 * Echo — the bedside tablet (or phone) shell. Deliberately limited: pick a simulation, scan a
 * wristband, administer from the MAR. No sidebar and no other modules.
 */
const EchoApp: React.FC = () => {
  const { currentTenant, loading } = useTenant();
  const inSimulation = currentTenant?.tenant_type === 'simulation_active';
  // Only block on the first load — a background tenant refresh must not unmount an open BCMA scan
  const initialLoad = loading && !currentTenant;

  // Opening Echo once makes this device an Echo device: later sign-ins land back here
  useEffect(() => {
    setEchoPreferred(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <EchoHeader />
      {/* Bottom padding keeps the floating camera button off the last row */}
      <main className={inSimulation ? 'pb-24' : undefined}>
        <ErrorBoundary>
          {initialLoad ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-haccare-teal" />
            </div>
          ) : (
            <EchoCameraProvider showButton={inSimulation}>
              <Routes>
                <Route index element={inSimulation ? <EchoScanPatient /> : <EchoSimulationList />} />
                <Route
                  path="patient/:id"
                  element={inSimulation ? <EchoPatientMAR /> : <Navigate to={ECHO_PATH} replace />}
                />
                <Route path="*" element={<Navigate to={ECHO_PATH} replace />} />
              </Routes>
            </EchoCameraProvider>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default EchoApp;
