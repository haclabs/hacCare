/**
 * BCMA Administration Component
 * Integrates with existing barcode scanning to handle medication administration
 */

import React, { useState, useEffect } from 'react';
import { QrCode, Check, X, AlertTriangle, Clock, User, Pill, CheckCircle } from 'lucide-react';
import { Patient, Medication } from '../../types';
import { bcmaService, BCMAValidationResult } from '../../lib/bcmaService';
import { BarcodeGenerator } from './BarcodeGenerator';

interface BCMAAdministrationProps {
  patient: Patient;
  medication: Medication;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  onAdministrationComplete: (success: boolean, log?: any) => void;
  onCancel: () => void;
}

export const BCMAAdministration: React.FC<BCMAAdministrationProps> = ({
  patient,
  medication,
  currentUser,
  onAdministrationComplete,
  onCancel
}) => {
  const [scannedPatientId, setScannedPatientId] = useState<string>('');
  const [scannedMedicationId, setScannedMedicationId] = useState<string>('');
  const [validationResult, setValidationResult] = useState<BCMAValidationResult | null>(null);
  const [manualOverrides, setManualOverrides] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'scan-patient' | 'scan-medication' | 'verify' | 'complete'>('scan-patient');
  const [showBarcodes, setShowBarcodes] = useState(false);

  // Listen for barcode scans from existing infrastructure
  useEffect(() => {
    const handleBarcodeInput = (event: CustomEvent) => {
      const barcode = event.detail.barcode;
      handleBarcodeScanned(barcode);
    };

    // Listen for custom barcode events
    document.addEventListener('barcodescanned', handleBarcodeInput as EventListener);

    // Also listen for keyboard input as fallback
    let inputBuffer = '';
    let inputTimer: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        inputBuffer = '';
      }, 100);

      if (e.key === 'Enter') {
        if (inputBuffer.length > 3) {
          handleBarcodeScanned(inputBuffer);
          inputBuffer = '';
        }
      } else if (e.key.length === 1) {
        inputBuffer += e.key;
      }
    };

    document.addEventListener('keypress', handleKeyPress);

    return () => {
      document.removeEventListener('barcodescanned', handleBarcodeInput as EventListener);
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(inputTimer);
    };
  }, [currentStep]);

  const handleBarcodeScanned = (barcode: string) => {
    console.log('🔵 BCMA: Barcode scanned:', barcode);
    console.log('🔵 BCMA: Current step:', currentStep);
    console.log('🔵 BCMA: Scanned patient ID:', scannedPatientId);
    
    if (currentStep === 'scan-patient') {
      console.log('🔵 BCMA: Setting patient barcode:', barcode);
      setScannedPatientId(barcode);
      setCurrentStep('scan-medication');
    } else if (currentStep === 'scan-medication') {
      console.log('🔵 BCMA: Setting medication barcode:', barcode);
      setScannedMedicationId(barcode);
      
      // Validate both barcodes
      const validation = bcmaService.validateBarcodes(
        scannedPatientId,
        barcode,
        patient,
        medication
      );
      
      console.log('🔵 BCMA: Validation result:', validation);
      setValidationResult(validation);
      setCurrentStep('verify');
    }
  };

  const handleManualOverride = (checkType: string) => {
    const newOverrides = [...manualOverrides, checkType];
    setManualOverrides(newOverrides);
    
    if (validationResult) {
      const updatedChecks = {
        ...validationResult.checks,
        [checkType]: true
      };
      
      setValidationResult({
        ...validationResult,
        checks: updatedChecks,
        isValid: Object.values(updatedChecks).every(check => check)
      });
    }
  };

  const handleAdministration = async () => {
    if (!validationResult || !validationResult.isValid) return;

    try {
      // Create administration log
      const log = await bcmaService.createAdministrationLog(
        medication,
        patient,
        currentUser,
        scannedPatientId,
        scannedMedicationId,
        validationResult,
        manualOverrides,
        notes
      );

      setCurrentStep('complete');
      
      // Call parent completion handler
      onAdministrationComplete(true, log);
    } catch (error) {
      console.error('Error during administration:', error);
      onAdministrationComplete(false);
    }
  };

  const resetProcess = () => {
    setScannedPatientId('');
    setScannedMedicationId('');
    setValidationResult(null);
    setManualOverrides([]);
    setNotes('');
    setCurrentStep('scan-patient');
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'scan-patient': return User;
      case 'scan-medication': return Pill;
      case 'verify': return Check;
      case 'complete': return CheckCircle;
      default: return Clock;
    }
  };

  const getStepStatus = (step: string) => {
    const steps = ['scan-patient', 'scan-medication', 'verify', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                BCMA - Barcode Medication Administration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {medication.name} for {patient.first_name} {patient.last_name}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowBarcodes(!showBarcodes)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Show/Hide Barcodes"
              >
                <QrCode className="h-5 w-5" />
              </button>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {['scan-patient', 'scan-medication', 'verify', 'complete'].map((step, index) => {
                const StepIcon = getStepIcon(step);
                const status = getStepStatus(step);
                
                return (
                  <div key={step} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      status === 'completed' ? 'bg-green-500 text-white' :
                      status === 'current' ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      <StepIcon className="h-5 w-5" />
                    </div>
                    
                    {index < 3 && (
                      <div className={`w-16 h-1 mx-2 ${
                        status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between mt-2 text-sm">
              <span className={currentStep === 'scan-patient' ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                Scan Patient
              </span>
              <span className={currentStep === 'scan-medication' ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                Scan Medication
              </span>
              <span className={currentStep === 'verify' ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                Verify
              </span>
              <span className={currentStep === 'complete' ? 'text-blue-600 font-medium' : 'text-gray-500'}>
                Complete
              </span>
            </div>
          </div>

          {/* Barcode Display */}
          {showBarcodes && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reference Barcodes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BarcodeGenerator
                  data={bcmaService.generatePatientBarcode(patient)}
                  type="patient"
                  label={`${patient.first_name} ${patient.last_name}`}
                />
                <BarcodeGenerator
                  data={bcmaService.generateMedicationBarcode(medication)}
                  type="medication"
                  label={medication.name}
                />
              </div>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'scan-patient' && (
            <div className="text-center py-8">
              <User className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Scan Patient Wristband
              </h3>
              <p className="text-gray-600 mb-4">
                Scan the barcode on {patient.first_name} {patient.last_name}'s wristband
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Expected Patient ID: {patient.patient_id}
                </p>
              </div>
              
              <button
                onClick={() => {
                  const manualId = prompt('Enter patient barcode manually:');
                  if (manualId) handleBarcodeScanned(manualId);
                }}
                className="mt-4 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                Enter Manually
              </button>
            </div>
          )}

          {currentStep === 'scan-medication' && (
            <div className="text-center py-8">
              <Pill className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Scan Medication Barcode
              </h3>
              <p className="text-gray-600 mb-4">
                Scan the barcode on the {medication.name} package
              </p>
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Patient scanned: {scannedPatientId}
                  </p>
                  <p className="text-sm text-green-800">
                    Expected Medication: {medication.name}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  const manualId = prompt('Enter medication barcode manually:');
                  if (manualId) handleBarcodeScanned(manualId);
                }}
                className="mt-4 px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50"
              >
                Enter Manually
              </button>
            </div>
          )}

          {currentStep === 'verify' && validationResult && (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg border ${
                validationResult.isValid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {validationResult.isValid ? (
                    <Check className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      validationResult.isValid ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationResult.isValid 
                        ? 'Five Rights Verified - Ready to Administer'
                        : 'Verification Issues Detected'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Five Rights Checks */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">Five Rights Verification</h3>
                
                {Object.entries(validationResult.checks).map(([check, passed]) => (
                  <div key={check} className={`flex items-center justify-between p-3 rounded-lg border ${
                    passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {passed ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium capitalize">
                        Right {check}
                      </span>
                    </div>
                    
                    {!passed && (
                      <button
                        onClick={() => handleManualOverride(check)}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded"
                      >
                        Override
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Errors and Warnings */}
              {validationResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Administration Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter any notes about the administration..."
                />
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Administration Complete
              </h3>
              <p className="text-gray-600">
                {medication.name} has been administered to {patient.first_name} {patient.last_name}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
            {currentStep !== 'complete' && (
              <>
                <button
                  onClick={resetProcess}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Reset
                </button>
                
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            )}
            
            {currentStep === 'verify' && (
              <button
                onClick={handleAdministration}
                disabled={!validationResult?.isValid}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  validationResult?.isValid
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Administer Medication
              </button>
            )}
            
            {currentStep === 'complete' && (
              <button
                onClick={() => onAdministrationComplete(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
