/**
 * PatientDetailTabs
 *
 * Renders the tab bar + tab panel content for PatientDetail.
 * Extracted to keep PatientDetail.tsx under the 350-line limit.
 */

import React, { useState } from 'react';
import { Activity, User, FileText, Pill, Stethoscope, Clipboard, Shield, Sparkles } from 'lucide-react';
import type { Patient, VitalSigns, Medication, PatientNote } from '../../../../types';
import { MARModule } from '../mar';
import { AdmissionRecordsForm } from '../forms/AdmissionRecordsForm';
import { AdvancedDirectivesForm } from '../forms/AdvancedDirectivesForm';
import { VitalsContent } from '../vitals/VitalsContent';
import { NotesContent } from './NotesContent';
import { PatientAssessmentsTab } from './PatientAssessmentsTab';
import { ModernPatientManagement } from '../../../../components/ModernPatientManagement';
import { fetchPatientMedications } from '../../../../services/clinical/medicationService';
import { useTenant } from '../../../../contexts/TenantContext';
import { secureLogger } from '../../../../lib/security/secureLogger';

// ─── condition colour helpers (shared with overview panel) ────────────────────
export const getConditionColor = (condition: Patient['condition']) => {
  switch (condition) {
    case 'Critical':  return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 shadow-red-100';
    case 'Stable':    return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-green-100';
    case 'Improving': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-blue-100';
    case 'Discharged':return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
    default:          return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
  }
};

export const getCardAccent = (condition: Patient['condition']) => {
  switch (condition) {
    case 'Critical':  return 'border-l-4 border-l-red-500';
    case 'Stable':    return 'border-l-4 border-l-green-500';
    case 'Improving': return 'border-l-4 border-l-blue-500';
    case 'Discharged':return 'border-l-4 border-l-gray-400';
    default:          return 'border-l-4 border-l-gray-400';
  }
};

