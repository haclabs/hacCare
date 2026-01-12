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
import { TrendingUp, Plus, AlertTriangle, TrendingDown, Minus, Activity } from 'lucide-react';
import { VitalsTrends } from '../../../../features/patients/components/vitals/VitalsTrends';
import { DynamicForm } from '../../../../components/forms/DynamicForm';
import { schemaEngine } from '../../../../lib/infrastructure/schemaEngine';
import { vitalsEntrySchema, vitalsReviewSchema } from '../../../../schemas/vitalsSchemas';
import { updatePatientVitals } from '../../../../services/patient/patientService';
import { Patient, VitalSigns } from '../../../../types';
import { FormData, ValidationResult, FormGenerationContext } from '../../types/schema';
import { PatientActionBar } from '../../../../components/PatientActionBar';
import { calculatePreciseAge, getVitalRangesForAgeBand, assessVitalSign } from '../../../../utils/vitalRanges';

interface VitalsModuleProps {
  patient: Patient;
  vitals: VitalSigns[];
  onVitalsUpdate: (vitals: VitalSigns[]) => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
  // Navigation handlers
  onChartClick?: () => void;
  onVitalsClick?: () => void;
  onMedsClick?: () => void;
  onLabsClick?: () => void;
  onOrdersClick?: () => void;
  onHacMapClick?: () => void;
  onIOClick?: () => void;
  onNotesClick?: () => void;
  // Badge data
  vitalsCount?: number;
  medsCount?: number;
  hasNewLabs?: boolean;
  hasNewOrders?: boolean;
  hasNewNotes?: boolean;
}

type VitalsView = 'trends';

