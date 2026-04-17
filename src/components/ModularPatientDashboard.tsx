/**
 * ModularPatientDashboard
 *
 * Orchestration shell for the patient detail view.
 * Heavy concerns are delegated to:
 *   - usePatientDashboard          (data fetching + badge counts via React Query)
 *   - PatientOverview              (patient header + floating action bar)
 *   - ModuleSelector               (grid of module/action cards)
 *   - ModuleContent                (routes activeModule → clinical sub-component)
 *   - patientRecordPrinter         (full HTML print record generation)
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { SchemaTemplateEditor } from './SchemaTemplateEditor';
import StudentQuickIntro from './StudentQuickIntro';
import { DoctorsOrders } from '../features/patients/components/DoctorsOrders';
import { Labs } from '../features/patients/components/Labs';
import { PatientOverview } from '../features/patients/components/PatientOverview';
import { ModuleSelector } from '../features/patients/components/ModuleSelector';
import { ModuleContent } from '../features/patients/components/ModuleContent';
import { usePatientDashboard } from '../features/patients/hooks/usePatientDashboard';
import { printPatientRecord } from '../utils/patientRecordPrinter';
import type { Patient } from '../types';
import { upsertAdmissionRecord, type AdmissionRecord } from '../services/patient/admissionService';
import { supabase } from '../lib/api/supabase';
import { createAssessment } from '../services/patient/assessmentService';
import { createBowelRecord } from '../services/clinical/bowelRecordService';
import { useTenant } from '../contexts/TenantContext';
import { useDoctorsOrdersAlert } from '../hooks/useDoctorsOrdersAlert';
import { secureLogger } from '../lib/security/secureLogger';

interface ModularPatientDashboardProps {
  onShowBracelet?: (patient: Patient) => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
    department: string;
  };
}

type ActiveModule =
  | 'vitals'
  | 'medications'
  | 'forms'
  | 'overview'
  | 'handover'
  | 'advanced-directives'
  | 'hacmap'
  | 'intake-output';

const MODULE_TITLES: Partial<Record<ActiveModule, string>> = {
  vitals: 'Vitals & Assessments',
  medications: 'Medications',
  forms: 'Assessments',
  handover: 'Handover Notes',
  'advanced-directives': 'Advanced Directives',
  hacmap: 'hacMap - Device & Wound Care',
  'intake-output': 'Intake & Output',
};

export const ModularPatientDashboard: React.FC<ModularPatientDashboardProps> = ({
  onShowBracelet,
  currentUser,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();

  // ─── Server state ──────────────────────────────────────────────────────────
  const {
    patient,
    isLoading,
    error,
    unacknowledgedLabsCount,
    unacknowledgedHandoverCount,
    invalidateLabsCount,
    invalidateHandoverCount,
    invalidatePatient,
  } = usePatientDashboard(id);

  const [ordersRefreshTrigger, setOrdersRefreshTrigger] = useState(0);
  const { unacknowledgedCount } = useDoctorsOrdersAlert(patient?.id || '', ordersRefreshTrigger);

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [activeModule, setActiveModule] = useState<ActiveModule>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showDoctorsOrders, setShowDoctorsOrders] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [showQuickIntro, setShowQuickIntro] = useState(false);

  // ─── Refresh handlers ──────────────────────────────────────────────────────
  const handleOrdersChange = () => setOrdersRefreshTrigger((prev) => prev + 1);
  const handleLabsChange = () => invalidateLabsCount();
  const handleHandoverRefresh = () => {
    invalidateHandoverCount();
    invalidatePatient();
  };

  // ─── Local patient state mutations (optimistic) ────────────────────────────
  const [localPatient, setLocalPatient] = useState<Patient | null>(null);
  const activePatient = localPatient ?? patient;

  const handlePatientUpdate = (updatedData: Partial<Patient>) => {
    if (activePatient) {
      setLocalPatient({ ...activePatient, ...updatedData });
      setLastUpdated(new Date());
    }
  };

  const handleMedicationUpdate = (medications: any[]) => {
    handlePatientUpdate({ medications });
  };

  // Sync local state when React Query refreshes patient
  React.useEffect(() => {
    if (patient) setLocalPatient(patient);
  }, [patient]);

  // ─── Assessment save (stays here: uses currentUser prop + supabase) ────────
  const handleAssessmentSave = async (assessment: any) => {
    try {
      secureLogger.debug('Saving assessment to database:', assessment);
      secureLogger.debug('Assessment type:', assessment.type);

      if (assessment.type === 'admission-assessment') {
        const admissionRecord: AdmissionRecord = {
          patient_id: assessment.patientId,
          admission_type: assessment.data.admissionType || 'Emergency',
          chief_complaint: assessment.data.chiefComplaint || '',
          attending_physician: assessment.data.attendingPhysician || '',
          insurance_provider: '',
          insurance_policy: '',
          admission_source: '',
          height: '',
          weight: '',
          bmi: '',
          smoking_status: '',
          alcohol_use: '',
          exercise: '',
          occupation: '',
          family_history: '',
          marital_status: '',
          secondary_contact_name: assessment.data.emergencyContactName || '',
          secondary_contact_relationship: assessment.data.emergencyContactRelationship || '',
          secondary_contact_phone: assessment.data.emergencyContactPhone || '',
          secondary_contact_address: '',
        };
        await upsertAdmissionRecord(admissionRecord);
        secureLogger.debug('Admission assessment saved to patient_admission_records');

      } else if (assessment.type === 'nursing-assessment') {
        const { data: savedNote, error: saveError } = await supabase
          .from('patient_notes')
          .insert({
            patient_id: assessment.patientId,
            nurse_id: currentUser?.id || '',
            nurse_name: assessment.submittedBy,
            type: 'Assessment',
            content: JSON.stringify(assessment.data),
            priority: 'Medium',
          })
          .select()
          .single();

        if (saveError) {
          secureLogger.error('Error saving nursing assessment:', saveError);
          throw saveError;
        }
        secureLogger.debug('Nursing assessment saved to patient_notes:', savedNote);

      } else if (assessment.type === 'bowel-assessment') {
        await createBowelRecord({
          patient_id: assessment.patientId,
          nurse_id: currentUser?.id || '',
          nurse_name: assessment.submittedBy,
          recorded_at: assessment.data.recordedAt || new Date().toISOString(),
          bowel_incontinence: assessment.data.bowelIncontinence || 'Continent',
          stool_appearance: assessment.data.stoolAppearance || 'Normal',
          stool_consistency: assessment.data.stoolConsistency || 'Formed',
          stool_colour: assessment.data.stoolColour || 'Brown',
          stool_amount: assessment.data.stoolAmount || 'Moderate',
          notes: assessment.data.notes || '',
        });
        secureLogger.debug('Bowel assessment saved to bowel_records');

      } else {
        await createAssessment({
          patient_id: assessment.patientId,
          nurse_id: currentUser?.id || '',
          nurse_name: assessment.submittedBy,
          assessment_type: 'physical',
          assessment_date: new Date().toISOString(),
          assessment_notes: JSON.stringify(assessment.data),
          recommendations: '',
          follow_up_required: false,
          priority_level: 'routine',
        });
        secureLogger.debug('Generic assessment saved to patient_notes');
      }

      setLastUpdated(new Date());
    } catch (err) {
      secureLogger.error('Error saving assessment to database:', err);
    }
  };

  // ─── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-6 mx-auto" />
          <p className="text-xl font-medium text-gray-700">Loading patient data...</p>
          <p className="text-gray-500 mt-2">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (error || !activePatient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Patient</h2>
          <p className="text-red-600 mb-6">{error || 'Patient not found'}</p>
          <button
            onClick={() => navigate('/app')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Shared PatientActionBar navigation callbacks ─────────────────────────
  const navProps = {
    onChartClick: () => printPatientRecord(activePatient, currentTenant?.id || ''),
    onVitalsClick: () => setActiveModule('vitals'),
    onMedsClick: () => setActiveModule('medications'),
    onLabsClick: () => setShowLabs(true),
    onOrdersClick: () => setShowDoctorsOrders(true),
    onHacMapClick: () => setActiveModule('hacmap'),
    onIOClick: () => setActiveModule('intake-output'),
    onNotesClick: () => setActiveModule('handover'),
    vitalsCount: activePatient.vitals?.length || 0,
    medsCount: activePatient.medications?.length || 0,
    hasNewLabs: unacknowledgedLabsCount > 0,
    hasNewOrders: unacknowledgedCount > 0,
    hasNewNotes: unacknowledgedHandoverCount > 0,
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="px-6 py-8">
        {activeModule === 'overview' ? (
          <div className="space-y-8">
            <PatientOverview
              patient={activePatient}
              lastUpdated={lastUpdated}
              unacknowledgedLabsCount={unacknowledgedLabsCount}
              unacknowledgedCount={unacknowledgedCount}
              unacknowledgedHandoverCount={unacknowledgedHandoverCount}
              onModuleChange={setActiveModule}
              onShowLabs={() => setShowLabs(true)}
              onShowDoctorsOrders={() => setShowDoctorsOrders(true)}
              onPrintRecord={() => printPatientRecord(activePatient, currentTenant?.id || '')}
              onShowBracelet={onShowBracelet}
              onShowQuickIntro={() => setShowQuickIntro(true)}
            />
            <ModuleSelector
              patient={activePatient}
              activeModule={activeModule}
              onModuleChange={setActiveModule}
              onShowDoctorsOrders={() => setShowDoctorsOrders(true)}
              onShowLabs={() => setShowLabs(true)}
              onPrintRecord={() => printPatientRecord(activePatient, currentTenant?.id || '')}
              unacknowledgedCount={unacknowledgedCount}
              unacknowledgedLabsCount={unacknowledgedLabsCount}
              unacknowledgedHandoverCount={unacknowledgedHandoverCount}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-3 text-sm">
              <button
                onClick={() => setActiveModule('overview')}
                className="text-gray-600 hover:text-gray-900 font-medium hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                Overview
              </button>
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <span className="text-gray-900 font-semibold bg-gray-100 px-3 py-1.5 rounded-lg">
                {MODULE_TITLES[activeModule]}
              </span>
            </nav>

            {/* Active module */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[600px] overflow-hidden">
              <ModuleContent
                activeModule={activeModule}
                patient={activePatient}
                currentUser={currentUser}
                onPatientUpdate={handlePatientUpdate}
                onMedicationUpdate={handleMedicationUpdate}
                onAssessmentSave={handleAssessmentSave}
                onHandoverRefresh={handleHandoverRefresh}
                onNavigateToOverview={() => setActiveModule('overview')}
                onLastUpdated={() => setLastUpdated(new Date())}
                {...navProps}
              />
            </div>
          </div>
        )}
      </div>

      {/* Doctors Orders Modal */}
      {showDoctorsOrders && activePatient && (
        <DoctorsOrders
          patientId={activePatient.id}
          currentUser={{
            id: currentUser?.id || 'unknown',
            name: currentUser?.name || 'Unknown User',
            role: (currentUser?.role as 'nurse' | 'admin' | 'super_admin') || 'nurse',
          }}
          onClose={() => setShowDoctorsOrders(false)}
          onOrdersChange={handleOrdersChange}
        />
      )}

      {/* Labs Modal */}
      {showLabs && activePatient && currentTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Laboratory Results</h2>
              <button
                onClick={() => setShowLabs(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <Labs
                patientId={activePatient.id}
                patientNumber={activePatient.patient_id}
                patientName={`${activePatient.first_name} ${activePatient.last_name}`}
                patientDOB={activePatient.date_of_birth}
                onLabsChange={handleLabsChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* Schema Template Editor */}
      <SchemaTemplateEditor
        isOpen={showSchemaEditor}
        onClose={() => setShowSchemaEditor(false)}
        onSave={(schema) => {
          secureLogger.debug('Schema saved:', schema);
          setShowSchemaEditor(false);
        }}
      />

      {/* Student Quick Intro Modal */}
      {showQuickIntro && <StudentQuickIntro onClose={() => setShowQuickIntro(false)} />}
    </div>
  );
};
