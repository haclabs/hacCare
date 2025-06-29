import React, { useState } from 'react';
import { Patient, PatientNote, VitalSigns } from '../../types';
import { 
  ArrowLeft, User, Phone, AlertTriangle, Droplet, 
  Thermometer, Heart, Activity, Pill, FileText, Plus, Edit, QrCode 
} from 'lucide-react';
import { format } from 'date-fns';
import { VitalSignsEditor } from './VitalSignsEditor';
import { VitalsTrends } from './VitalsTrends';
import { HospitalBracelet } from './HospitalBracelet';
import { WoundAssessment } from './WoundAssessment';
import { generateCode128SVG } from '../../utils/barcodeUtils';

/**
 * Patient Detail Component
 * 
 * Comprehensive patient information display with tabbed interface.
 * Shows detailed patient data including demographics, vital signs,
 * medications, assessments, and medical history.
 * 
 * Features:
 * - Tabbed navigation for different information sections
 * - Real-time vital signs with trend analysis
 * - Medication management with MAR (Medication Administration Record)
 * - Assessment tools including wound assessment
 * - Patient bracelet generation
 * - Code-128 barcode for patient identification
 * - Handover notes and documentation
 * 
 * @param {Object} props - Component props
 * @param {Patient} props.patient - Patient data to display
 * @param {Function} props.onBack - Callback when back button is clicked
 */
interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  // State management for different sections and modals
  const [activeSection, setActiveSection] = useState<'overview' | 'vitals' | 'medications' | 'handover-notes' | 'admission-records' | 'advanced-directives' | 'physicians-orders' | 'consults' | 'labs-reports' | 'care-plan' | 'assessments'>('overview');
  const [activeVitalsTab, setActiveVitalsTab] = useState<'current' | 'neuro-vs' | 'frequent' | 'pre-op' | 'post-op'>('current');
  const [activeAssessmentTab, setActiveAssessmentTab] = useState<'overview' | 'wounds' | 'fluid-balance' | 'bowel-record'>('overview');
  const [activeMedicationTab, setActiveMedicationTab] = useState<'scheduled' | 'prn' | 'iv-fluids' | 'diabetic'>('scheduled');
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<PatientNote['type']>('General');
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [currentVitals, setCurrentVitals] = useState<VitalSigns>(patient.vitals);
  const [showBracelet, setShowBracelet] = useState(false);

  // Calculate patient age
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  /**
   * Get CSS classes for patient condition styling
   * @param {Patient['condition']} condition - Patient's current condition
   * @returns {string} CSS classes for condition badge
   */
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'Stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'Improving': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Handle vital signs save
   * Updates the current vital signs and closes the editor
   * @param {VitalSigns} newVitals - New vital signs data
   */
  const handleSaveVitals = (newVitals: VitalSigns) => {
    setCurrentVitals(newVitals);
    setShowVitalsEditor(false);
    // In a real app, this would save to the database
    console.log('Saving vitals:', newVitals);
  };

  // Navigation sections configuration
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'vitals', label: 'Vital Signs' },
    { id: 'medications', label: 'MAR' },
    { id: 'handover-notes', label: 'Handover Notes' },
    { id: 'admission-records', label: 'Admission Records' },
    { id: 'advanced-directives', label: 'Advanced Directives' },
    { id: 'physicians-orders', label: 'Physicians Orders' },
    { id: 'consults', label: 'Consults' },
    { id: 'labs-reports', label: 'Labs & Reports' },
    { id: 'care-plan', label: 'Care Plan' },
    { id: 'assessments', label: 'Assessments' },
  ];

  // Vital signs sub-navigation
  const vitalsSubTabs = [
    { id: 'current', label: 'Current Vitals' },
    { id: 'neuro-vs', label: 'Neuro VS' },
    { id: 'frequent', label: 'Frequent Assessment' },
    { id: 'pre-op', label: 'Pre-op Assessment' },
    { id: 'post-op', label: 'Post-op Assessment' },
  ];

  // Medication sub-navigation
  const medicationSubTabs = [
    { id: 'scheduled', label: 'Regularly Scheduled' },
    { id: 'prn', label: 'PRN' },
    { id: 'iv-fluids', label: 'IV Fluids' },
    { id: 'diabetic', label: 'Diabetic Record' },
  ];

  // Assessment sub-navigation
  const assessmentSubTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'wounds', label: 'Wounds' },
    { id: 'fluid-balance', label: 'Fluid Balance' },
    { id: 'bowel-record', label: 'Bowel Record' },
  ];

  // Demo PRN medications
  const prnMedications = [
    {
      id: 'prn-001',
      name: 'Acetaminophen',
      dosage: '650mg',
      route: 'PO',
      indication: 'Pain or fever',
      frequency: 'Q6H PRN',
      maxDose: '4g/24hr',
      lastGiven: '2024-01-20T14:30:00',
      givenBy: 'Sarah Johnson, RN',
      effectiveness: 'Good pain relief reported'
    },
    {
      id: 'prn-002',
      name: 'Ondansetron',
      dosage: '4mg',
      route: 'IV',
      indication: 'Nausea/vomiting',
      frequency: 'Q8H PRN',
      maxDose: '32mg/24hr',
      lastGiven: null,
      givenBy: null,
      effectiveness: null
    },
    {
      id: 'prn-003',
      name: 'Lorazepam',
      dosage: '0.5mg',
      route: 'PO',
      indication: 'Anxiety',
      frequency: 'Q6H PRN',
      maxDose: '2mg/24hr',
      lastGiven: '2024-01-20T08:00:00',
      givenBy: 'Michael Chen, RN',
      effectiveness: 'Patient calmer after administration'
    }
  ];

  // Demo IV fluids
  const ivFluids = [
    {
      id: 'iv-001',
      solution: 'Normal Saline 0.9%',
      volume: '1000mL',
      rate: '125mL/hr',
      startTime: '2024-01-20T06:00:00',
      endTime: '2024-01-20T14:00:00',
      site: 'Left forearm 20G',
      status: 'Infusing',
      remainingVolume: '375mL',
      nurse: 'Sarah Johnson, RN'
    },
    {
      id: 'iv-002',
      solution: 'D5W with 20mEq KCl',
      volume: '1000mL',
      rate: '100mL/hr',
      startTime: '2024-01-20T14:00:00',
      endTime: '2024-01-20T24:00:00',
      site: 'Left forearm 20G',
      status: 'Scheduled',
      remainingVolume: '1000mL',
      nurse: 'Sarah Johnson, RN'
    }
  ];

  // Demo diabetic records
  const diabeticRecords = [
    {
      id: 'bg-001',
      time: '2024-01-20T07:30:00',
      bloodGlucose: 142,
      insulinType: 'Humalog',
      insulinDose: '6 units',
      method: 'Subcutaneous',
      site: 'Abdomen',
      nurse: 'Sarah Johnson, RN',
      notes: 'Pre-breakfast reading'
    },
    {
      id: 'bg-002',
      time: '2024-01-20T11:30:00',
      bloodGlucose: 156,
      insulinType: 'Humalog',
      insulinDose: '4 units',
      method: 'Subcutaneous',
      site: 'Thigh',
      nurse: 'Sarah Johnson, RN',
      notes: 'Pre-lunch reading'
    },
    {
      id: 'bg-003',
      time: '2024-01-20T17:30:00',
      bloodGlucose: 134,
      insulinType: 'Humalog',
      insulinDose: '5 units',
      method: 'Subcutaneous',
      site: 'Abdomen',
      nurse: 'Sarah Johnson, RN',
      notes: 'Pre-dinner reading'
    }
  ];

  /**
   * Render vital signs content based on active tab
   * @returns {JSX.Element} Vital signs content
   */
  const renderVitalsContent = () => {
    switch (activeVitalsTab) {
      case 'current':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Current Vital Signs</h3>
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-500">
                  Last updated: {format(new Date(currentVitals.lastUpdated), 'MMM dd, yyyy HH:mm')}
                </p>
                <button
                  onClick={() => setShowVitalsEditor(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Update Vitals</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Thermometer className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{currentVitals.temperature}°F</p>
                <p className="text-sm text-blue-600">Temperature</p>
              </div>

              <div className="bg-red-50 rounded-lg p-4 text-center">
                <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-900">{currentVitals.heartRate}</p>
                <p className="text-sm text-red-600">Heart Rate (BPM)</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 text-center">
                <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{currentVitals.oxygenSaturation}%</p>
                <p className="text-sm text-green-600">O2 Saturation</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="h-8 w-8 bg-purple-600 rounded mx-auto mb-2 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">BP</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {currentVitals.bloodPressure.systolic}/{currentVitals.bloodPressure.diastolic}
                </p>
                <p className="text-sm text-purple-600">Blood Pressure</p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <Activity className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-indigo-900">{currentVitals.respiratoryRate}</p>
                <p className="text-sm text-indigo-600">Respiratory Rate</p>
              </div>

              {/* Vitals Trends Box */}
              <VitalsTrends currentVitals={currentVitals} />
            </div>

            {/* Link to Assessment Tab */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Complete Assessment</h4>
                  <p className="text-sm text-blue-700">View detailed patient assessment including vitals</p>
                </div>
                <button
                  onClick={() => setActiveSection('assessments')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Go to Assessment
                </button>
              </div>
            </div>
          </div>
        );

      case 'neuro-vs':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Neurological Vital Signs</h3>
            <p className="text-gray-600">Glasgow Coma Scale, pupil response, and neurological assessments coming soon...</p>
          </div>
        );

      case 'frequent':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Frequent Assessment</h3>
            <p className="text-gray-600">Hourly vital signs monitoring and frequent assessment protocols coming soon...</p>
          </div>
        );

      case 'pre-op':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Pre-operative Assessment</h3>
            <p className="text-gray-600">Pre-surgical vital signs, baseline measurements, and surgical readiness assessment coming soon...</p>
          </div>
        );

      case 'post-op':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Post-operative Assessment</h3>
            <p className="text-gray-600">Post-surgical monitoring, recovery vital signs, and post-op complications tracking coming soon...</p>
          </div>
        );

      default:
        return null;
    }
  };

  /**
   * Render medication content based on active tab
   * @returns {JSX.Element} Medication content
   */
  const renderMedicationContent = () => {
    const activeMedications = patient.medications.filter(med => med.status === 'Active');
    
    switch (activeMedicationTab) {
      case 'scheduled':
        const scheduledMeds = activeMedications.filter(med => 
          !med.frequency.toLowerCase().includes('prn') && 
          !med.frequency.toLowerCase().includes('as needed')
        );
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Regularly Scheduled Medications</h3>
            
            {scheduledMeds.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No regularly scheduled medications</p>
              </div>
            ) : (
              scheduledMeds.map((medication) => (
                <div key={medication.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Pill className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                        <p className="text-sm text-gray-600">
                          {medication.dosage} • {medication.frequency} • {medication.route}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Prescribed by {medication.prescribedBy}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Next Due</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(medication.nextDue), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'prn':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">PRN (As Needed) Medications</h3>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Document Administration</span>
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">PRN Medication Guidelines</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Assess patient need before administration</li>
                <li>• Document reason for administration</li>
                <li>• Monitor patient response and effectiveness</li>
                <li>• Follow minimum interval requirements</li>
                <li>• Check maximum daily dose limits</li>
              </ul>
            </div>

            <div className="space-y-4">
              {prnMedications.map((med) => (
                <div key={med.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <Pill className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{med.name}</h4>
                        <p className="text-sm text-gray-600">
                          {med.dosage} {med.route} • {med.frequency}
                        </p>
                        <p className="text-sm text-blue-600 font-medium">
                          For: {med.indication}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                        PRN
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>Max Daily Dose:</strong></p>
                      <p className="text-gray-900">{med.maxDose}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Last Given:</strong></p>
                      <p className="text-gray-900">
                        {med.lastGiven ? format(new Date(med.lastGiven), 'MMM dd, HH:mm') : 'Not given today'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Given By:</strong></p>
                      <p className="text-gray-900">{med.givenBy || 'N/A'}</p>
                    </div>
                  </div>

                  {med.effectiveness && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800">
                        <strong>Effectiveness:</strong> {med.effectiveness}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
                      Administer
                    </button>
                    <button className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors">
                      Document Refusal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'iv-fluids':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">IV Fluids & Infusions</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Start New IV</span>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">IV Fluid Monitoring</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Monitor infusion rate and volume</li>
                <li>• Check IV site for complications</li>
                <li>• Document intake and output</li>
                <li>• Assess patient fluid balance</li>
                <li>• Verify pump settings hourly</li>
              </ul>
            </div>

            <div className="space-y-4">
              {ivFluids.map((fluid) => (
                <div key={fluid.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Droplet className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{fluid.solution}</h4>
                        <p className="text-sm text-gray-600">
                          {fluid.volume} at {fluid.rate}
                        </p>
                        <p className="text-sm text-gray-500">
                          Site: {fluid.site}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        fluid.status === 'Infusing' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {fluid.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>Start Time:</strong></p>
                      <p className="text-gray-900">{format(new Date(fluid.startTime), 'MMM dd, HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>End Time:</strong></p>
                      <p className="text-gray-900">{format(new Date(fluid.endTime), 'MMM dd, HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Remaining:</strong></p>
                      <p className="text-gray-900 font-medium">{fluid.remainingVolume}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Nurse:</strong></p>
                      <p className="text-gray-900">{fluid.nurse}</p>
                    </div>
                  </div>

                  {fluid.status === 'Infusing' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-800 font-medium">Currently infusing</span>
                        </div>
                        <div className="text-sm text-green-700">
                          Progress: {((parseInt(fluid.volume) - parseInt(fluid.remainingVolume)) / parseInt(fluid.volume) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${((parseInt(fluid.volume) - parseInt(fluid.remainingVolume)) / parseInt(fluid.volume) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-2">
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
                      Check Site
                    </button>
                    <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors">
                      Document I/O
                    </button>
                    <button className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors">
                      Change Rate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'diabetic':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Diabetic Medication Record</h3>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Record Blood Glucose</span>
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Blood Glucose Management</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Monitor blood glucose levels per protocol</li>
                <li>• Administer insulin per sliding scale</li>
                <li>• Document glucose readings and insulin given</li>
                <li>• Monitor for signs of hypo/hyperglycemia</li>
                <li>• Check ketones if glucose &gt;250 mg/dL</li>
              </ul>
            </div>

            {/* Blood Glucose Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">142</div>
                <div className="text-sm text-gray-600">Latest BG (mg/dL)</div>
                <div className="text-xs text-gray-500 mt-1">07:30 AM</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">15</div>
                <div className="text-sm text-gray-600">Total Insulin (units)</div>
                <div className="text-xs text-gray-500 mt-1">Today</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">3</div>
                <div className="text-sm text-gray-600">Readings Today</div>
                <div className="text-xs text-gray-500 mt-1">Target: 4</div>
              </div>
            </div>

            {/* Diabetic Records */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Today's Blood Glucose & Insulin Record</h4>
              
              {diabeticRecords.map((record) => (
                <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="bg-red-100 p-2 rounded-full">
                        <Activity className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900">
                          {format(new Date(record.time), 'HH:mm')} - {record.notes}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {format(new Date(record.time), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        record.bloodGlucose < 70 ? 'text-red-600' :
                        record.bloodGlucose > 180 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {record.bloodGlucose} mg/dL
                      </div>
                      <div className="text-xs text-gray-500">Blood Glucose</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>Insulin Type:</strong></p>
                      <p className="text-gray-900">{record.insulinType}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Dose Given:</strong></p>
                      <p className="text-gray-900 font-medium">{record.insulinDose}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Site:</strong></p>
                      <p className="text-gray-900">{record.site}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Nurse:</strong></p>
                      <p className="text-gray-900">{record.nurse}</p>
                    </div>
                  </div>

                  {/* Blood Glucose Range Indicator */}
                  <div className="mt-3 p-2 rounded">
                    {record.bloodGlucose < 70 && (
                      <div className="bg-red-100 border border-red-300 rounded p-2">
                        <p className="text-red-800 text-sm font-medium">
                          ⚠️ HYPOGLYCEMIA - Monitor closely for symptoms
                        </p>
                      </div>
                    )}
                    {record.bloodGlucose > 180 && (
                      <div className="bg-orange-100 border border-orange-300 rounded p-2">
                        <p className="text-orange-800 text-sm font-medium">
                          ⚠️ HYPERGLYCEMIA - Consider additional insulin per protocol
                        </p>
                      </div>
                    )}
                    {record.bloodGlucose >= 70 && record.bloodGlucose <= 180 && (
                      <div className="bg-green-100 border border-green-300 rounded p-2">
                        <p className="text-green-800 text-sm font-medium">
                          ✓ TARGET RANGE - Continue current management
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sliding Scale Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Insulin Sliding Scale Reference</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700 mb-2">Humalog Sliding Scale:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• 150-199 mg/dL: 2 units</li>
                    <li>• 200-249 mg/dL: 4 units</li>
                    <li>• 250-299 mg/dL: 6 units</li>
                    <li>• 300-349 mg/dL: 8 units</li>
                    <li>• ≥350 mg/dL: 10 units + call MD</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-2">Monitoring Schedule:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• 07:30 - Pre-breakfast</li>
                    <li>• 11:30 - Pre-lunch</li>
                    <li>• 17:30 - Pre-dinner</li>
                    <li>• 21:00 - Bedtime</li>
                    <li>• PRN if symptomatic</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /**
   * Render assessment content based on active tab
   * @returns {JSX.Element} Assessment content
   */
  const renderAssessmentContent = () => {
    switch (activeAssessmentTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Current Vitals Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900">Current Vital Signs</h4>
                <button
                  onClick={() => setActiveSection('vitals')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Full Vitals →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-blue-700 font-medium">{currentVitals.temperature}°F</p>
                  <p className="text-blue-600">Temp</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-700 font-medium">{currentVitals.heartRate}</p>
                  <p className="text-blue-600">HR</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-700 font-medium">{currentVitals.bloodPressure.systolic}/{currentVitals.bloodPressure.diastolic}</p>
                  <p className="text-blue-600">BP</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-700 font-medium">{currentVitals.respiratoryRate}</p>
                  <p className="text-blue-600">RR</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-700 font-medium">{currentVitals.oxygenSaturation}%</p>
                  <p className="text-blue-600">O2 Sat</p>
                </div>
              </div>
            </div>

            {/* Assessment Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">General Assessment</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Condition:</strong> <span className={`px-2 py-1 rounded-full text-xs ${getConditionColor(patient.condition)}`}>{patient.condition}</span></p>
                  <p><strong>Consciousness:</strong> Alert and oriented</p>
                  <p><strong>Mobility:</strong> Ambulatory with assistance</p>
                  <p><strong>Pain Level:</strong> 3/10</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Respiratory</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Rate:</strong> {currentVitals.respiratoryRate}/min</p>
                  <p><strong>O2 Sat:</strong> {currentVitals.oxygenSaturation}%</p>
                  <p><strong>Breath Sounds:</strong> Clear bilaterally</p>
                  <p><strong>Oxygen:</strong> Room air</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Cardiovascular</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Heart Rate:</strong> {currentVitals.heartRate} BPM</p>
                  <p><strong>Blood Pressure:</strong> {currentVitals.bloodPressure.systolic}/{currentVitals.bloodPressure.diastolic}</p>
                  <p><strong>Rhythm:</strong> Regular</p>
                  <p><strong>Pulses:</strong> Strong and equal</p>
                </div>
              </div>
            </div>

            {/* Quick Links to Other Assessment Areas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveAssessmentTab('wounds')}
                className="bg-red-50 border border-red-200 rounded-lg p-4 text-left hover:bg-red-100 transition-colors"
              >
                <h4 className="font-medium text-red-900 mb-2">Wound Assessment</h4>
                <p className="text-sm text-red-700">Document and track wound healing progress</p>
              </button>

              <button
                onClick={() => setActiveAssessmentTab('fluid-balance')}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors"
              >
                <h4 className="font-medium text-blue-900 mb-2">Fluid Balance</h4>
                <p className="text-sm text-blue-700">Monitor intake and output measurements</p>
              </button>

              <button
                onClick={() => setActiveAssessmentTab('bowel-record')}
                className="bg-green-50 border border-green-200 rounded-lg p-4 text-left hover:bg-green-100 transition-colors"
              >
                <h4 className="font-medium text-green-900 mb-2">Bowel Record</h4>
                <p className="text-sm text-green-700">Track bowel movements and patterns</p>
              </button>
            </div>
          </div>
        );

      case 'wounds':
        return <WoundAssessment patientId={patient.id} />;

      case 'fluid-balance':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Fluid Balance Assessment</h3>
            <p className="text-gray-600">Intake and output monitoring, fluid balance calculations, and hydration status tracking coming soon...</p>
          </div>
        );

      case 'bowel-record':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Bowel Record Assessment</h3>
            <p className="text-gray-600">Bowel movement tracking, Bristol stool chart, and gastrointestinal assessment coming soon...</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Patients</span>
          </button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConditionColor(patient.condition)}`}>
            {patient.condition}
          </span>
        </div>

        <div className="flex items-start space-x-6">
          <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {patient.firstName} {patient.lastName}
                </h1>
                <p className="text-gray-600 mb-4">
                  {age} years old • {patient.gender} • Room {patient.roomNumber}{patient.bedNumber}
                </p>
              </div>
              
              {/* Code-128 Barcode and Patient Labels Button - Now stacked vertically */}
              <div className="ml-6 flex-shrink-0 flex flex-col items-center space-y-3">
                {/* Barcode positioned at the top */}
                {generateCode128SVG(patient.patientId, {
                  width: 180,
                  height: 40,
                  showText: true,
                  className: 'bg-white border border-gray-300 rounded-lg p-2'
                })}
                
                {/* Patient Labels Button positioned below the barcode */}
                <button
                  onClick={() => setShowBracelet(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Patient Labels</span>
                </button>
              </div>
            </div>
            
            {/* Patient Diagnosis - Better aligned and styled */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Primary Diagnosis</h3>
              <p className="text-blue-800 font-medium leading-relaxed">{patient.diagnosis}</p>
            </div>
          </div>
        </div>

        <nav className="mt-8">
          <div className="flex space-x-8 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`pb-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="p-6">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date of Birth:</span>
                    <span className="font-medium">{format(new Date(patient.dateOfBirth), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Blood Type:</span>
                    <span className="font-medium flex items-center">
                      <Droplet className="h-4 w-4 text-red-500 mr-1" />
                      {patient.bloodType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admission Date:</span>
                    <span className="font-medium">{format(new Date(patient.admissionDate), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Assigned Nurse:</span>
                    <span className="font-medium">{patient.assignedNurse}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{patient.emergencyContact.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Relationship:</span>
                    <span className="font-medium">{patient.emergencyContact.relationship}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Phone:</span>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{patient.emergencyContact.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {patient.allergies.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-amber-800">Allergies</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'vitals' && (
          <div className="space-y-6">
            {/* Sub-navigation for Vitals */}
            <nav className="border-b border-gray-200">
              <div className="flex space-x-8">
                {vitalsSubTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveVitalsTab(tab.id as any)}
                    className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                      activeVitalsTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {renderVitalsContent()}
          </div>
        )}

        {activeSection === 'medications' && (
          <div className="space-y-6">
            {/* Sub-navigation for Medications */}
            <nav className="border-b border-gray-200">
              <div className="flex space-x-8">
                {medicationSubTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveMedicationTab(tab.id as any)}
                    className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                      activeMedicationTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {renderMedicationContent()}
          </div>
        )}

        {activeSection === 'assessments' && (
          <div className="space-y-6">
            {/* Sub-navigation for Assessments */}
            <nav className="border-b border-gray-200">
              <div className="flex space-x-8">
                {assessmentSubTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAssessmentTab(tab.id as any)}
                    className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                      activeAssessmentTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {renderAssessmentContent()}
          </div>
        )}

        {activeSection === 'handover-notes' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Handover Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note Type</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as PatientNote['type'])}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Medication">Medication</option>
                    <option value="Vital Signs">Vital Signs</option>
                    <option value="Incident">Incident</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Handover Note Content</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter handover information for the next shift..."
                  />
                </div>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>Add Handover Note</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Handover Notes</h3>
              
              {patient.notes.map((note) => (
                <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{note.type}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        note.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                        note.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {note.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(note.timestamp), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <p className="text-gray-700 mb-2">{note.content}</p>
                  <p className="text-xs text-gray-500">By {note.nurseName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder sections for new tabs */}
        {activeSection === 'admission-records' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admission Records</h2>
            <p className="text-gray-600">Patient admission documentation, intake forms, and admission history coming soon...</p>
          </div>
        )}

        {activeSection === 'advanced-directives' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Advanced Directives</h2>
            <p className="text-gray-600">Living wills, healthcare proxies, DNR orders, and patient care preferences coming soon...</p>
          </div>
        )}

        {activeSection === 'physicians-orders' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Physicians Orders</h2>
            <p className="text-gray-600">Medical orders, prescriptions, treatment plans, and physician instructions coming soon...</p>
          </div>
        )}

        {activeSection === 'consults' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Consults</h2>
            <p className="text-gray-600">Specialist consultations, referrals, and interdisciplinary team communications coming soon...</p>
          </div>
        )}

        {activeSection === 'labs-reports' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Labs & Reports</h2>
            <p className="text-gray-600">Laboratory results, diagnostic reports, imaging studies, and test results coming soon...</p>
          </div>
        )}

        {activeSection === 'care-plan' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Care Plan</h2>
            <p className="text-gray-600">Nursing care plans, treatment goals, interventions, and care coordination coming soon...</p>
          </div>
        )}
      </div>

      {showVitalsEditor && (
        <VitalSignsEditor
          vitals={currentVitals}
          onSave={handleSaveVitals}
          onCancel={() => setShowVitalsEditor(false)}
        />
      )}

      {showBracelet && (
        <HospitalBracelet
          patient={patient}
          onClose={() => setShowBracelet(false)}
        />
      )}
    </div>
  );
};