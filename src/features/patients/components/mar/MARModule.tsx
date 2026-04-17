import React, { useState, useEffect } from 'react';
import { Pill, Clock, Droplets } from 'lucide-react';

import type { Patient, Medication } from '../../../../types';
import { fetchPatientMedications } from '../../../../services/clinical/medicationService';
import { useTenant } from '../../../../contexts/TenantContext';
import { BCMAAdministration } from '../../components/BCMAAdministration';
import { BarcodeGenerator } from '../../components/BarcodeGenerator';
import { useBCMA } from '../../hooks/useBCMA';
import { BBITTab } from './BBITTab';
import { MedicationHistoryView } from './MedicationHistoryView';
import { PatientActionBar } from '../../../../components/PatientActionBar';
import { calculatePreciseAge } from '../../../../utils/vitalRanges';
import { AddMedicationForm } from './AddMedicationForm';
import { EditMedicationForm } from './EditMedicationForm';
import { MedicationAdministrationGrid } from './MedicationAdministrationGrid';

interface MARModuleProps {
  patient: Patient;
  medications: Medication[];
  onMedicationUpdate: (medications: Medication[]) => void | Promise<void>;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
  onChartClick?: () => void;
  onVitalsClick?: () => void;
  onMedsClick?: () => void;
  onLabsClick?: () => void;
  onOrdersClick?: () => void;
  onHacMapClick?: () => void;
  onIOClick?: () => void;
  onNotesClick?: () => void;
  vitalsCount?: number;
  medsCount?: number;
  hasNewLabs?: boolean;
  hasNewOrders?: boolean;
  hasNewNotes?: boolean;
}

type MARView = 'administration' | 'history' | 'bbit';

