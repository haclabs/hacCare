import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import type { Patient, VitalSigns, Medication, PatientNote } from '../../../../types';
import { fetchPatientById, fetchPatientVitals, fetchPatientNotes } from '../../../../services/patient/patientService';
import { fetchPatientMedications } from '../../../../services/clinical/medicationService';
import { useTenant } from '../../../../contexts/TenantContext';
import { printPatientRecord } from '../../../../utils/patientRecordPrinter';
import { PatientDetailTabs } from './PatientDetailTabs';
import { RecentActivity } from './RecentActivity';
import { secureLogger } from '../../../../lib/security/secureLogger';

interface PatientDetailProps {
  onShowBracelet?: (patient: Patient) => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ onShowBracelet }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id ?? '';
  const simulationId = currentTenant?.simulation_id;

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>(location.state?.activeTab ?? 'overview');
  const [showActivity, setShowActivity] = useState(false);

  // ─── Server state (React Query) ────────────────────────────────────────────
  const { data: patient, isLoading: loadingPatient, error: patientError } = useQuery({
    queryKey: ['patient', id, simulationId],
    queryFn: () => fetchPatientById(id!, simulationId),
    enabled: !!id,
  });

  const { data: vitals = [] } = useQuery<VitalSigns[]>({
    queryKey: ['patient-vitals', id],
    queryFn: () => fetchPatientVitals(id!),
    enabled: !!id,
  });

  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: ['patient-medications', id, simulationId],
    queryFn: () => fetchPatientMedications(id!, simulationId),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery<PatientNote[]>({
    queryKey: ['patient-notes', id],
    queryFn: () => fetchPatientNotes(id!),
    enabled: !!id,
  });

  // ─── Invalidation callbacks passed down to sub-components ─────────────────
  const refreshVitals    = () => queryClient.invalidateQueries({ queryKey: ['patient-vitals', id] });
  const refreshMeds      = () => queryClient.invalidateQueries({ queryKey: ['patient-medications', id, simulationId] });
  const refreshNotes     = () => queryClient.invalidateQueries({ queryKey: ['patient-notes', id] });

  // ─── Loading / error states ────────────────────────────────────────────────
  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (patientError || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/app')}
            className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-100">Patient ID: {patient.patient_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => printPatientRecord(patient, tenantId).catch(err => secureLogger.error('Print failed:', err))}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>View Patient Record</span>
          </button>
          <button
            onClick={() => setShowActivity(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>Recent Activity</span>
          </button>
        </div>
      </div>

      {/* Tabs + content */}
      <PatientDetailTabs
        patient={patient}
        patientId={id!}
        vitals={vitals}
        medications={medications}
        notes={notes}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onVitalsUpdated={refreshVitals}
        onNotesUpdated={refreshNotes}
        onMedicationsUpdated={refreshMeds}
        onShowBracelet={onShowBracelet}
      />

      {/* Recent Activity Modal */}
      {showActivity && (
        <RecentActivity
          patientId={id!}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  );
};
