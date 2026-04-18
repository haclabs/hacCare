/**
 * BCMA Administration Component
 * Integrates with existing barcode scanning to handle medication administration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Check, X, User, Pill, CheckCircle } from 'lucide-react';
import { Patient, Medication } from '../../../types';
import { bcmaService, BCMAValidationResult } from '../../../services/clinical/bcmaService';
import { BarcodeGenerator } from './BarcodeGenerator';
import { simulateBarcodeScan } from '../../../lib/barcode/barcodeScanner';
import { setBCMAActive } from '../../../services/simulation/bcmaState';
import { secureLogger } from '../../../lib/security/secureLogger';
import { useTenant } from '../../../contexts/TenantContext';
import { supabase } from '../../../lib/api/supabase';

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
  const { currentTenant } = useTenant();

  const isSimulationTenant = currentTenant?.tenant_type === 'simulation_active' || !!currentTenant?.is_simulation;

  // Fetch when the current simulation session started so we can ignore
  // last_administered / next_due values from a previous group's run.
  // Query by tenant_id (simulation_active.tenant_id = currentTenant.id).
  const { data: simulationStartsAt } = useQuery({
    queryKey: ['simulation-starts-at', currentTenant?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('simulation_active')
        .select('starts_at')
        .eq('tenant_id', currentTenant!.id)
        .maybeSingle();
      // null means simulation exists but hasn't been started yet (pending/reset)
      // undefined/no row means not found — treat same as null (safe default)
      return data?.starts_at ?? null;
    },
    enabled: isSimulationTenant && !!currentTenant?.id,
    staleTime: 30 * 1000, // 30 s — refresh after instructor clicks Play
  });

  const [scannedPatientId, setScannedPatientId] = useState<string>('');
  const [scannedMedicationId, setScannedMedicationId] = useState<string>('');
  const [validationResult, setValidationResult] = useState<BCMAValidationResult | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'scan-patient' | 'scan-medication' | 'verify' | 'complete'>('scan-patient');
  
  // Glucose reading states for diabetic medications
  const requiresGlucoseReading = useMemo(() => {
    const isDiabeticMedication = medication.category === 'diabetic';
    secureLogger.debug('🩸 BCMA: Checking medication category:', {
      medication: medication.name,
      category: medication.category,
      isDiabetic: isDiabeticMedication
    });
    if (isDiabeticMedication) {
      secureLogger.debug('🩸 BCMA: Diabetic medication detected - glucose reading will be required');
    } else {
      secureLogger.debug('🩸 BCMA: Non-diabetic medication - no glucose reading required');
    }
    return isDiabeticMedication;
  }, [medication.category, medication.name]);
  
  const [glucoseReading, setGlucoseReading] = useState<string>('');
  const [glucoseTimestamp, setGlucoseTimestamp] = useState<string>('');
  const [administeredDose, setAdministeredDose] = useState<string>('');
  const [showBarcodes, setShowBarcodes] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overriddenChecks, setOverriddenChecks] = useState<string[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [completionLog, setCompletionLog] = useState<unknown>(null);

  // Set BCMA as active when component mounts
  useEffect(() => {
    secureLogger.debug('🔵 BCMA: Component mounting, setting BCMA active');
    setBCMAActive(true);
    
    return () => {
      secureLogger.debug('🔵 BCMA: Component unmounting, setting BCMA inactive');
      setBCMAActive(false);
    };
  }, []);

  // Define barcode handler with proper dependencies
  const handleBarcodeScanned = useCallback((barcode: string) => {
    secureLogger.debug('🔵 BCMA: Barcode scanned:', barcode);
    secureLogger.debug(`🔵 BCMA: Barcode length: ${barcode.length} Characters: ${barcode.split('').map(c => c + '(' + c.charCodeAt(0) + ')').join(' ')}`);
    secureLogger.debug('🔵 BCMA: Current step:', currentStep);
    secureLogger.debug('🔵 BCMA: Scanned patient ID:', scannedPatientId);
    secureLogger.debug('🔵 BCMA: Scanned medication ID:', scannedMedicationId);
    
    // Ignore barcode scans during verify or complete steps
    if (currentStep === 'verify' || currentStep === 'complete') {
      secureLogger.debug('🔵 BCMA: Ignoring barcode scan - already in', currentStep, 'step');
      return;
    }
    
    // Prevent re-scanning the same barcode (debounce duplicate scans)
    if (currentStep === 'scan-medication' && barcode === scannedPatientId) {
      secureLogger.debug('🔵 BCMA: Ignoring duplicate patient barcode scan during medication step');
      return;
    }
    
    // Detect barcode type
    const isPatientBarcode = barcode.startsWith('PT') || barcode.startsWith('PAT-');
    // New format: M + letter + 5 digits (e.g., MA26325) OR legacy MED format
    const medicationRegex = /^M[A-Z]\d{5}$/;
    const isMedicationBarcode = barcode.startsWith('MED') || medicationRegex.test(barcode);
    
    secureLogger.debug('� BCMA: Barcode detection details:');
    secureLogger.debug('  - Barcode value:', barcode);
    secureLogger.debug('  - Starts with PT:', barcode.startsWith('PT'));
    secureLogger.debug('  - Starts with PAT-:', barcode.startsWith('PAT-'));
    secureLogger.debug('  - Starts with MED:', barcode.startsWith('MED'));
    secureLogger.debug('  - Starts with M:', barcode.startsWith('M'));
    secureLogger.debug('  - Regex test /^M[A-Z]\\d{5}$/:', medicationRegex.test(barcode));
    secureLogger.debug('  - Final: isPatientBarcode =', isPatientBarcode);
    secureLogger.debug('  - Final: isMedicationBarcode =', isMedicationBarcode);
    
    if (currentStep === 'scan-patient') {
      if (isPatientBarcode) {
        secureLogger.debug('🔵 BCMA: Valid patient barcode, proceeding');
        setScannedPatientId(barcode);
        setCurrentStep('scan-medication');
      } else if (isMedicationBarcode) {
        secureLogger.debug('❌ BCMA: Medication barcode scanned during patient step - rejecting');
        alert(`❌ Wrong barcode type!\n\nExpected: Patient barcode (starts with PT)\nScanned: Medication barcode (${barcode})\n\nPlease scan the patient's wristband barcode.`);
      } else {
        secureLogger.debug('❌ BCMA: Unknown barcode format during patient step');
        alert(`❌ Unknown barcode format: ${barcode}\n\nExpected: Patient barcode starting with PT`);
      }
    } else if (currentStep === 'scan-medication') {
      if (isMedicationBarcode) {
        secureLogger.debug('🔵 BCMA: Valid medication barcode, proceeding');
        setScannedMedicationId(barcode);
        
        // Validate both barcodes.
        // Pass sessionStartedAt so last_administered from a previous group's run is ignored.
        const validation = bcmaService.validateBarcodes(
          scannedPatientId,
          barcode,
          patient,
          medication,
          // undefined = not a simulation (full timing checks apply)
          // null      = simulation reset/pending (skip stale timing)
          // string    = simulation running (skip timing that predates session start)
          isSimulationTenant ? simulationStartsAt ?? null : undefined
        );
        
        secureLogger.debug('🔵 BCMA: Validation result:', validation);
        setValidationResult(validation);
        setCurrentStep('verify');
      } else if (isPatientBarcode) {
        secureLogger.debug('❌ BCMA: Patient barcode scanned during medication step - rejecting');
        alert(`❌ Wrong barcode type!\n\nExpected: Medication barcode\nScanned: Patient barcode (${barcode})\n\nPlease scan the medication package barcode.`);
      } else {
        secureLogger.debug('❌ BCMA: Unknown barcode format during medication step');
        alert(`❌ Unknown barcode format: ${barcode}\n\nExpected: Medication barcode (format: M + letter + 5 digits, e.g., MA26325)`);
      }
    }
  }, [currentStep, scannedPatientId, scannedMedicationId, patient, medication, isSimulationTenant, simulationStartsAt]);

  // Listen for barcode scans from global barcode dispatcher
  useEffect(() => {
    secureLogger.debug('🔵 BCMA: Setting up barcode listener');
    secureLogger.debug('🔵 BCMA: Component mounted and listening for barcodescanned events');
    
    const handleBarcodeInput = (event: CustomEvent) => {
      secureLogger.debug('🔵 BCMA: Received barcode event:', event.detail.barcode);
      secureLogger.debug('🔵 BCMA: Event type:', event.type);
      const barcode = event.detail.barcode;
      
      handleBarcodeScanned(barcode);
    };

    // Listen for custom barcode events from global dispatcher
    document.addEventListener('barcodescanned', handleBarcodeInput as (event: Event) => void);
    
    // Test that event listener is working
    secureLogger.debug('🔵 BCMA: Event listener attached to document');
    
    // Add a test function to the component instance for debugging
    (window as Window & { bcmaTestScan?: (barcode: string) => void }).bcmaTestScan = (barcode: string) => {
      secureLogger.debug('🧪 Direct BCMA test scan:', barcode);
      handleBarcodeScanned(barcode);
    };

    return () => {
      secureLogger.debug('🔵 BCMA: Cleaning up barcode listener');
      document.removeEventListener('barcodescanned', handleBarcodeInput as (event: Event) => void);
      delete (window as Window & { bcmaTestScan?: (barcode: string) => void }).bcmaTestScan;
    };
    }, [handleBarcodeScanned]); // Depend on the memoized function

  const handleAdministration = async () => {
    if (!validationResult || !validationResult.isValid) return;

    // Check if glucose reading is required and provided — inline field handles this, allReady gate is sufficient

    try {
      const administrationData = {
        ...medication,
        // Keep dosage as the label concentration — do NOT overwrite with student's dose
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
        undefined, // witnessName - can be added later if needed
        administeredDose.trim() || undefined
      );

      setCompletionLog(log);
      setCurrentStep('complete');
    } catch (error) {
      secureLogger.error('BCMA administration error:', error);
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
    setAdministeredDose('');
    setCurrentStep('scan-patient');
    setOverrideReason('');
    setOverriddenChecks([]);
    setShowOverrideModal(false);
  };

  const getStepStatus = (step: string) => {
    const steps = ['scan-patient', 'scan-medication', 'verify', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  // Routes that require the nurse to enter the drawn-up volume/units
  const requiresDrawnUpDose = useMemo(() => {
    const route = medication.route?.toLowerCase() ?? '';
    return route.includes('intravenous') || route.includes('iv')
      || route.includes('intramuscular') || route.includes('im')
      || route.includes('subcutaneous') || route.includes('sc');
  }, [medication.route]);

  const isValidGlucose = requiresGlucoseReading
    ? !!glucoseReading && parseFloat(glucoseReading) >= 1 && parseFloat(glucoseReading) <= 35
    : true;

  // Derived readiness flags
  const allReady = !!validationResult?.isValid
    && (!requiresDrawnUpDose || administeredDose.trim() !== '')
    && isValidGlucose
    && studentName.trim() !== '';

  const nextBlocker = !validationResult?.isValid
    ? 'resolve'
    : requiresDrawnUpDose && !administeredDose.trim()
    ? 'dose'
    : !isValidGlucose
    ? 'glucose'
    : !studentName.trim()
    ? 'name'
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      {/* ── Wide modal shell ── */}
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
           style={{ maxHeight: '95vh' }}>

        {/* ── Dark header bar ── */}
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Step pills */}
            <div className="flex items-center gap-1">
              {(['scan-patient','scan-medication','verify','complete'] as const).map((s, i) => {
                const status = getStepStatus(s);
                const labels = ['Patient','Medication','Verify','Done'];
                return (
                  <React.Fragment key={s}>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      status === 'current'   ? 'bg-blue-500 text-white' :
                      status === 'completed' ? 'bg-green-500 text-white' :
                                              'bg-slate-600 text-slate-400'
                    }`}>
                      {status === 'completed' && <Check className="h-3 w-3" />}
                      {labels[i]}
                    </div>
                    {i < 3 && <div className={`w-5 h-px ${status === 'completed' ? 'bg-green-400' : 'bg-slate-600'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBarcodes(!showBarcodes)}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reference barcodes"
            >
              <QrCode className="h-4 w-4" />
            </button>
            <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body: two columns ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — patient + medication context (hidden on complete step) */}
          {currentStep !== 'complete' && (
          <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
            {/* Patient card */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 leading-tight">{patient.first_name} {patient.last_name}</p>
                  <p className="text-xs text-slate-500">DOB: {new Date(patient.date_of_birth).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
                  <p className="text-xs text-slate-400">ID: {patient.patient_id}</p>
                </div>
              </div>
            </div>

            {/* Medication card */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="h-4 w-4 text-purple-500 shrink-0" />
                <p className="font-bold text-slate-900 text-sm">{medication.name}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Label concentration</span>
                  <span className="font-semibold text-slate-800">{medication.dosage}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Route</span>
                  <span className="font-semibold text-slate-800">{medication.route}</span>
                </div>
                {medication.admin_time && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Time</span>
                    <span className="font-semibold text-slate-800">{medication.admin_time}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist — scan steps */}
            <div className="p-4 flex-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Scan checklist</p>
              <div className="space-y-2">
                {[
                  { label: 'Patient wristband', done: !!scannedPatientId, id: scannedPatientId },
                  { label: 'Medication package', done: !!scannedMedicationId, id: scannedMedicationId },
                  { label: 'Dose drawn up', done: !!administeredDose.trim(), id: administeredDose.trim() },
                  ...(requiresGlucoseReading ? [{ label: 'Glucose reading', done: !!glucoseReading, id: glucoseReading ? `${glucoseReading} mmol/L` : '' }] : []),
                  { label: 'Student signed', done: !!studentName.trim(), id: studentName.trim() },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                    item.done ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      item.done ? 'bg-green-500' : 'bg-slate-300'
                    }`}>
                      {item.done && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.label}</p>
                      {item.done && item.id && <p className="text-green-600 font-mono truncate">{item.id}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset / Cancel footer */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={resetProcess} className="flex-1 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Reset</button>
              <button onClick={onCancel}    className="flex-1 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
          )}

          {/* RIGHT — main workflow area */}
          <div className="flex-1 overflow-y-auto">

            {/* Reference barcodes panel */}
            {showBarcodes && (
              <div className="p-4 bg-slate-100 border-b border-slate-200">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <BarcodeGenerator data={bcmaService.generatePatientBarcode(patient)} type="patient" label={`${patient.first_name} ${patient.last_name}`} />
                  <BarcodeGenerator data={bcmaService.generateMedicationBarcode(medication)} type="medication" label={medication.name} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { const b = bcmaService.generatePatientBarcode(patient); secureLogger.debug('🧪 Test patient:', b); simulateBarcodeScan(b); }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Test Patient Scan</button>
                  <button onClick={() => simulateBarcodeScan(bcmaService.generateMedicationBarcode(medication))}
                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700">Test Medication Scan</button>
                </div>
              </div>
            )}

            {/* ── SCAN PATIENT ── */}
            {currentStep === 'scan-patient' && (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-5">
                  <User className="h-10 w-10 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Scan Patient Wristband</h2>
                <p className="text-slate-500 mb-6">Point scanner at <span className="font-semibold text-slate-700">{patient.first_name} {patient.last_name}</span>'s wristband</p>
                <div className="w-full max-w-xs bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-5 mb-6">
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wider mb-1">Expected ID</p>
                  <p className="text-lg font-mono font-bold text-blue-800">{patient.patient_id}</p>
                </div>
                <button onClick={() => { const v = prompt('Enter patient barcode:'); if (v) handleBarcodeScanned(v); }}
                  className="px-5 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
                  Enter Manually
                </button>
              </div>
            )}

            {/* ── SCAN MEDICATION ── */}
            {currentStep === 'scan-medication' && (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-5">
                  <Pill className="h-10 w-10 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Scan Medication Barcode</h2>
                <p className="text-slate-500 mb-6">Point scanner at the <span className="font-semibold text-slate-700">{medication.name}</span> package</p>
                <div className="w-full max-w-xs bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Patient verified: {scannedPatientId}</span>
                  </div>
                  <p className="text-xs text-green-600 pl-6">Now scan the medication package</p>
                </div>
                <button onClick={() => { const v = prompt('Enter medication barcode:'); if (v) handleBarcodeScanned(v); }}
                  className="px-5 py-2 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors">
                  Enter Manually
                </button>
              </div>
            )}

            {/* ── VERIFY ── */}
            {currentStep === 'verify' && validationResult && (
              <div className="p-5 grid grid-cols-2 gap-4">

                {/* Verification status */}
                <div className={`col-span-2 flex items-center gap-3 p-3 rounded-xl border ${
                  validationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    validationResult.isValid ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {validationResult.isValid ? <Check className="h-4 w-4 text-white" /> : <X className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                      {validationResult.isValid ? '5 Rights Verified — Ready to administer' : 'Verification issues detected'}
                    </p>
                  </div>
                  {!validationResult.isValid && (
                    <button onClick={() => setShowOverrideModal(true)}
                      className="px-3 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
                      Override
                    </button>
                  )}
                </div>

                {/* Dose field — IV, IM, SC routes only */}
                {requiresDrawnUpDose && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Medication Drawn Up / Administered <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-400 mb-2">Dose: <span className="font-semibold text-slate-600">{medication.dosage}</span></p>
                    <input
                      type="text"
                      value={administeredDose}
                      onChange={(e) => setAdministeredDose(e.target.value)}
                      className={`w-full px-3 py-2.5 text-base font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        administeredDose.trim() ? 'border-green-400 bg-green-50 focus:ring-green-400' : 'border-orange-300 bg-orange-50 focus:ring-orange-400'
                      }`}
                      placeholder="mls or units drawn up"
                    />
                    <p className="text-xs text-blue-500 mt-1.5">💡 Tip: Check doctor's orders and calculate the dose before entering</p>
                  </div>
                )}

                {/* Glucose or Notes fills the other column (full-width when dose field is hidden) */}
                {requiresGlucoseReading ? (
                  <div className={`bg-white rounded-xl border border-slate-200 p-4 ${!requiresDrawnUpDose ? 'col-span-2' : ''}`}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Blood Glucose <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-400 mb-2">Range: <span className="font-semibold text-slate-600">1 – 35 mmol/L</span></p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1" max="35" step="0.1"
                        value={glucoseReading}
                        onChange={(e) => {
                          setGlucoseReading(e.target.value);
                          if (e.target.value && parseFloat(e.target.value) >= 1 && parseFloat(e.target.value) <= 35) {
                            setGlucoseTimestamp(new Date().toISOString());
                          } else {
                            setGlucoseTimestamp('');
                          }
                        }}
                        placeholder="e.g. 5.5"
                        className={`flex-1 px-3 py-2.5 text-base font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                          glucoseReading && parseFloat(glucoseReading) >= 1 && parseFloat(glucoseReading) <= 35
                            ? 'border-green-400 bg-green-50 focus:ring-green-400'
                            : glucoseReading
                            ? 'border-red-400 bg-red-50 focus:ring-red-400'
                            : 'border-orange-300 bg-orange-50 focus:ring-orange-400'
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-500 shrink-0">mmol/L</span>
                    </div>
                    {glucoseReading && !(parseFloat(glucoseReading) >= 1 && parseFloat(glucoseReading) <= 35) ? (
                      <p className="text-xs text-red-500 mt-1.5">Value must be between 1 and 35 mmol/L</p>
                    ) : glucoseTimestamp ? (
                      <p className="text-xs text-green-600 mt-1.5">✓ Recorded at {new Date(glucoseTimestamp).toLocaleTimeString()}</p>
                    ) : (
                      <p className="text-xs text-blue-500 mt-1.5">💡 Tip: Check patient's glucometer before administering</p>
                    )}
                  </div>
                ) : (
                  <div className={`bg-white rounded-xl border border-slate-200 p-4 ${!requiresDrawnUpDose ? 'col-span-2' : ''}`}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      rows={3}
                      placeholder="Administration notes..."
                    />
                  </div>
                )}

                {/* If glucose + notes both needed, show notes below */}
                {requiresGlucoseReading && (
                  <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      rows={2}
                      placeholder="Administration notes..."
                    />
                  </div>
                )}

                {/* ── Sign & Submit ── full width */}
                <div className={`col-span-2 rounded-xl border-2 p-4 transition-all duration-300 ${
                  allReady ? 'bg-green-50 border-green-400 shadow-md' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Student Sign-off <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className={`w-full px-4 py-2.5 text-base border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                          studentName.trim()
                            ? 'border-green-400 bg-white focus:ring-green-300'
                            : 'border-slate-300 bg-slate-50 focus:ring-blue-400'
                        }`}
                        placeholder="Your full name — required to save"
                      />
                    </div>

                    <button
                      onClick={handleAdministration}
                      disabled={!allReady}
                      className={`shrink-0 px-8 py-2.5 rounded-xl text-base font-bold transition-all duration-200 ${
                        allReady
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {allReady ? (
                          <><CheckCircle className="h-5 w-5" /> Administer</>
                        ) : (
                          <span className="text-sm">
                            {nextBlocker === 'resolve' ? 'Fix Verification' :
                             nextBlocker === 'dose'    ? '↑ Enter Dose Drawn Up' :
                             nextBlocker === 'glucose' ? '↑ Enter Glucose' :
                                                        '↑ Enter Name'}
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                  {!allReady && (
                    <p className="text-xs text-slate-400 mt-1.5 text-right">All fields above must be completed before administering</p>
                  )}
                </div>

              </div>
            )}

            {/* ── COMPLETE ── */}
            {currentStep === 'complete' && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                {/* Success icon */}
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Medication Administration Recorded</h2>
                <p className="text-slate-500 mb-6 text-sm">
                  This administration has been saved and will appear in the debrief report.
                </p>

                {/* Summary card */}
                <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl overflow-hidden text-left mb-6 shadow-sm">
                  <div className="bg-green-600 px-4 py-2.5">
                    <p className="text-white text-xs font-semibold uppercase tracking-wider">Administration Summary</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-500">Patient</span>
                      <span className="font-semibold text-slate-800">{patient.first_name} {patient.last_name}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-500">Medication</span>
                      <span className="font-semibold text-slate-800">{medication.name}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-500">Label concentration</span>
                      <span className="font-semibold text-slate-800">{medication.dosage}</span>
                    </div>
                    {administeredDose.trim() && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <span className="text-slate-500">Drawn up</span>
                        <span className="font-semibold text-blue-700">{administeredDose.trim()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-500">Route</span>
                      <span className="font-semibold text-slate-800">{medication.route}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-500">Administered by</span>
                      <span className="font-semibold text-slate-800">{studentName}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-500">Time</span>
                      <span className="font-semibold text-slate-800">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-slate-500">BCMA</span>
                      <span className={`font-semibold ${overriddenChecks.length === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                        {overriddenChecks.length === 0 ? '✓ Compliant' : '⚠ Override Applied'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onAdministrationComplete(true, completionLog)}
                  className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-lg">
                  Done
                </button>
              </div>
            )}

          </div>{/* end right col */}
        </div>{/* end body */}
      </div>{/* end modal */}

      {/* ── Override Modal ── */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Override Verification</h3>
                <button onClick={() => setShowOverrideModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Failed Verification Checks:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {getFailedChecks().map((check) => (
                    <li key={check}><span className="font-medium capitalize">Right {check}:</span> {getCheckDescription(check)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Override <span className="text-red-500">*</span></label>
                <textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows={4} placeholder="Explain why this verification is being overridden..." required />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800"><strong>Warning:</strong> This action will be logged for audit purposes.</p>
              </div>
            </div>
            <div className="flex space-x-3 p-6 pt-0">
              <button onClick={() => setShowOverrideModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleOverride} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium">Apply Override</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Glucose Reading Modal ── */}
    </div>
  );
};
