/**
 * Modular Vitals Module
 * 
 * This module provides a self-contained vitals management system with:
 * - Dynamic form generation from JSON schemas
 * - Vitals collection with real-time validation
 * - Trend analysis and historical views
 * - Clinical alerts and safety checks
 * - Integration with existing patient data
 */

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Plus, AlertTriangle } from 'lucide-react';
import { VitalsTrends } from '../../components/Patients/vitals/VitalsTrends';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { schemaEngine } from '../../lib/schemaEngine';
import { vitalsEntrySchema, vitalsReviewSchema } from '../../schemas/vitalsSchemas';
import { Patient, VitalSigns } from '../../types';
import { FormData, ValidationResult, FormGenerationContext } from '../../types/schema';

interface VitalsModuleProps {
  patient: Patient;
  vitals: VitalSigns[];
  onVitalsUpdate: (vitals: VitalSigns[]) => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

type VitalsView = 'entry' | 'review' | 'trends';

export const VitalsModule: React.FC<VitalsModuleProps> = ({
  patient,
  vitals,
  onVitalsUpdate,
  currentUser
}) => {
  const [activeView, setActiveView] = useState<VitalsView>('entry');
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Register schemas on component mount
  useEffect(() => {
    schemaEngine.registerSchema(vitalsEntrySchema);
    schemaEngine.registerSchema(vitalsReviewSchema);
  }, []);

  // Generate form context with patient and clinical data
  const generateFormContext = (): FormGenerationContext => {
    return {
      patient: {
        id: patient.id,
        age: calculateAge(patient.date_of_birth),
        gender: patient.gender,
        allergies: patient.allergies,
        currentMedications: patient.medications?.map(m => m.name) || [],
        condition: patient.condition
      },
      user: currentUser ? {
        id: currentUser.id,
        role: currentUser.role,
        department: 'nursing',
        permissions: ['vitals_entry', 'vitals_review']
      } : undefined,
      clinical: {
        currentVitals: vitals[0] || null,
        recentAssessments: [],
        activeMedications: patient.medications || []
      },
      form: {
        mode: 'create',
        autoSave: true
      }
    };
  };

  // Handle vitals form submission
  const handleVitalsSubmission = async (data: FormData, validation: ValidationResult) => {
    if (!validation.valid) {
      console.error('Form validation failed:', validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      // Convert form data to VitalSigns format
      const newVitals: VitalSigns = {
        temperature: data.vitalSigns.temperature,
        bloodPressure: {
          systolic: data.vitalSigns.bloodPressure.systolic,
          diastolic: data.vitalSigns.bloodPressure.diastolic
        },
        heartRate: data.vitalSigns.heartRate,
        respiratoryRate: data.vitalSigns.respiratoryRate,
        oxygenSaturation: data.vitalSigns.oxygenSaturation,
        lastUpdated: new Date().toISOString()
      };

      // Update vitals through parent component
      const updatedVitals = [newVitals, ...vitals];
      onVitalsUpdate(updatedVitals);

      // Check for clinical alerts
      if (validation.clinicalAlerts && validation.clinicalAlerts.length > 0) {
        setAlerts(validation.clinicalAlerts);
      }

      // Show success message
      setSuccessMessage(`Vital signs recorded successfully at ${new Date().toLocaleTimeString()}`);
      setShowSuccessMessage(true);
      console.log('Vitals recorded successfully');
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } catch (error) {
      console.error('Error recording vitals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form changes for real-time feedback
  const handleFormChange = (data: FormData, field: string) => {
    // Real-time form updates could trigger preview updates here
    console.log('Form field changed:', field, data[field]);
  };

  // Handle validation changes for real-time alerts
  const handleValidationChange = (validation: ValidationResult) => {
    if (validation.clinicalAlerts) {
      setAlerts(validation.clinicalAlerts);
    }
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

  // Render vitals summary card
  const renderVitalsSummary = () => {
    if (vitals.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vital Signs Recorded</h3>
          <p className="text-gray-600">Use the form below to record the first set of vital signs.</p>
        </div>
      );
    }

    const latestVitals = vitals[0];
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Latest Vital Signs</h3>
          <span className="text-sm text-gray-500">
            {new Date(latestVitals.lastUpdated || '').toLocaleString()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Temperature</p>
            <p className="text-xl font-semibold text-gray-900">
              {latestVitals.temperature?.toFixed(1)}°C
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Heart Rate</p>
            <p className="text-xl font-semibold text-gray-900">
              {latestVitals.heartRate} BPM
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Blood Pressure</p>
            <p className="text-xl font-semibold text-gray-900">
              {latestVitals.bloodPressure.systolic}/{latestVitals.bloodPressure.diastolic}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">O2 Saturation</p>
            <p className="text-xl font-semibold text-gray-900">
              {latestVitals.oxygenSaturation}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Respiratory Rate</p>
            <p className="text-xl font-semibold text-gray-900">
              {latestVitals.respiratoryRate}/min
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render success message
  const renderSuccessMessage = () => {
    if (!showSuccessMessage) return null;

    return (
      <div className="mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
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
      </div>
    );
  };

  // Render clinical alerts
  const renderAlerts = () => {
    if (alerts.length === 0) return null;

    return (
      <div className="mb-6">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 mb-2 flex items-start space-x-3 ${
              alert.severity === 'critical' 
                ? 'bg-red-50 border-red-200' 
                : alert.severity === 'high'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <AlertTriangle 
              className={`h-5 w-5 mt-0.5 ${
                alert.severity === 'critical' 
                  ? 'text-red-600' 
                  : alert.severity === 'high'
                  ? 'text-orange-600'
                  : 'text-yellow-600'
              }`} 
            />
            <div className="flex-1">
              <p className={`font-medium ${
                alert.severity === 'critical' 
                  ? 'text-red-800' 
                  : alert.severity === 'high'
                  ? 'text-orange-800'
                  : 'text-yellow-800'
              }`}>
                {alert.message}
              </p>
              {alert.recommendedAction && (
                <p className={`text-sm mt-1 ${
                  alert.severity === 'critical' 
                    ? 'text-red-700' 
                    : alert.severity === 'high'
                    ? 'text-orange-700'
                    : 'text-yellow-700'
                }`}>
                  <strong>Action:</strong> {alert.recommendedAction}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vital Signs Management</h2>
          <p className="text-gray-600">Patient: {patient.first_name} {patient.last_name} ({patient.patient_id})</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('entry')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'entry'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Record Vitals
          </button>
          <button
            onClick={() => setActiveView('review')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'review'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Review
          </button>
          <button
            onClick={() => setActiveView('trends')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'trends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Trends
          </button>
        </div>
      </div>

      {/* Clinical Alerts */}
      {renderAlerts()}

      {/* Success Message */}
      {renderSuccessMessage()}

      {/* Current View Content */}
      {activeView === 'entry' && (
        <div className="space-y-6">
          {renderVitalsSummary()}
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Record New Vital Signs</h3>
            <DynamicForm
              schemaId="vitals-entry-v1"
              initialData={{
                patientId: patient.patient_id,
                recordedBy: currentUser?.name || ''
              }}
              context={generateFormContext()}
              onSubmit={handleVitalsSubmission}
              onChange={handleFormChange}
              onValidationChange={handleValidationChange}
              autoSave={false}
              className="max-w-none"
            />
          </div>
        </div>
      )}

      {activeView === 'review' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Vitals Review & Analysis</h3>
          <DynamicForm
            schemaId="vitals-review-v1"
            initialData={{
              patientId: patient.patient_id
            }}
            context={generateFormContext()}
            readOnly={false}
            className="max-w-none"
          />
        </div>
      )}

      {activeView === 'trends' && (
        <VitalsTrends
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setActiveView('entry')}
          onRecordVitals={() => setActiveView('entry')}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-900">Recording vital signs...</span>
          </div>
        </div>
      )}
    </div>
  );
};
