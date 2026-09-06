import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Info } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { bcmaService } from '../../../services/clinical/bcmaService';
import { useBCMA } from '../../patients/hooks/useBCMA';
import { BCMAAdministration } from '../../patients/components/BCMAAdministration';
import { MedicationAdministrationGrid } from '../../patients/components/mar/MedicationAdministrationGrid';
import { buildTrainingPatient, fetchTrainingMedications } from '../data/trainingPatientData';
import { TrainingWalkthroughModal } from './TrainingWalkthroughModal';
import type { Medication } from '../../../types';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';

const WALKTHROUGH_SEEN_KEY = 'training_bcma_walkthrough_seen_v1';

export const TrainingBCMAPage: React.FC = () => {
  const { user, profile } = useAuth();
  const bcma = useBCMA();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const patient = buildTrainingPatient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['training-bcma-medications'],
    queryFn: fetchTrainingMedications,
    staleTime: 10 * 60 * 1000, // catalog rarely changes
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setMedications(data);
  }, [data]);

  useEffect(() => {
    if (!localStorage.getItem(WALKTHROUGH_SEEN_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWalkthrough(true);
    }
  }, []);

  const closeWalkthrough = () => {
    localStorage.setItem(WALKTHROUGH_SEEN_KEY, 'true');
    setShowWalkthrough(false);
  };

  // Forced 'nurse' role so admin/super_admin viewers never see the grid's
  // real-DB Edit/Delete buttons on this sandbox patient.
  const gridUser = user && profile ? {
    id: user.id,
    name: `${profile.first_name} ${profile.last_name}`.trim() || profile.email || 'Student',
    role: 'nurse',
  } : { id: 'training-user', name: 'Student', role: 'nurse' };

  const realCurrentUser = user && profile ? {
    id: user.id,
    name: `${profile.first_name} ${profile.last_name}`.trim() || profile.email || 'Student',
    role: profile.role,
  } : gridUser;

  const handleAdministrationComplete = (success: boolean) => {
    if (success && bcma.state.currentMedication) {
      const administeredId = bcma.state.currentMedication.id;
      setMedications(prev => prev.map(med => {
        if (med.id !== administeredId) return med;
        return {
          ...med,
          last_administered: new Date().toISOString(),
          next_due: bcmaService.calculateNextDueTime(med),
        };
      }));
    }
    bcma.cancelBCMAProcess();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BCMA Med Training</h1>
            <p className="text-sm text-gray-500">Practice sandbox — one medication of each type</p>
          </div>
        </div>
        <button
          onClick={() => setShowWalkthrough(true)}
          className="px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors text-sm font-medium"
        >
          How to Use This
        </button>
      </div>

      <div className="flex items-start gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          This is a practice sandbox. Nothing you do here is ever saved, graded, or reset — administer any
          medication as many times as you like.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="p-6 text-center text-gray-500">Failed to load training medications. Please try again later.</div>
      ) : medications.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No global catalog medications are set up yet. Ask an administrator to add entries to the Medication Catalog.
        </div>
      ) : (
        <MedicationAdministrationGrid
          patient={patient}
          medications={medications}
          currentUser={gridUser}
          onMedicationUpdate={() => {}}
          onAddClick={() => alert('Adding medications is not available in this training sandbox.')}
          onEditClick={() => alert('Editing medications is not available in this training sandbox.')}
          onBCMAStart={(p, med) => bcma.startBCMAProcess(p, med)}
        />
      )}

      {bcma.state.isActive && bcma.state.currentMedication && (
        <BCMAAdministration
          patient={patient}
          medication={bcma.state.currentMedication}
          currentUser={realCurrentUser}
          onAdministrationComplete={handleAdministrationComplete}
          onCancel={() => bcma.cancelBCMAProcess()}
          practiceMode
        />
      )}

      {showWalkthrough && <TrainingWalkthroughModal onClose={closeWalkthrough} />}
    </div>
  );
};

export default TrainingBCMAPage;