export const VitalsModule: React.FC<VitalsModuleProps> = ({
  patient,
  vitals,
  onVitalsUpdate,
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
  hasNewNotes = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showTrendsDetail, setShowTrendsDetail] = useState(false);
  const [activeView] = useState<VitalsView>('trends');

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
        age: calculatePreciseAge(patient.date_of_birth).years,
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
        oxygenDelivery: data.vitalSigns.oxygenDelivery || 'Room Air',
        oxygenFlowRate: data.vitalSigns.oxygenFlowRate || 'N/A',
        lastUpdated: new Date().toISOString()
      };

      // Save vitals to database with student name
      console.log('Saving vitals to database for patient:', patient.id);
      await updatePatientVitals(patient.id, newVitals, data.studentName);
      console.log('Vitals saved to database successfully');

      // Update local state through parent component
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
      
      // Close the modal
      setShowVitalsModal(false);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } catch (error) {
      console.error('Error recording vitals:', error);
      // Show error message to user
      setAlerts([{
        severity: 'critical',
        message: 'Failed to save vital signs. Please try again.',
        recommendedAction: 'Check your connection and retry the operation.'
      }]);
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

  // Calculate precise age with age band classification
  const getPatientAgeInfo = (birthDate: string) => {
    try {
      return calculatePreciseAge(birthDate);
    } catch (error) {
      console.error('Error calculating age:', error);
      // Fallback to adult age band
      return {
        years: 25,
        months: 0,
        days: 0,
        totalDays: 9125,
        ageBand: 'ADULT' as const,
        displayString: 'Adult'
      };
    }
  };
  
  // Get age band label for display
  const getAgeBandLabel = (ageBand: string): string => {
    const labels: Record<string, string> = {
      'NEWBORN': 'Newborn (0-28 days)',
      'INFANT': 'Infant (1-12 months)',
      'TODDLER': 'Toddler (1-3 years)',
      'PRESCHOOL': 'Preschool (3-5 years)',
      'SCHOOL_AGE': 'School Age (6-12 years)',
      'ADOLESCENT': 'Adolescent (13-18 years)',
      'ADULT': 'Adult (18+ years)'
    };
    return labels[ageBand] || 'Adult (18+ years)';
  };

  // Age-based vitals analysis using new utility
  const getVitalStatus = (vitalType: string, value: number, dateOfBirth: string) => {
    // Map vital type names to assessment function parameter names
    const vitalTypeMap: Record<string, 'temperature' | 'heartRate' | 'systolic' | 'diastolic' | 'respiratoryRate' | 'oxygenSaturation'> = {
      'temperature': 'temperature',
      'heartRate': 'heartRate',
      'systolic': 'systolic',
      'diastolic': 'diastolic',
      'oxygenSaturation': 'oxygenSaturation',
      'respiratoryRate': 'respiratoryRate'
    };
    
    const mappedType = vitalTypeMap[vitalType];
    if (!mappedType) return { status: 'normal', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    
    const assessment = assessVitalSign(mappedType, value, dateOfBirth);
    
    // Convert assessment status to display properties
    if (assessment.status === 'normal') {
      return { status: 'normal', color: 'text-green-600', bgColor: 'bg-green-50' };
    } else if (assessment.status === 'abnormal') {
      return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    } else {
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50' };
    }
  };

  const getTrendDirection = (currentVital: VitalSigns, previousVital: VitalSigns | undefined, vitalType: string) => {
    if (!previousVital) return { icon: Minus, color: 'text-gray-400', trend: 'no-data' };

    let current: number, previous: number;
    
    switch (vitalType) {
      case 'heartRate':
        current = currentVital.heartRate;
        previous = previousVital.heartRate;
        break;
      case 'temperature':
        current = currentVital.temperature || 0;
        previous = previousVital.temperature || 0;
        break;
      case 'systolic':
        current = currentVital.bloodPressure.systolic;
        previous = previousVital.bloodPressure.systolic;
        break;
      case 'diastolic':
        current = currentVital.bloodPressure.diastolic;
        previous = previousVital.bloodPressure.diastolic;
        break;
      case 'oxygenSaturation':
        current = currentVital.oxygenSaturation;
        previous = previousVital.oxygenSaturation;
        break;
      case 'respiratoryRate':
        current = currentVital.respiratoryRate;
        previous = previousVital.respiratoryRate;
        break;
      default:
        return { icon: Minus, color: 'text-gray-400', trend: 'stable' };
    }

    const difference = current - previous;
    const threshold = current * 0.05; // 5% threshold for meaningful change

    if (Math.abs(difference) < threshold) {
      return { icon: Minus, color: 'text-gray-400', trend: 'stable' };
    } else if (difference > 0) {
      return { icon: TrendingUp, color: 'text-blue-500', trend: 'increasing' };
    } else {
      return { icon: TrendingDown, color: 'text-blue-500', trend: 'decreasing' };
    }
  };

  const calculateHeartRateVariability = (recentVitals: VitalSigns[]) => {
    if (recentVitals.length < 3) return null;
    
    const heartRates = recentVitals.slice(0, 10).map(v => v.heartRate);
    const mean = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
    const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / heartRates.length;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      mean: Math.round(mean),
      variability: Math.round(standardDeviation * 10) / 10,
      status: standardDeviation < 5 ? 'low' : standardDeviation > 15 ? 'high' : 'normal'
    };
  };

  // Enhanced vitals summary with color coding and trends
  const renderEnhancedVitalsSummary = () => {
    if (vitals.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vital Signs Recorded</h3>
          <p className="text-gray-600">Record vitals to see color-coded indicators and trends.</p>
        </div>
      );
    }

    const latestVitals = vitals[0];
    const previousVitals = vitals.length > 1 ? vitals[1] : undefined;
    const patientAgeInfo = getPatientAgeInfo(patient.date_of_birth || '1990-01-01');
    const patientDOB = patient.date_of_birth || '1990-01-01';
    const hrv = calculateHeartRateVariability(vitals);

    const vitalItems = [
      {
        label: 'Temperature',
        value: `${latestVitals.temperature?.toFixed(1)}°C`,
        rawValue: latestVitals.temperature || 0,
        type: 'temperature'
      },
      {
        label: 'Heart Rate',
        value: `${latestVitals.heartRate} BPM`,
        rawValue: latestVitals.heartRate,
        type: 'heartRate'
      },
      {
        label: 'Blood Pressure',
        value: `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}`,
        rawValue: latestVitals.bloodPressure.systolic,
        type: 'systolic'
      },
      {
        label: 'O2 Saturation',
        value: `${latestVitals.oxygenSaturation}%`,
        subtitle: latestVitals.oxygenFlowRate && latestVitals.oxygenFlowRate !== 'N/A'
          ? `${latestVitals.oxygenDelivery || 'Room Air'} @ ${latestVitals.oxygenFlowRate.replace('L', ' L/min')}`
          : latestVitals.oxygenDelivery || 'Room Air',
        rawValue: latestVitals.oxygenSaturation,
        type: 'oxygenSaturation'
      },
      {
        label: 'Respiratory Rate',
        value: `${latestVitals.respiratoryRate}/min`,
        rawValue: latestVitals.respiratoryRate,
        type: 'respiratoryRate'
      }
    ];

    return (
      <div className="space-y-6">
        {/* Main Vitals Grid */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Latest Vital Signs</h3>
              <p className="text-sm text-blue-600 font-medium mt-1">{getAgeBandLabel(patientAgeInfo.ageBand)}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTrendsDetail(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                View Trends
              </button>
              <span className="text-sm text-gray-500">
                {new Date(latestVitals.lastUpdated || '').toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {vitalItems.map((vital) => {
              const status = getVitalStatus(vital.type, vital.rawValue, patientDOB);
              const trend = getTrendDirection(latestVitals, previousVitals, vital.type);
              const TrendIcon = trend.icon;

              return (
                <div key={vital.type} className={`${status.bgColor} border border-gray-200 rounded-lg p-4 text-center relative`}>
                  <div className="absolute top-2 right-2">
                    <TrendIcon className={`h-4 w-4 ${trend.color}`} />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{vital.label}</p>
                  <p className={`text-xl font-semibold ${status.color}`}>
                    {vital.value}
                  </p>
                  {vital.subtitle && (
                    <p className="text-xs text-red-600 font-medium mt-1">{vital.subtitle}</p>
                  )}
                  <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
                    status.status === 'normal' ? 'bg-green-100 text-green-700' :
                    status.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {status.status.toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heart Rate Variability */}
        {hrv && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Activity className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="text-lg font-medium text-gray-900">Heart Rate Variability</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Average HR</p>
                <p className="text-2xl font-semibold text-gray-900">{hrv.mean}</p>
                <p className="text-xs text-gray-500">BPM</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Variability</p>
                <p className="text-2xl font-semibold text-gray-900">{hrv.variability}</p>
                <p className="text-xs text-gray-500">SD</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Status</p>
                <div className={`text-lg font-semibold px-3 py-1 rounded-full inline-block ${
                  hrv.status === 'normal' ? 'bg-green-100 text-green-700' :
                  hrv.status === 'low' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {hrv.status.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>HRV Insight:</strong> {
                  hrv.status === 'normal' ? 'Heart rate variability is within normal range, indicating good cardiovascular health.' :
                  hrv.status === 'low' ? 'Low variability may indicate stress or fatigue. Consider rest and monitoring.' :
                  'High variability detected. May indicate irregular heart rhythm - consider further assessment.'
                }
              </p>
            </div>
          </div>
        )}
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
        activeAction="vitals"
      />

      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vital Signs Management</h2>
          <p className="text-gray-600">Patient: {patient.first_name} {patient.last_name} ({patient.patient_id})</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowVitalsModal(true)}
            className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Record Vitals
          </button>
        </div>
      </div>

      {/* Clinical Alerts */}
      {renderAlerts()}

      {/* Success Message */}
      {renderSuccessMessage()}

      {/* Current View Content */}
      {activeView === 'trends' && (
        <div className="space-y-6">
          {/* Enhanced Vitals Summary with Color Coding and Trends */}
          {renderEnhancedVitalsSummary()}
        </div>
      )}

      {/* Detailed Trends Modal */}
      {showTrendsDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <VitalsTrends
              patientId={patient.id}
              patientName={`${patient.first_name} ${patient.last_name}`}
              onClose={() => setShowTrendsDetail(false)}
              onRecordVitals={() => {
                setShowTrendsDetail(false);
                setShowVitalsModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Vitals Recording Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Record New Vital Signs</h3>
                <button
                  onClick={() => setShowVitalsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
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
        </div>
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
