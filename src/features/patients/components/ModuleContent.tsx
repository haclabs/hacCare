/**
 * ModuleContent
 *
 * Routes the active clinical module to its corresponding component.
 * All sub-modules receive identical PatientActionBar navigation props,
 * so they are bundled into a single spread via `navProps`.
 *
 * Extracted from ModularPatientDashboard.tsx to keep that file under 350 lines.
 */

import React from 'react';
import { VitalsModule } from '../components/vitals';
import { MARModule } from '../components/mar';
import { FormsModule } from '../../forms';
import { HandoverNotes } from '../components/handover/HandoverNotes';
import { AdvancedDirectivesForm } from '../components/forms/AdvancedDirectivesForm';
import { IntakeOutputCard } from '../components/intake-output';
import { AvatarBoard } from '../../hacmap/AvatarBoard';
import type { Patient } from '../../../types';

type ActiveModule =
  | 'vitals'
  | 'medications'
  | 'forms'
  | 'overview'
  | 'handover'
  | 'advanced-directives'
  | 'hacmap'
  | 'intake-output';

interface NavProps {
  onChartClick: () => void;
  onVitalsClick: () => void;
  onMedsClick: () => void;
  onLabsClick: () => void;
  onOrdersClick: () => void;
  onHacMapClick: () => void;
  onIOClick: () => void;
  onNotesClick: () => void;
  vitalsCount: number;
  medsCount: number;
  hasNewLabs: boolean;
  hasNewOrders: boolean;
  hasNewNotes: boolean;
}

interface ModuleContentProps extends NavProps {
  activeModule: ActiveModule;
  patient: Patient;
  currentUser?: {
    id: string;
    name: string;
    role: string;
    department: string;
  };
  onPatientUpdate: (data: Partial<Patient>) => void;
  onMedicationUpdate: (medications: any[]) => void;
  onAssessmentSave: (assessment: any) => void;
  onHandoverRefresh: () => void;
  onNavigateToOverview: () => void;
  onLastUpdated: () => void;
}

export const ModuleContent: React.FC<ModuleContentProps> = ({
  activeModule,
  patient,
  currentUser,
  onPatientUpdate,
  onMedicationUpdate,
  onAssessmentSave,
  onHandoverRefresh,
  onNavigateToOverview,
  onLastUpdated,
  ...navProps
}) => {
  if (activeModule === 'vitals') {
    return (
      <VitalsModule
        patient={patient}
        vitals={patient.vitals || []}
        onVitalsUpdate={(vitals) => {
          onPatientUpdate({ vitals });
          onLastUpdated();
        }}
        onAssessmentSave={onAssessmentSave}
        currentUser={currentUser}
        {...navProps}
      />
    );
  }

  if (activeModule === 'medications') {
    return (
      <MARModule
        patient={patient}
        medications={patient.medications || []}
        onMedicationUpdate={onMedicationUpdate}
        currentUser={currentUser}
        {...navProps}
      />
    );
  }

  if (activeModule === 'forms') {
    return (
      <FormsModule
        patient={patient}
        onAssessmentSave={onAssessmentSave}
        currentUser={currentUser}
      />
    );
  }

  if (activeModule === 'handover') {
    return (
      <HandoverNotes
        patientId={patient.id}
        patientName={`${patient.first_name} ${patient.last_name}`}
        currentUser={currentUser || { id: 'unknown', name: 'Unknown User', role: 'nurse' }}
        onRefresh={onHandoverRefresh}
        {...navProps}
      />
    );
  }

  if (activeModule === 'advanced-directives') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Advanced Directives</h2>
          <p className="text-gray-600 mt-2">
            Legal care preferences and end-of-life planning documentation for{' '}
            {patient.first_name} {patient.last_name}
          </p>
        </div>
        <AdvancedDirectivesForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={onNavigateToOverview}
          onSave={() => {
            onLastUpdated();
            onNavigateToOverview();
          }}
        />
      </div>
    );
  }

  if (activeModule === 'intake-output') {
    return (
      <div className="p-6">
        <IntakeOutputCard
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onRefresh={onLastUpdated}
          {...navProps}
        />
      </div>
    );
  }

  if (activeModule === 'hacmap') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <AvatarBoard
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          patientNumber={patient.patient_id}
          {...navProps}
        />
      </div>
    );
  }

  return null;
};
