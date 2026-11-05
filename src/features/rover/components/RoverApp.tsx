import React, { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useTenant } from '../../../contexts/TenantContext';
import { ROVER_PATH, setRoverPreferred } from '../roverMode';
import { RoverHeader } from './RoverHeader';
import { RoverSimulationList } from './RoverSimulationList';
import { RoverScanPatient } from './RoverScanPatient';
import { RoverPatientMAR } from './RoverPatientMAR';
import { RoverCameraProvider } from './RoverCamera';

/**
 * Rover — the bedside tablet (or phone) shell. Deliberately limited: pick a simulation, scan a
 * wristband, administer from the MAR. No sidebar and no other modules.
 */
const RoverApp: React.FC = () => {
  const { currentTenant, loading } = useTenant();
  const inSimulation = currentTenant?.tenant_type === 'simulation_active';
  // Only block on the first load — a background tenant refresh must not unmount an open BCMA scan
  const initialLoad = loading && !currentTenant;

  // Opening the rover once makes this device a rover: later sign-ins land back here
  useEffect(() => {
    setRoverPreferred(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <RoverHeader />
      {/* Bottom padding keeps the floating camera button off the last row */}
      <main className={inSimulation ? 'pb-24' : undefined}>
        <ErrorBoundary>
          {initialLoad ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-10 w-10 animate-spin text-haccare-teal" />
            </div>
          ) : (
            <RoverCameraProvider showButton={inSimulation}>
              <Routes>
                <Route index element={inSimulation ? <RoverScanPatient /> : <RoverSimulationList />} />
                <Route
                  path="patient/:id"
                  element={inSimulation ? <RoverPatientMAR /> : <Navigate to={ROVER_PATH} replace />}
                />
                <Route path="*" element={<Navigate to={ROVER_PATH} replace />} />
              </Routes>
            </RoverCameraProvider>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default RoverApp;