export const MARModule: React.FC<MARModuleProps> = ({
  patient,
  medications,
  onMedicationUpdate,
  currentUser,
  onChartClick,
  onVitalsClick,
  onMedsClick,
  onLabsClick,
  onOrdersClick,
  onHacMapClick,
  onIOClick,
  onNotesClick,
  vitalsCount = 0,
  medsCount = 0,
  hasNewLabs = false,
  hasNewOrders = false,
  hasNewNotes = false,
}) => {
  const { currentTenant } = useTenant();
  const [activeView, setActiveView] = useState<MARView>('administration');
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [showBarcodeLabels, setShowBarcodeLabels] = useState(false);
  const [showBBITForm, setShowBBITForm] = useState(false);

  const bcma = useBCMA();

  const handleBCMAComplete = async (success: boolean, log?: any) => {
    if (success && log) {
      try {
        const freshMedications = await fetchPatientMedications(patient.id, currentTenant?.simulation_id);
        if (typeof onMedicationUpdate === 'function') {
          await onMedicationUpdate(freshMedications);
        }
      } catch (_error) {
        // swallow – stale data is tolerable; user can refresh
      }
    }
    bcma.cancelBCMAProcess();
  };

  useEffect(() => {
    const handleGlobalBarcodeScanned = (event: CustomEvent) => {
      if (bcma.state.isActive) {
        bcma.handleBarcodeScanned(event.detail.barcode);
      }
    };
    document.addEventListener('barcodescanned', handleGlobalBarcodeScanned as any);
    return () => {
      document.removeEventListener('barcodescanned', handleGlobalBarcodeScanned as any);
    };
  }, [bcma]);

  const ageBandLabels: Record<string, string> = {
    NEWBORN: 'Newborn (0-28 days)',
    INFANT: 'Infant (1-12 months)',
    TODDLER: 'Toddler (1-3 years)',
    PRESCHOOL: 'Preschool (3-5 years)',
    SCHOOL_AGE: 'School Age (6-12 years)',
    ADOLESCENT: 'Adolescent (13-18 years)',
    ADULT: 'Adult (18+ years)',
  };

  return (
    <div className="space-y-6 px-4 py-4">
      {/* Patient Action Bar */}
      <PatientActionBar
        onChartClick={onChartClick}
        onVitalsClick={onVitalsClick}
        onMedsClick={onMedsClick}
        onLabsClick={onLabsClick}
        onOrdersClick={onOrdersClick}
        onHacMapClick={onHacMapClick}
        onIOClick={onIOClick}
        onNotesClick={onNotesClick}
        vitalsCount={vitalsCount}
        medsCount={medsCount}
        hasNewLabs={hasNewLabs}
        hasNewOrders={hasNewOrders}
        hasNewNotes={hasNewNotes}
        activeAction="meds"
      />

      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div>
          {activeView === 'bbit' ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <button
                  onClick={() => setActiveView('administration')}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Medication Administration Record
                </button>
              </div>
              <h2 className="text-2xl font-bold text-purple-700">
                BBIT
                <span className="text-lg font-normal text-purple-500 ml-2">Basal-Bolus Insulin Therapy</span>
              </h2>
              <p className="text-gray-600 mt-0.5">
                Patient: {patient.first_name} {patient.last_name} ({patient.patient_id})
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Medication Administration Record</h2>
              <div className="flex items-center gap-3">
                <p className="text-gray-600">
                  Patient: {patient.first_name} {patient.last_name} ({patient.patient_id})
                </p>
                {patient.date_of_birth && (() => {
                  const ageInfo = calculatePreciseAge(patient.date_of_birth);
                  return (
                    <span className="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full">
                      {ageBandLabels[ageInfo.ageBand]}
                    </span>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {activeView === 'bbit' && (
          <button
            onClick={() => setShowBBITForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center"
          >
            <Droplets className="h-4 w-4 mr-2" />
            New Entry
          </button>
        )}
      </div>

      {/* Tab bar — hidden in BBIT sub-view */}
      {activeView !== 'bbit' && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveView('administration')}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeView === 'administration'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Pill className="h-3.5 w-3.5" />
            Administration
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeView === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            History
          </button>
          <button
            onClick={() => setActiveView('bbit')}
            className="px-5 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
          >
            <Droplets className="h-3.5 w-3.5" />
            BBIT Chart
          </button>
        </div>
      )}

      {/* Barcode Labels Section */}
      {showBarcodeLabels && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Printable Barcode Labels</h3>
            <button
              onClick={() => setShowBarcodeLabels(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarcodeGenerator
              data={bcma.generatePatientBarcode(patient)}
              type="patient"
              label={`${patient.first_name} ${patient.last_name} - ${patient.patient_id}`}
            />
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Active Medications</h4>
              {medications.filter((m) => m.status === 'Active').slice(0, 3).map((med) => (
                <BarcodeGenerator
                  key={med.id}
                  data={bcma.generateMedicationBarcode(med)}
                  type="medication"
                  label={`${med.name} - ${med.dosage}`}
                />
              ))}
              {medications.filter((m) => m.status === 'Active').length > 3 && (
                <p className="text-sm text-gray-500">
                  ... and {medications.filter((m) => m.status === 'Active').length - 3} more medications
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Content */}
      {activeView === 'administration' && (
        <MedicationAdministrationGrid
          patient={patient}
          medications={medications}
          currentUser={currentUser}
          onMedicationUpdate={onMedicationUpdate}
          onAddClick={() => setShowAddMedication(true)}
          onEditClick={(med) => {
            setEditingMedication(med);
            setShowEditForm(true);
          }}
          onBCMAStart={(p, med) => bcma.startBCMAProcess(p, med)}
        />
      )}

      {activeView === 'history' && (
        <MedicationHistoryView
          patientId={patient.patient_id}
          patientName={`${patient.first_name} ${patient.last_name}`}
        />
      )}

      {activeView === 'bbit' && (
        <BBITTab
          patient={patient}
          currentUser={currentUser}
          externalShowForm={showBBITForm}
          onExternalFormClose={() => setShowBBITForm(false)}
        />
      )}

      {/* Add Medication Modal */}
      {showAddMedication && (
        <AddMedicationForm
          patient={patient}
          currentMedications={medications}
          onMedicationAdded={onMedicationUpdate}
          onClose={() => setShowAddMedication(false)}
        />
      )}

      {/* Edit Medication Modal */}
      {showEditForm && editingMedication && (
        <EditMedicationForm
          medication={editingMedication}
          medications={medications}
          onMedicationUpdated={onMedicationUpdate}
          onClose={() => {
            setShowEditForm(false);
            setEditingMedication(null);
          }}
        />
      )}

      {/* BCMA Administration Modal */}
      {bcma.state.isActive && bcma.state.currentMedication && (
        <BCMAAdministration
          patient={patient}
          medication={bcma.state.currentMedication}
          currentUser={currentUser || { id: 'system', name: 'System User', role: 'nurse' }}
          onAdministrationComplete={handleBCMAComplete}
          onCancel={() => bcma.cancelBCMAProcess()}
        />
      )}
    </div>
  );
};
