/**
 * Integration Example for Modular Patient System
 * 
 * This file demonstrates how to integrate the new modular patient management
 * system with the existing PatientDetail component. It shows three integration approaches:
 * 
 * 1. Adding a new "Modern" tab to existing PatientDetail
 * 2. Using ModernPatientManagement as a replacement
 * 3. Gradual migration strategy
 */

import React from 'react';
import { ModernPatientManagement } from '../components/ModernPatientManagement';
import { Patient } from '../types';

// Example of how to add a new tab to the existing PatientDetail component
export const enhancePatientDetailWithModularSystem = () => {
  /*
   * To integrate with existing PatientDetail.tsx, add this to the tabs array:
   * 
   * { id: 'modern', label: 'Modern System', icon: Sparkles }
   * 
   * Then in the renderTabContent() switch statement, add:
   * 
   * case 'modern':
   *   return (
   *     <ModernPatientManagement
   *       patient={patient}
   *       onPatientUpdate={(data) => {
   *         // Update patient state with new data
   *         setPatient(prev => ({ ...prev, ...data }));
   *       }}
   *       mode="tab"
   *       currentUser={currentUser}
   *     />
   *   );
   */
  
  return `
// Add to PatientDetail.tsx imports:
import { ModernPatientManagement } from '../ModernPatientManagement';
import { Sparkles } from 'lucide-react';

// Add to tabs array:
const tabs = [
  // ... existing tabs
  { id: 'modern', label: 'Modern System', icon: Sparkles }
];

// Add to renderTabContent() switch:
case 'modern':
  return (
    <ModernPatientManagement
      patient={patient}
      onPatientUpdate={(data) => {
        setPatient(prev => ({ ...prev, ...data }));
        // Optionally sync with backend
      }}
      mode="tab"
      currentUser={{
        id: 'current-user-id',
        name: 'Current User',
        role: 'nurse',
        department: 'nursing'
      }}
    />
  );
  `;
};

// Example wrapper component for complete replacement
interface EnhancedPatientDetailProps {
  patientId: string;
  useModularSystem?: boolean;
  onPatientUpdate?: (patient: Patient) => void;
}

export const EnhancedPatientDetail: React.FC<EnhancedPatientDetailProps> = ({
  patientId,
  useModularSystem = false,
  onPatientUpdate
}) => {
  // This would load patient data (simplified for example)
  const patient: Patient = {
    id: patientId,
    patient_id: patientId,
    first_name: 'Example',
    last_name: 'Patient',
    date_of_birth: '1980-01-01',
    gender: 'Other',
    condition: 'Stable',
    admission_date: new Date().toISOString(),
    blood_type: 'O+',
    room_number: '101',
    bed_number: 'A',
    emergency_contact_name: 'Emergency Contact',
    emergency_contact_relationship: 'Family',
    emergency_contact_phone: '555-0123',
    assigned_nurse: 'Nurse Example',
    diagnosis: 'Example Diagnosis',
    allergies: [],
    vitals: [],
    medications: [],
    notes: []
  };

  if (useModularSystem) {
    return (
      <ModernPatientManagement
        patient={patient}
        onPatientUpdate={(data: Partial<Patient>) => {
          const updatedPatient = { ...patient, ...data };
          onPatientUpdate?.(updatedPatient);
        }}
        mode="standalone"
        currentUser={{
          id: 'user-1',
          name: 'Nurse Example',
          role: 'nurse',
          department: 'nursing'
        }}
      />
    );
  }

  // Return existing PatientDetail component (would import the actual component)
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Traditional Patient Detail</h2>
      <p className="text-gray-600">
        This would render the existing PatientDetail component.
        Set useModularSystem=true to see the new modular system.
      </p>
    </div>
  );
};

// Migration strategy helper
export const migrationStrategy = {
  // Phase 1: Add new tab alongside existing system
  phase1: {
    description: 'Add Modern System as new tab',
    changes: [
      'Add ModernPatientManagement import to PatientDetail.tsx',
      'Add new tab to tabs array',
      'Add case to renderTabContent switch',
      'Users can choose between traditional and modern'
    ]
  },

  // Phase 2: Gradual feature migration
  phase2: {
    description: 'Migrate specific features to modular system',
    changes: [
      'Replace VitalsContent with VitalsModule in assessments tab',
      'Replace MedicationAdministration with MARModule',
      'Add FormsModule for clinical assessments',
      'Maintain backward compatibility'
    ]
  },

  // Phase 3: Complete replacement
  phase3: {
    description: 'Replace PatientDetail with ModularPatientDashboard',
    changes: [
      'Update routing to use ModularPatientDashboard',
      'Migrate all existing functionality',
      'Update all references throughout the application',
      'Deprecate old PatientDetail component'
    ]
  }
};

// Example of feature flag approach
export const useModularPatientSystem = (featureFlags: { modularPatient: boolean }) => {
  return featureFlags.modularPatient;
};

// Integration helper for existing components
export const integrateWithExistingComponents = () => {
  return {
    // How to use VitalsModule in existing VitalsContent
    vitalsIntegration: `
      // Replace VitalsContent component with:
      import { VitalsModule } from '../../features/clinical/components/vitals';
      
      <VitalsModule
        patient={patient}
        onVitalsSave={(vitals) => {
          // Update vitals in existing state management
          setVitals(prev => [vitals, ...prev]);
        }}
        currentUser={currentUser}
      />
    `,

    // How to use MARModule in existing MedicationAdministration
    medicationIntegration: `
      // Replace MedicationAdministration component with:
      import { MARModule } from '../../features/clinical/components/mar';
      
      <MARModule
        patient={patient}
        onMedicationUpdate={(medications) => {
          // Update medications in existing state management
          setMedications(medications);
        }}
        currentUser={currentUser}
      />
    `,

    // How to add FormsModule to assessments
    formsIntegration: `
      // Add FormsModule as new subtab in assessments:
      import { FormsModule } from '../../features/forms';
      
      // Add to subTabs array:
      { id: 'assessments', label: 'Clinical Forms', icon: FileText }
      
      // Add to sub-tab rendering:
      {activeSubTab === 'assessments' && (
        <FormsModule
          patient={patient}
          onAssessmentSave={(assessment) => {
            // Handle assessment save
            console.log('Assessment saved:', assessment);
          }}
          currentUser={currentUser}
        />
      )}
    `
  };
};
