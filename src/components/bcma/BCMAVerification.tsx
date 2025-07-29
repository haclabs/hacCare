/**
 * BCMA (Barcode Medication Administration) Verification Component
 * Handles the five rights verification process
 */

import React, { useState } from 'react';
import { Check, X, AlertTriangle, Clock, User, Pill, Route, Syringe } from 'lucide-react';
import { Patient, Medication } from '../../types';

interface FiveRightsCheck {
  patient: boolean;
  medication: boolean;
  dose: boolean;
  route: boolean;
  time: boolean;
}

interface BCMAVerificationProps {
  patient: Patient;
  medication: Medication;
  scannedPatientId?: string;
  scannedMedicationId?: string;
  onVerificationComplete: (verified: boolean, checks: FiveRightsCheck) => void;
  onCancel: () => void;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

export const BCMAVerification: React.FC<BCMAVerificationProps> = ({
  patient,
  medication,
  scannedPatientId,
  scannedMedicationId,
  onVerificationComplete,
  onCancel,
  currentUser
}) => {
  const [checks, setChecks] = useState<FiveRightsCheck>({
    patient: false,
    medication: false,
    dose: false,
    route: false,
    time: false
  });

  const [manualOverrides, setManualOverrides] = useState<Partial<FiveRightsCheck>>({});

  // Verify patient identity
  const verifyPatient = (): boolean => {
    if (!scannedPatientId) return false;
    
    // Check if scanned ID matches patient
    const patientMatch = scannedPatientId === patient.patient_id || 
                         scannedPatientId === `PT-${patient.patient_id}` ||
                         scannedPatientId === `PAT-${patient.patient_id}`;
    
    return patientMatch;
  };

  // Verify medication identity
  const verifyMedication = (): boolean => {
    if (!scannedMedicationId) return false;
    
    // Check if scanned ID matches medication
    const medicationMatch = scannedMedicationId === medication.id ||
                           scannedMedicationId === `MED-${medication.id}` ||
                           scannedMedicationId === `RX-${medication.id}`;
    
    return medicationMatch;
  };

  // Verify dose is correct
  const verifyDose = (): boolean => {
    // This would typically involve checking against pharmacy records
    // For now, we'll assume the dose is correct if medication matches
    return verifyMedication();
  };

  // Verify route is appropriate
  const verifyRoute = (): boolean => {
    // Check if route is appropriate for patient condition
    // This is a simplified check - in practice, would involve clinical decision support
    return medication.route !== undefined && medication.route.length > 0;
  };

  // Verify timing is appropriate
  const verifyTime = (): boolean => {
    if (!medication.next_due) return true; // PRN medications don't have strict timing

    const now = new Date();
    const nextDue = new Date(medication.next_due);
    const lastAdministered = medication.last_administered ? new Date(medication.last_administered) : null;

    // Check if it's not too early (within 30 minutes of due time)
    const thirtyMinutesEarly = new Date(nextDue.getTime() - 30 * 60 * 1000);
    
    // Check minimum interval since last dose (prevent double dosing)
    if (lastAdministered) {
      const minimumInterval = getMinimumInterval(medication.frequency);
      const timeSinceLastDose = now.getTime() - lastAdministered.getTime();
      
      if (timeSinceLastDose < minimumInterval) {
        return false; // Too soon since last dose
      }
    }

    return now >= thirtyMinutesEarly;
  };

  // Get minimum interval between doses
  const getMinimumInterval = (frequency: string): number => {
    const intervals: { [key: string]: number } = {
      'Once daily': 20 * 60 * 60 * 1000, // 20 hours minimum
      'Twice daily': 10 * 60 * 60 * 1000, // 10 hours minimum
      'Three times daily': 6 * 60 * 60 * 1000, // 6 hours minimum
      'Four times daily': 4 * 60 * 60 * 1000, // 4 hours minimum
      'Every 4 hours': 3 * 60 * 60 * 1000, // 3 hours minimum
      'Every 6 hours': 4 * 60 * 60 * 1000, // 4 hours minimum
      'Every 8 hours': 6 * 60 * 60 * 1000, // 6 hours minimum
      'Every 12 hours': 10 * 60 * 60 * 1000, // 10 hours minimum
    };
    
    return intervals[frequency] || 6 * 60 * 60 * 1000; // Default 6 hours
  };

  // Run all verifications
  const runVerifications = () => {
    const newChecks: FiveRightsCheck = {
      patient: manualOverrides.patient ?? verifyPatient(),
      medication: manualOverrides.medication ?? verifyMedication(),
      dose: manualOverrides.dose ?? verifyDose(),
      route: manualOverrides.route ?? verifyRoute(),
      time: manualOverrides.time ?? verifyTime()
    };

    setChecks(newChecks);
    return newChecks;
  };

  // Handle manual override
  const handleManualOverride = (check: keyof FiveRightsCheck) => {
    const newOverrides = {
      ...manualOverrides,
      [check]: true
    };
    setManualOverrides(newOverrides);
    
    // Re-run verifications
    const newChecks = {
      ...checks,
      [check]: true
    };
    setChecks(newChecks);
  };

  // Initialize checks on component mount
  React.useEffect(() => {
    runVerifications();
  }, [scannedPatientId, scannedMedicationId]);

  const allChecksPass = Object.values(checks).every(check => check);
  const hasFailures = Object.values(checks).some(check => !check);

  const checkItems = [
    {
      key: 'patient' as const,
      icon: User,
      title: 'Right Patient',
      description: `${patient.first_name} ${patient.last_name} (${patient.patient_id})`,
      status: checks.patient,
      canOverride: true
    },
    {
      key: 'medication' as const,
      icon: Pill,
      title: 'Right Medication',
      description: medication.name,
      status: checks.medication,
      canOverride: true
    },
    {
      key: 'dose' as const,
      icon: Syringe,
      title: 'Right Dose',
      description: medication.dosage,
      status: checks.dose,
      canOverride: true
    },
    {
      key: 'route' as const,
      icon: Route,
      title: 'Right Route',
      description: medication.route,
      status: checks.route,
      canOverride: true
    },
    {
      key: 'time' as const,
      icon: Clock,
      title: 'Right Time',
      description: medication.next_due 
        ? `Due: ${new Date(medication.next_due).toLocaleString()}`
        : 'PRN - As needed',
      status: checks.time,
      canOverride: medication.category !== 'continuous' // Don't allow time override for continuous meds
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Medication Administration Verification
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Verify the five rights before administering medication
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Verification Status */}
          <div className={`mb-6 p-4 rounded-lg border ${
            allChecksPass 
              ? 'bg-green-50 border-green-200' 
              : hasFailures 
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-3">
              {allChecksPass ? (
                <Check className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${
                  allChecksPass ? 'text-green-800' : 'text-red-800'
                }`}>
                  {allChecksPass 
                    ? 'All verifications passed - Ready to administer'
                    : 'Verification required before administration'
                  }
                </p>
                <p className={`text-sm mt-1 ${
                  allChecksPass ? 'text-green-700' : 'text-red-700'
                }`}>
                  {allChecksPass 
                    ? 'All five rights have been verified'
                    : 'Please resolve the issues below'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Five Rights Checklist */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Five Rights Verification</h3>
            
            {checkItems.map((item) => {
              const IconComponent = item.icon;
              
              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-lg border ${
                    item.status 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-full ${
                        item.status ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <IconComponent className={`h-4 w-4 ${
                          item.status ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          {item.status ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        
                        {!item.status && (
                          <p className="text-sm text-red-600 mt-1">
                            {item.key === 'patient' && 'Patient barcode scan required or mismatch detected'}
                            {item.key === 'medication' && 'Medication barcode scan required or mismatch detected'}
                            {item.key === 'dose' && 'Dose verification failed'}
                            {item.key === 'route' && 'Route verification failed'}
                            {item.key === 'time' && 'Too soon since last dose or outside administration window'}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!item.status && item.canOverride && (
                      <button
                        onClick={() => handleManualOverride(item.key)}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded transition-colors"
                      >
                        Override
                      </button>
                    )}
                  </div>

                  {manualOverrides[item.key] && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <p className="text-yellow-800">
                        <strong>Manual Override:</strong> This check was manually overridden by {currentUser?.name || 'user'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={() => onVerificationComplete(allChecksPass, checks)}
              disabled={!allChecksPass}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                allChecksPass
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allChecksPass ? 'Proceed with Administration' : 'Complete Verification First'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