export const getAvatarColor = (condition: Patient['condition']) => {
  switch (condition) {
    case 'Critical':  return 'bg-gradient-to-br from-red-100 to-red-200 text-red-600';
    case 'Stable':    return 'bg-gradient-to-br from-green-100 to-green-200 text-green-600';
    case 'Improving': return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
    case 'Discharged':return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600';
    default:          return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
  }
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface PatientDetailTabsProps {
  patient: Patient;
  patientId: string;
  vitals: VitalSigns[];
  medications: Medication[];
  notes: PatientNote[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onVitalsUpdated: (vitals: VitalSigns[]) => void;
  onNotesUpdated: (notes: PatientNote[]) => void;
  onMedicationsUpdated: (meds: Medication[]) => void;
  onShowBracelet?: (patient: Patient) => void;
}

const TABS: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  subTabs?: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  { id: 'overview',     label: 'Overview',      icon: User },
  { id: 'medications',  label: 'MAR',            icon: Pill },
  { id: 'assessments',  label: 'Assessments',    icon: Stethoscope,
    subTabs: [
      { id: 'overview', label: 'Overview',    icon: Stethoscope },
      { id: 'vitals',   label: 'Vital Signs', icon: Activity },
      { id: 'notes',    label: 'Notes',       icon: FileText },
    ],
  },
  { id: 'admission',  label: 'Admission',  icon: Clipboard },
  { id: 'directives', label: 'Directives', icon: Shield },
  { id: 'modular',    label: 'Modern System', icon: Sparkles },
];

// ─── Component ────────────────────────────────────────────────────────────────
export const PatientDetailTabs: React.FC<PatientDetailTabsProps> = ({
  patient,
  patientId,
  vitals,
  medications,
  notes,
  activeTab,
  onTabChange,
  onVitalsUpdated,
  onNotesUpdated,
  onMedicationsUpdated,
  onShowBracelet,
}) => {
  const { currentTenant } = useTenant();
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const totalMedications = medications.filter(m => m.status === 'Active').length;

  const tabs = TABS.map(t =>
    t.id === 'medications' ? { ...t, count: totalMedications > 0 ? totalMedications : undefined } : t
  );

  // ─── Tab panel ──────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300 ${getCardAccent(patient.condition)}`}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full shadow-lg ${getAvatarColor(patient.condition)}`}>
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {patient.first_name} {patient.last_name}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 flex items-center space-x-2 mt-1">
                      <span>{new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years old</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                      <span>{patient.gender}</span>
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-md mt-2 inline-block">
                      {patient.patient_id}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-x-3 gap-2">
                  <span className={`px-6 py-3 rounded-full text-lg font-semibold border shadow-lg ${getConditionColor(patient.condition)}`}>
                    {patient.condition}
                  </span>
                  {onShowBracelet && (
                    <button
                      onClick={() => onShowBracelet(patient)}
                      className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                    >
                      <User className="h-4 w-4 mr-2" />
                      ID Bracelet
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Patient Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-3">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Patient Information
                </h3>
                <div className="space-y-3">
                  {[
                    ['Patient ID', patient.patient_id],
                    ['Date of Birth', new Date(patient.date_of_birth).toLocaleDateString()],
                    ['Gender', patient.gender],
                    ['Blood Type', patient.blood_type],
                    ['Room', `${patient.room_number} - ${patient.bed_number}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg mr-3">
                    <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  Emergency Contact
                </h3>
                <div className="space-y-3">
                  {[
                    ['Name', patient.emergency_contact_name],
                    ['Relationship', patient.emergency_contact_relationship],
                    ['Phone', patient.emergency_contact_phone],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admission Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg mr-3">
                    <Clipboard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Admission Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Admission Date:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{new Date(patient.admission_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Condition:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConditionColor(patient.condition)}`}>{patient.condition}</span>
                  </div>
                  {[
                    ['Diagnosis', patient.diagnosis],
                    ['Assigned Nurse', patient.assigned_nurse || 'No nurse assigned'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg mr-3">
                    <Activity className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  Allergies
                </h3>
                <div className="space-y-3">
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, i) => (
                        <span key={i} className="inline-flex items-center px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800">
                          <Activity className="h-4 w-4 mr-1" />
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <span className="text-sm text-green-800 dark:text-green-200 font-medium">No known allergies</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'assessments':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {TABS.find(t => t.id === 'assessments')?.subTabs?.map(sub => {
                  const Icon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubTab(sub.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                        activeSubTab === sub.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {sub.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            {activeSubTab === 'overview' && (
              <PatientAssessmentsTab
                patientId={patientId}
                patientName={`${patient.first_name} ${patient.last_name}`}
              />
            )}
            {activeSubTab === 'vitals' && (
              <VitalsContent
                patientId={patientId}
                patientName={`${patient.first_name} ${patient.last_name}`}
                vitals={vitals}
                onVitalsUpdated={onVitalsUpdated}
                patientDateOfBirth={patient.date_of_birth}
              />
            )}
            {activeSubTab === 'notes' && (
              <NotesContent
                patientId={patientId}
                patientName={`${patient.first_name} ${patient.last_name}`}
                notes={notes}
                onNotesUpdated={onNotesUpdated}
              />
            )}
          </div>
        );

      case 'medications':
        return (
          <MARModule
            patient={patient}
            medications={medications}
            onMedicationUpdate={async (updated) => {
              onMedicationsUpdated(updated);
              try {
                const simulationId = currentTenant?.simulation_id;
                const fresh = await fetchPatientMedications(patientId, simulationId);
                onMedicationsUpdated(fresh);
              } catch (err) {
                secureLogger.error('Error refreshing medications after update:', err);
              }
            }}
            currentUser={{ id: 'current-user', name: 'Current User', role: 'nurse' }}
          />
        );

      case 'admission':
        return (
          <AdmissionRecordsForm
            patientId={patientId}
            patientName={`${patient.first_name} ${patient.last_name}`.trim()}
            onClose={() => onTabChange('overview')}
            onSave={() => onTabChange('overview')}
          />
        );

      case 'directives':
        return (
          <AdvancedDirectivesForm
            patientId={patientId}
            patientName={`${patient.first_name} ${patient.last_name}`.trim()}
            onClose={() => onTabChange('overview')}
            onSave={() => onTabChange('overview')}
          />
        );

      case 'modular':
        return (
          <ModernPatientManagement
            patient={patient}
            onPatientUpdate={() => {}}
            mode="tab"
            currentUser={{ id: 'current-user', name: 'Current User', role: 'nurse', department: 'nursing' }}
          />
        );

      default:
        return null;
    }
  };

  // ─── Tab bar ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
        <nav className="flex space-x-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-6 py-4 font-medium text-sm whitespace-nowrap flex items-center transition-all duration-300 transform hover:scale-105 ${
                  index === 0 ? 'rounded-tl-lg' : ''
                } ${index === tabs.length - 1 ? 'rounded-tr-lg' : ''} ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg border-b-4 border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border-b-4 border-transparent hover:border-gray-300'
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-current'}`} />
                <span className="font-semibold">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-3 text-xs font-bold px-2.5 py-1 rounded-full min-w-[1.5rem] h-6 flex items-center justify-center ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6" id="patient-record-printable">
        {renderContent()}
      </div>
    </>
  );
};
