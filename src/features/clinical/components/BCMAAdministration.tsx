/**
 * BCMA Administration Component
 * Integrates with existing barcode scanning to handle medication administration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QrCode, Check, X, AlertTriangle, Clock, User, Pill, CheckCircle } from 'lucide-react';
import { Patient, Medication } from '../../../types';
import { bcmaService, BCMAValidationResult } from '../../../services/clinical/bcmaService';
import { BarcodeGenerator } from './BarcodeGenerator';
import { simulateBarcodeScan } from '../../../lib/barcode/barcodeScanner';
import { setBCMAActive } from '../../../services/simulation/bcmaState';

interface BCMAAdministrationProps {
  patient: Patient;
  medication: Medication;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  onAdministrationComplete: (success: boolean, log?: unknown) => void;
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
  const [notes, setNotes] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'scan-patient' | 'scan-medication' | 'verify' | 'complete'>('scan-patient');
  
  // Glucose reading states for diabetic medications
  const requiresGlucoseReading = useMemo(() => {
    const isDiabeticMedication = medication.category === 'diabetic';
    console.log('🩸 BCMA: Checking medication category:', {
      medication: medication.name,
      category: medication.category,
      isDiabetic: isDiabeticMedication
    });
    if (isDiabeticMedication) {
      console.log('🩸 BCMA: Diabetic medication detected - glucose reading will be required');
    } else {
      console.log('🩸 BCMA: Non-diabetic medication - no glucose reading required');
    }
    return isDiabeticMedication;
  }, [medication.category, medication.name]);
  
  const [glucoseReading, setGlucoseReading] = useState<string>('');
  const [glucoseTimestamp, setGlucoseTimestamp] = useState<string>('');
  const [showGlucoseModal, setShowGlucoseModal] = useState<boolean>(false);
  const [showBarcodes, setShowBarcodes] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overriddenChecks, setOverriddenChecks] = useState<string[]>([]);
  const [studentName, setStudentName] = useState<string>('');

  // Set BCMA as active when component mounts
  useEffect(() => {
    console.log('🔵 BCMA: Component mounting, setting BCMA active');
    setBCMAActive(true);
    
    return () => {
      console.log('🔵 BCMA: Component unmounting, setting BCMA inactive');
      setBCMAActive(false);
    };
  }, []);

  // Define barcode handler with proper dependencies
  const handleBarcodeScanned = useCallback((barcode: string) => {
    console.log('🔵 BCMA: Barcode scanned:', barcode);
    console.log('🔵 BCMA: Barcode length:', barcode.length, 'Characters:', barcode.split('').map(c => c + '(' + c.charCodeAt(0) + ')').join(' '));
    console.log('🔵 BCMA: Current step:', currentStep);
    console.log('🔵 BCMA: Scanned patient ID:', scannedPatientId);
    console.log('🔵 BCMA: Scanned medication ID:', scannedMedicationId);
    
    // Ignore barcode scans during verify or complete steps
    if (currentStep === 'verify' || currentStep === 'complete') {
      console.log('🔵 BCMA: Ignoring barcode scan - already in', currentStep, 'step');
      return;
    }
    
    // Prevent re-scanning the same barcode (debounce duplicate scans)
    if (currentStep === 'scan-medication' && barcode === scannedPatientId) {
      console.log('🔵 BCMA: Ignoring duplicate patient barcode scan during medication step');
      return;
    }
    
    // Detect barcode type
    const isPatientBarcode = barcode.startsWith('PT') || barcode.startsWith('PAT-');
    // New format: M + letter + 5 digits (e.g., MA26325) OR legacy MED format
    const medicationRegex = /^M[A-Z]\d{5}$/;
    const isMedicationBarcode = barcode.startsWith('MED') || medicationRegex.test(barcode);
    
    console.log('� BCMA: Barcode detection details:');
    console.log('  - Barcode value:', barcode);
    console.log('  - Starts with PT:', barcode.startsWith('PT'));
    console.log('  - Starts with PAT-:', barcode.startsWith('PAT-'));
    console.log('  - Starts with MED:', barcode.startsWith('MED'));
    console.log('  - Starts with M:', barcode.startsWith('M'));
    console.log('  - Regex test /^M[A-Z]\\d{5}$/:', medicationRegex.test(barcode));
    console.log('  - Final: isPatientBarcode =', isPatientBarcode);
    console.log('  - Final: isMedicationBarcode =', isMedicationBarcode);
    
    if (currentStep === 'scan-patient') {
      if (isPatientBarcode) {
        console.log('🔵 BCMA: Valid patient barcode, proceeding');
        setScannedPatientId(barcode);
        setCurrentStep('scan-medication');
      } else if (isMedicationBarcode) {
        console.log('❌ BCMA: Medication barcode scanned during patient step - rejecting');
        alert(`❌ Wrong barcode type!\n\nExpected: Patient barcode (starts with PT)\nScanned: Medication barcode (${barcode})\n\nPlease scan the patient's wristband barcode.`);
      } else {
        console.log('❌ BCMA: Unknown barcode format during patient step');
        alert(`❌ Unknown barcode format: ${barcode}\n\nExpected: Patient barcode starting with PT`);
      }
    } else if (currentStep === 'scan-medication') {
      if (isMedicationBarcode) {
        console.log('🔵 BCMA: Valid medication barcode, proceeding');
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
      } else if (isPatientBarcode) {
        console.log('❌ BCMA: Patient barcode scanned during medication step - rejecting');
        alert(`❌ Wrong barcode type!\n\nExpected: Medication barcode\nScanned: Patient barcode (${barcode})\n\nPlease scan the medication package barcode.`);
      } else {
        console.log('❌ BCMA: Unknown barcode format during medication step');
        alert(`❌ Unknown barcode format: ${barcode}\n\nExpected: Medication barcode (format: M + letter + 5 digits, e.g., MA26325)`);
      }
    }
  }, [currentStep, scannedPatientId, scannedMedicationId, patient, medication]);

  // Listen for barcode scans from global barcode dispatcher
  useEffect(() => {
    console.log('🔵 BCMA: Setting up barcode listener');
    console.log('🔵 BCMA: Component mounted and listening for barcodescanned events');
    
    const handleBarcodeInput = (event: CustomEvent) => {
      console.log('🔵 BCMA: Received barcode event:', event.detail.barcode);
      console.log('🔵 BCMA: Event type:', event.type);
      const barcode = event.detail.barcode;
      
      handleBarcodeScanned(barcode);
    };

    // Listen for custom barcode events from global dispatcher
    document.addEventListener('barcodescanned', handleBarcodeInput as (event: Event) => void);
    
    // Test that event listener is working
    console.log('🔵 BCMA: Event listener attached to document');
    
    // Add a test function to the component instance for debugging
    (window as Window & { bcmaTestScan?: (barcode: string) => void }).bcmaTestScan = (barcode: string) => {
      console.log('🧪 Direct BCMA test scan:', barcode);
      handleBarcodeScanned(barcode);
    };

    return () => {
      console.log('🔵 BCMA: Cleaning up barcode listener');
      document.removeEventListener('barcodescanned', handleBarcodeInput as (event: Event) => void);
      delete (window as Window & { bcmaTestScan?: (barcode: string) => void }).bcmaTestScan;
    };
    }, [handleBarcodeScanned]); // Depend on the memoized function

  const handleAdministration = async () => {
    if (!validationResult || !validationResult.isValid) return;

    // Check if glucose reading is required and provided
    if (requiresGlucoseReading && !glucoseReading) {
      setShowGlucoseModal(true);
      return;
    }

    try {
      const administrationData = {
        ...medication,
        glucoseReading: requiresGlucoseReading ? glucoseReading : null,
        glucoseTimestamp: requiresGlucoseReading ? glucoseTimestamp : null
      };

      const log = await bcmaService.createAdministrationLog(
        administrationData,
        patient,
        currentUser,
        scannedPatientId,
        scannedMedicationId,
        validationResult,
        overriddenChecks,
        notes,
        studentName,
        overriddenChecks.length > 0 ? overrideReason : undefined,
        undefined // witnessName - can be added later if needed
      );

      setCurrentStep('complete');
      
      // Call parent completion handler
      onAdministrationComplete(true, log);
    } catch (error) {
      console.error('BCMA administration error:', error);
      onAdministrationComplete(false);
    }
  };

  const handleOverride = () => {
    if (!overrideReason.trim()) {
      alert('Please provide a reason for the override.');
      return;
    }

    if (validationResult) {
      // Get failed checks
      const failedChecks = Object.entries(validationResult.checks)
        .filter(([, passed]) => !passed)
        .map(([check]) => check);

      // Update validation result to mark all checks as passed
      const updatedChecks = { ...validationResult.checks };
      failedChecks.forEach(check => {
        updatedChecks[check as keyof typeof updatedChecks] = true;
      });

      setValidationResult({
        ...validationResult,
        checks: updatedChecks,
        isValid: true,
        errors: [], // Clear errors since we're overriding
        warnings: [...validationResult.warnings, `Manual override applied: ${overrideReason}`]
      });

      setOverriddenChecks([...overriddenChecks, ...failedChecks]);
      setShowOverrideModal(false);
      // ✅ DON'T clear overrideReason here - we need it for the administration log
      // It will be cleared after successful administration
    }
  };

  const getFailedChecks = () => {
    if (!validationResult) return [];
    return Object.entries(validationResult.checks)
      .filter(([, passed]) => !passed)
      .map(([check]) => check);
  };

  const getCheckDescription = (check: string) => {
    const descriptions: { [key: string]: string } = {
      patient: 'Patient barcode verification failed - the scanned patient barcode does not match the expected patient',
      medication: 'Medication barcode verification failed - the scanned medication barcode does not match the expected medication',
      dose: 'Dose verification failed - there may be a dosage discrepancy',
      route: 'Route verification failed - the administration route may not match the prescribed route',
      time: 'Timing verification failed - the medication may not be due at this time or was recently administered'
    };
    return descriptions[check] || `${check} verification failed`;
  };

  const resetProcess = () => {
    setScannedPatientId('');
    setScannedMedicationId('');
    setValidationResult(null);
    setNotes('');
    setCurrentStep('scan-patient');
    setOverrideReason('');
    setOverriddenChecks([]);
    setShowOverrideModal(false);
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
                {patient.first_name} {patient.last_name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                DOB: {new Date(patient.date_of_birth).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
              
              {/* Medication Details */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-medium text-blue-900 mb-2">{medication.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Dose:</span>
                    <span className="ml-2 text-blue-900">{medication.dosage}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Route:</span>
                    <span className="ml-2 text-blue-900">{medication.route}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-blue-700">Administration Time:</span>
                    <span className="ml-2 text-blue-900">{medication.admin_time || 'Not specified'}</span>
                  </div>
                </div>
              </div>
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

              {/* Test Buttons for Debugging */}
              <div className="mt-4 p-3 bg-blue-50 rounded border">
                <p className="text-sm text-blue-700 mb-2">🧪 Test Barcode Scanning:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const patientBarcode = bcmaService.generatePatientBarcode(patient);
                      console.log('🧪 Test Patient Scan clicked - Generated barcode:', patientBarcode);
                      console.log('🧪 Patient object:', patient);
                      simulateBarcodeScan(patientBarcode);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Test Patient Scan
                  </button>
                  <button
                    onClick={() => simulateBarcodeScan(bcmaService.generateMedicationBarcode(medication))}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Test Medication Scan
                  </button>
                </div>
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

              {/* Simplified Verification Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Medication Verification</h3>
                
                <div className={`p-6 rounded-lg border-2 text-center ${
                  validationResult.isValid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    validationResult.isValid ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {validationResult.isValid ? (
                      <Check className="h-8 w-8 text-green-600" />
                    ) : (
                      <X className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                  
                  <h4 className={`text-xl font-medium mb-2 ${
                    validationResult.isValid ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {validationResult.isValid ? 'Verification Complete' : 'Problem with Verification'}
                  </h4>
                  
                  <p className={`text-sm mb-4 ${
                    validationResult.isValid ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {validationResult.isValid 
                      ? 'All safety checks have passed. You may proceed with administration.'
                      : 'Please resolve verification issues before proceeding.'
                    }
                  </p>

                  {/* Override Button */}
                  {!validationResult.isValid && (
                    <button
                      onClick={() => setShowOverrideModal(true)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                    >
                      Override Verification
                    </button>
                  )}
                </div>
              </div>

              {/* Glucose Reading Requirement for Diabetic Medications */}
              {requiresGlucoseReading && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Glucose Reading Required</h3>
                  
                  <div className={`p-4 rounded-lg border-2 ${
                    glucoseReading 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <div className="flex items-center space-x-3 mb-3">
                      {glucoseReading ? (
                        <Check className="h-6 w-6 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      )}
                      <div>
                        <p className={`font-medium ${
                          glucoseReading ? 'text-green-800' : 'text-orange-800'
                        }`}>
                          {glucoseReading 
                            ? `Current Glucose: ${glucoseReading} mmol/L` 
                            : 'Glucose reading required for diabetic medication'
                          }
                        </p>
                        {glucoseTimestamp && (
                          <p className="text-sm text-gray-600">
                            Recorded: {new Date(glucoseTimestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!glucoseReading && (
                      <button
                        onClick={() => setShowGlucoseModal(true)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                      >
                        Enter Glucose Reading
                      </button>
                    )}

                    {glucoseReading && (
                      <div className="mt-3">
                        {/* Glucose Reading Recorded */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center space-x-2">
                            <Check className="h-5 w-5 text-blue-600" />
                            <p className="text-sm font-medium text-blue-800">
                              Glucose reading recorded: {glucoseReading} mmol/L
                            </p>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            Reading will be documented with medication administration.
                          </p>
                        </div>
                        
                        <button
                          onClick={() => {
                            setGlucoseReading('');
                            setGlucoseTimestamp('');
                            setShowGlucoseModal(true);
                          }}
                          className="mt-2 px-3 py-1 text-sm text-orange-600 border border-orange-300 rounded hover:bg-orange-50"
                        >
                          Update Reading
                        </button>
                      </div>
                    )}
                  </div>
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

              {/* Student Verification */}
              {currentStep === 'verify' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-yellow-900 mb-2">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Enter your full name"
                    required
                  />
                  <p className="text-xs text-yellow-700 mt-2">
                    By entering your name, you verify that all information above is correct and you administered this medication.
                  </p>
                </div>
              )}
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
                disabled={!validationResult?.isValid || (requiresGlucoseReading && !glucoseReading) || !studentName.trim()}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  (validationResult?.isValid && (!requiresGlucoseReading || glucoseReading) && studentName.trim())
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {requiresGlucoseReading && !glucoseReading 
                  ? 'Glucose Reading Required'
                  : !studentName.trim()
                  ? 'Student Name Required'
                  : 'Administer Medication'
                }
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

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Override Verification</h3>
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Failed Verification Checks:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {getFailedChecks().map((check) => (
                    <li key={check}>
                      <span className="font-medium capitalize">Right {check}:</span> {getCheckDescription(check)}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Override <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  rows={4}
                  placeholder="Explain why this verification is being overridden..."
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Overriding verification checks should only be done when absolutely necessary and with proper clinical justification. This action will be logged for audit purposes.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 p-6 pt-0">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glucose Reading Modal */}
      {showGlucoseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Enter Glucose Reading</h3>
                <button
                  onClick={() => setShowGlucoseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Glucose Level (mmol/L)
                </label>
                <input
                  type="number"
                  min="1"
                  max="35"
                  step="0.1"
                  value={glucoseReading}
                  onChange={(e) => setGlucoseReading(e.target.value)}
                  placeholder="Enter glucose reading..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter glucose reading in mmol/L (e.g., 5.5)
                </p>
              </div>

              {/* Glucose Reading Preview */}
              {glucoseReading && (
                <div className="p-3 rounded-md border bg-blue-50">
                  <div className="text-blue-600">
                    <p className="font-medium">Reading Recorded</p>
                    <p className="text-sm">Glucose level: {glucoseReading} mmol/L will be documented with medication administration</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowGlucoseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (glucoseReading && parseFloat(glucoseReading) >= 1 && parseFloat(glucoseReading) <= 35) {
                    setGlucoseTimestamp(new Date().toISOString());
                    setShowGlucoseModal(false);
                  }
                }}
                disabled={!glucoseReading || parseFloat(glucoseReading) < 1 || parseFloat(glucoseReading) > 35}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  glucoseReading && parseFloat(glucoseReading) >= 1 && parseFloat(glucoseReading) <= 35
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Save Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
