/**
 * Modular MAR (Medication Administration Record) Module
 * 
 * This module provides a self-contained medication administration  // Handle medication reconciliation form submission
  const handleMedicationReconciliation = async (data: any, validation: ValidationResult) => {ystem with:
 * - Dynamic form generation for medication administration
 * - Safety checks and allergy validation
 * - Drug interaction checking
 * - Medication reconciliation
 * - Integration with existing medication data
 */

import React, { useState, useEffect } from 'react';
import { Pill, Clock, AlertTriangle, CheckCircle, Plus, Syringe, Calendar, Shield, QrCode, Droplets } from 'lucide-react';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { schemaEngine } from '../../lib/schemaEngine';
import { medicationAdministrationSchema, medicationReconciliationSchema } from '../../schemas/medicationSchemas';
import { Patient, Medication } from '../../types';
import { ValidationResult, FormGenerationContext } from '../../types/schema';
import { createMedication } from '../../lib/medicationService';
import { BCMAAdministration } from '../../components/bcma/BCMAAdministration';
import { BarcodeGenerator } from '../../components/bcma/BarcodeGenerator';
import { useBCMA } from '../../hooks/useBCMA';
import DiabeticRecordModule from '../../components/DiabeticRecordModule';

type MedicationCategory = 'prn' | 'scheduled' | 'continuous';

interface MARModuleProps {
  patient: Patient;
  medications: Medication[];
  onMedicationUpdate: (medications: Medication[]) => void | Promise<void>;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

type MARView = 'administration' | 'reconciliation' | 'history' | 'diabetic-record' | 'add-medication';

export const MARModule: React.FC<MARModuleProps> = ({
  patient,
  medications,
  onMedicationUpdate,
  currentUser
}) => {
  const [activeView, setActiveView] = useState<MARView>('administration');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<MedicationCategory | 'All'>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showBarcodeLabels, setShowBarcodeLabels] = useState(false);

  // BCMA Integration
  const bcma = useBCMA();

  // Register schemas on component mount
  useEffect(() => {
    schemaEngine.registerSchema(medicationAdministrationSchema);
    schemaEngine.registerSchema(medicationReconciliationSchema);
  }, []);

  // Generate form context with patient and medication data
  const generateFormContext = (): FormGenerationContext => {
    return {
      patient: {
        id: patient.id,
        age: calculateAge(patient.date_of_birth),
        gender: patient.gender,
        allergies: patient.allergies,
        currentMedications: medications.map(m => m.name),
        condition: patient.condition
      },
      user: currentUser ? {
        id: currentUser.id,
        role: currentUser.role,
        department: 'nursing',
        permissions: ['medication_administration', 'medication_reconciliation']
      } : undefined,
      clinical: {
        currentVitals: patient.vitals[0] || null,
        recentAssessments: [],
        activeMedications: medications.filter(m => m.status === 'Active')
      },
      form: {
        mode: 'create',
        autoSave: false
      }
    };
  };

  // Handle BCMA administration completion
  const handleBCMAComplete = async (success: boolean, log?: any) => {
    if (success && log && selectedMedication) {
      // Update medication with new administration record
      const updatedMedications = medications.map(med => {
        if (med.id === selectedMedication.id) {
          return {
            ...med,
            last_administered: log.timestamp,
            next_due: log.next_due || med.next_due,
            administrations: [...(med.administrations || []), log]
          };
        }
        return med;
      });

      onMedicationUpdate(updatedMedications);
      setSelectedMedication(null);
      bcma.cancelBCMAProcess();

      // Show success message
      setSuccessMessage(`${selectedMedication.name} administered successfully via BCMA`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);

      console.log('BCMA administration completed:', log);
    } else {
      bcma.cancelBCMAProcess();
      setSelectedMedication(null);
    }
  };

  // Handle barcode scanning integration
  useEffect(() => {
    const handleGlobalBarcodeScanned = (event: CustomEvent) => {
      if (bcma.state.isActive) {
        bcma.handleBarcodeScanned(event.detail.barcode);
      }
    };

    // Listen for barcode events from your existing scanning infrastructure
    document.addEventListener('barcodescanned', handleGlobalBarcodeScanned as EventListener);

    return () => {
      document.removeEventListener('barcodescanned', handleGlobalBarcodeScanned as EventListener);
    };
  }, [bcma]);

  // Handle medication administration form submission
  const handleMedicationAdministration = async (data: any, validation: ValidationResult) => {
    if (!validation.valid) {
      console.error('Form validation failed:', validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      // Create medication administration record
      const administrationRecord = {
        id: `admin-${Date.now()}`,
        medication_id: data.medicationId,
        patient_id: patient.id,
        administered_by: currentUser?.name || data.administeredBy,
        administered_by_id: currentUser?.id,
        timestamp: data.administrationTime,
        notes: data.notes
      };

      // Update medication with administration record
      const updatedMedications = medications.map(med => {
        if (med.id === data.medicationId) {
          return {
            ...med,
            last_administered: data.administrationTime,
            administrations: [...(med.administrations || []), administrationRecord]
          };
        }
        return med;
      });

      onMedicationUpdate(updatedMedications);

      // Check for clinical alerts
      // Check for clinical alerts
      if (validation.clinicalAlerts && validation.clinicalAlerts.length > 0) {
        console.log('Clinical alerts detected:', validation.clinicalAlerts);
      }
      console.log('Medication administration recorded successfully');
    } catch (error) {
      console.error('Error recording medication administration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle medication reconciliation
  const handleMedicationReconciliation = async (data: any, validation: ValidationResult) => {
    if (!validation.valid) return;

    setIsLoading(true);
    try {
      // Process reconciliation data
      console.log('Processing medication reconciliation:', data);
      // Implementation would handle reconciliation logic
    } catch (error) {
      console.error('Error processing reconciliation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding new medication
  const handleAddMedication = async (data: any, validation: ValidationResult) => {
    if (!validation.valid) {
      console.error('Form validation failed:', validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      // Create medication data object for database
      const medicationData: Omit<Medication, 'id'> = {
        patient_id: patient.id,
        name: data.name,
        dosage: data.dosage,
        route: data.route,
        frequency: data.frequency,
        category: data.category as MedicationCategory,
        status: 'Active',
        prescribed_by: data.prescribed_by,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        next_due: data.category === 'prn' ? new Date().toISOString() : calculateNextDue(data.frequency),
        last_administered: undefined
      };

      console.log('Creating medication in database:', medicationData);
      
      // Save to database using the medication service
      const savedMedication = await createMedication(medicationData);
      
      console.log('Medication saved to database successfully:', savedMedication);

      // Update local state with the saved medication (which now has a real database ID)
      const updatedMedications = [...medications, savedMedication];
      onMedicationUpdate(updatedMedications);

      // Show success message
      setSuccessMessage(`${data.category} medication "${data.name}" added successfully`);
      setShowSuccessMessage(true);
      setShowAddMedication(false);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);

      console.log('New medication added and persisted successfully');
    } catch (error) {
      console.error('Error adding medication:', error);
      
      // Show error message to user
      setSuccessMessage(`Error adding medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowSuccessMessage(true);
      
      // Hide error message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate next due time based on frequency
  const calculateNextDue = (frequency: string): string => {
    const now = new Date();
    const frequencyMap: { [key: string]: number } = {
      'Once daily': 24 * 60 * 60 * 1000,
      'Twice daily': 12 * 60 * 60 * 1000,
      'Three times daily': 8 * 60 * 60 * 1000,
      'Four times daily': 6 * 60 * 60 * 1000,
      'Every 4 hours': 4 * 60 * 60 * 1000,
      'Every 6 hours': 6 * 60 * 60 * 1000,
      'Every 8 hours': 8 * 60 * 60 * 1000,
      'Every 12 hours': 12 * 60 * 60 * 1000
    };
    
    const interval = frequencyMap[frequency] || 24 * 60 * 60 * 1000; // Default to daily
    return new Date(now.getTime() + interval).toISOString();
  };

  // Calculate age from birth date
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Render medication list with category filtering
  const renderMedicationList = () => {
    const activeMedications = medications.filter(med => med.status === 'Active');
    
    // Filter by category
    const filteredMedications = activeCategoryFilter === 'All' 
      ? activeMedications
      : activeMedications.filter(med => med.category === activeCategoryFilter);

    if (medications.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Medications</h3>
          <p className="text-gray-600">Patient has no medications on record.</p>
          <button
            onClick={() => setShowAddMedication(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Medication</span>
          </button>
        </div>
      );
    }

    // Group medications by category
    const groupedMedications = {
      prn: filteredMedications.filter(med => med.category === 'prn'),
      scheduled: filteredMedications.filter(med => med.category === 'scheduled'),
      continuous: filteredMedications.filter(med => med.category === 'continuous')
    };

    return (
      <div className="space-y-6">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['All', 'prn', 'scheduled', 'continuous'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategoryFilter(category)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeCategoryFilter === category
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {category === 'prn' && <Clock className="h-4 w-4" />}
                {category === 'scheduled' && <Calendar className="h-4 w-4" />}
                {category === 'continuous' && <Syringe className="h-4 w-4" />}
                <span>
                  {category === 'All' ? 'All' : 
                   category === 'prn' ? 'PRN (As Needed)' :
                   category === 'scheduled' ? 'Scheduled' :
                   'IV/Continuous'}
                </span>
                <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                  {category === 'All' ? activeMedications.length : groupedMedications[category as keyof typeof groupedMedications]?.length || 0}
                </span>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowAddMedication(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medication</span>
          </button>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-800">Success!</p>
              <p className="text-sm text-green-700 mt-1">{successMessage}</p>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="flex-shrink-0 text-green-400 hover:text-green-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Medication Categories */}
        {activeCategoryFilter === 'All' ? (
          // Show all categories
          <div className="space-y-6">
            {Object.entries(groupedMedications).map(([categoryKey, categoryMeds]) => {
              if (categoryMeds.length === 0) return null;
              
              const categoryInfo = {
                prn: { 
                  title: 'PRN (As Needed)', 
                  icon: Clock, 
                  color: 'blue',
                  description: 'No alerts - administer as needed',
                  bgColor: 'bg-blue-50',
                  borderColor: 'border-blue-200'
                },
                scheduled: { 
                  title: 'Scheduled Medications', 
                  icon: Calendar, 
                  color: 'green',
                  description: 'Time-based alerts enabled',
                  bgColor: 'bg-green-50',
                  borderColor: 'border-green-200'
                },
                continuous: { 
                  title: 'IV/Continuous', 
                  icon: Syringe, 
                  color: 'red',
                  description: 'Critical alerts enabled',
                  bgColor: 'bg-red-50',
                  borderColor: 'border-red-200'
                }
              };
              
              const info = categoryInfo[categoryKey as keyof typeof categoryInfo];
              const IconComponent = info.icon;
              
              return (
                <div key={categoryKey} className={`${info.bgColor} ${info.borderColor} border rounded-lg`}>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`h-5 w-5 text-${info.color}-600`} />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{info.title}</h3>
                          <p className="text-sm text-gray-600">{info.description}</p>
                        </div>
                      </div>
                      <span className={`bg-${info.color}-100 text-${info.color}-800 px-3 py-1 rounded-full text-sm font-medium`}>
                        {categoryMeds.length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {categoryMeds.map((medication) => renderMedicationItem(medication, categoryKey as MedicationCategory))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Show filtered category
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {activeCategoryFilter === 'prn' ? 'PRN (As Needed)' :
                 activeCategoryFilter === 'scheduled' ? 'Scheduled Medications' :
                 'IV/Continuous Medications'}
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredMedications.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No medications in this category</p>
                </div>
              ) : (
                filteredMedications.map((medication) => renderMedicationItem(medication, activeCategoryFilter as MedicationCategory))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render individual medication item
  const renderMedicationItem = (medication: Medication, category: MedicationCategory) => {
    const isDue = medication.next_due && new Date(medication.next_due) <= new Date();
    const isOverdue = medication.next_due && new Date(medication.next_due) < new Date(Date.now() - 30 * 60 * 1000); // 30 min overdue
    
    // Determine alert level based on category
    const shouldAlert = category === 'scheduled' || category === 'continuous';
    const alertLevel = category === 'continuous' ? 'critical' : 'standard';
    
    return (
      <div
        key={medication.id}
        className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
          selectedMedication?.id === medication.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
        }`}
        onClick={() => setSelectedMedication(medication)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h4 className="text-lg font-medium text-gray-900">
                {medication.name}
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                category === 'prn' ? 'bg-blue-100 text-blue-800' :
                category === 'scheduled' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {category === 'prn' ? 'PRN' : 
                 category === 'scheduled' ? 'Scheduled' : 
                 'IV/Continuous'}
              </span>
              {shouldAlert && isDue && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                  isOverdue && alertLevel === 'critical' 
                    ? 'bg-red-100 text-red-800' 
                    : isOverdue 
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <AlertTriangle className="h-3 w-3" />
                  <span>{isOverdue ? 'OVERDUE' : 'DUE'}</span>
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {medication.dosage} • {medication.route} • {medication.frequency}
            </p>
            {medication.next_due && category !== 'prn' && (
              <p className="text-sm text-gray-500 mt-1">
                Next due: {new Date(medication.next_due).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Prescribed by: {medication.prescribed_by}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(medication.start_date).toLocaleDateString()} - {
                  medication.end_date ? new Date(medication.end_date).toLocaleDateString() : 'Ongoing'
                }
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('🔵 BCMA Button clicked for medication:', medication.name);
                  console.log('🔵 Current user:', currentUser);
                  console.log('🔵 BCMA state before:', bcma.state);
                  bcma.startBCMAProcess(patient, medication);
                  console.log('🔵 BCMA state after:', bcma.state);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                  shouldAlert && isDue 
                    ? (isOverdue && alertLevel === 'critical' 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-orange-500 text-white hover:bg-orange-600')
                    : category === 'prn'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title="BCMA - Barcode Administration"
              >
                <QrCode className="h-4 w-4" />
                <span>{category === 'prn' ? 'Give PRN' : 'Administer'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render clinical alerts - placeholder for future implementation
  const renderAlerts = () => {
    return null; // No alerts system implemented yet
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medication Administration Record</h2>
          <p className="text-gray-600">Patient: {patient.first_name} {patient.last_name} ({patient.patient_id})</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('administration')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'administration'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Pill className="h-4 w-4 inline mr-2" />
            Administration
          </button>
          <button
            onClick={() => setActiveView('reconciliation')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'reconciliation'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Reconciliation
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            History
          </button>
          <button
            onClick={() => setActiveView('diabetic-record')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'diabetic-record'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Droplets className="h-4 w-4 inline mr-2" />
            Diabetic Record
          </button>
          
          <button
            onClick={() => setShowBarcodeLabels(!showBarcodeLabels)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            title="Show/Hide Barcode Labels"
          >
            <QrCode className="h-4 w-4" />
            <span>Labels</span>
          </button>
        </div>
      </div>

      {/* Clinical Alerts */}
      {renderAlerts()}

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
            {/* Patient Barcode */}
            <BarcodeGenerator
              data={bcma.generatePatientBarcode(patient)}
              type="patient"
              label={`${patient.first_name} ${patient.last_name} - ${patient.patient_id}`}
            />
            
            {/* Medication Barcodes */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Active Medications</h4>
              {medications.filter(med => med.status === 'Active').slice(0, 3).map(medication => (
                <BarcodeGenerator
                  key={medication.id}
                  data={bcma.generateMedicationBarcode(medication)}
                  type="medication"
                  label={`${medication.name} - ${medication.dosage}`}
                />
              ))}
              {medications.filter(med => med.status === 'Active').length > 3 && (
                <p className="text-sm text-gray-500">
                  ... and {medications.filter(med => med.status === 'Active').length - 3} more medications
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current View Content */}
      {activeView === 'administration' && (
        <div className="space-y-6">
          {renderMedicationList()}
          
          {selectedMedication && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Administer: {selectedMedication.name}
              </h3>
              <DynamicForm
                schemaId="medication-administration-v1"
                initialData={{
                  patientId: patient.patient_id,
                  medicationId: selectedMedication.id,
                  dosage: selectedMedication.dosage,
                  route: selectedMedication.route,
                  administeredBy: currentUser?.name || '',
                  administrationTime: new Date().toISOString().slice(0, 16)
                }}
                context={generateFormContext()}
                onSubmit={(data, validation) => {
                  handleMedicationAdministration(data, validation);
                }}
                autoSave={false}
                className="max-w-none"
              />
            </div>
          )}
        </div>
      )}

      {activeView === 'reconciliation' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Medication Reconciliation</h3>
          <DynamicForm
            schemaId="medication-reconciliation-v1"
            initialData={{
              patientId: patient.patient_id
            }}
            context={generateFormContext()}
            onSubmit={(data, validation) => {
              handleMedicationReconciliation(data, validation);
            }}
            className="max-w-none"
          />
        </div>
      )}

      {activeView === 'history' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Administration History</h3>
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Administration history would be displayed here</p>
            <p className="text-sm text-gray-500 mt-2">
              Historical medication administration records and patterns
            </p>
          </div>
        </div>
      )}

      {activeView === 'diabetic-record' && (
        <DiabeticRecordModule 
          patientId={patient.patient_id} 
          patientName={`${patient.first_name} ${patient.last_name}`}
        />
      )}

      {/* Add Medication Modal */}
      {showAddMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Add New Medication</h3>
                <button
                  onClick={() => setShowAddMedication(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                handleAddMedication(data as any, { valid: true, errors: [], warnings: [] });
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter medication name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="prn">PRN (As Needed) - No alerts</option>
                    <option value="scheduled">Scheduled - Time-based alerts</option>
                    <option value="continuous">IV/Continuous - Critical alerts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    name="dosage"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10mg, 5ml"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route *
                  </label>
                  <select
                    name="route"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select route</option>
                    <option value="Oral">Oral</option>
                    <option value="IV">Intravenous (IV)</option>
                    <option value="IM">Intramuscular (IM)</option>
                    <option value="SC">Subcutaneous (SC)</option>
                    <option value="Topical">Topical</option>
                    <option value="Inhalation">Inhalation</option>
                    <option value="Rectal">Rectal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    name="frequency"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Four times daily">Four times daily</option>
                    <option value="Every 6 hours">Every 6 hours</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="Every 12 hours">Every 12 hours</option>
                    <option value="As needed">As needed (PRN)</option>
                    <option value="Continuous">Continuous infusion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prescribed By *
                  </label>
                  <input
                    type="text"
                    name="prescribed_by"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dr. Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMedication(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Medication
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-900">Processing medication administration...</span>
          </div>
        </div>
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
