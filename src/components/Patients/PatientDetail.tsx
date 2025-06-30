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
import { MedicationBarcode } from './MedicationBarcode';
import { generateCode128SVG } from '../../utils/barcodeUtils';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'vitals' | 'mar' | 'notes' | 'admission-records' | 'advanced-directives' | 'physicians-orders' | 'consults' | 'labs-reports' | 'care-plan' | 'assessments'>('overview');
  const [activeVitalsTab, setActiveVitalsTab] = useState<'current' | 'neuro-vs' | 'frequent' | 'pre-op' | 'post-op'>('current');
  const [activeMedicationTab, setActiveMedicationTab] = useState<'scheduled' | 'prn' | 'iv-fluids' | 'diabetic'>('scheduled');
  const [activeAssessmentTab, setActiveAssessmentTab] = useState<'overview' | 'wounds' | 'fluid-balance' | 'bowel-record'>('overview');
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<PatientNote['type']>('General');
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [currentVitals, setCurrentVitals] = useState<VitalSigns>(patient.vitals);
  const [showBracelet, setShowBracelet] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'Stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'Improving': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSaveVitals = (newVitals: VitalSigns) => {
    setCurrentVitals(newVitals);
    setShowVitalsEditor(false);
    // In a real app, this would save to the database
    console.log('Saving vitals:', newVitals);
  };

  // Mock PRN medications data
  const prnMedications = [
    {
      id: 'prn-001',
      name: 'Acetaminophen',
      dosage: '650mg',
      frequency: 'Every 6 hours as needed',
      route: 'Oral',
      indication: 'Pain or fever',
      maxDose: '4000mg/24hr',
      lastGiven: '2024-01-20T14:30:00',
      prescribedBy: 'Dr. Wilson',
      status: 'Active'
    },
    {
      id: 'prn-002',
      name: 'Ondansetron',
      dosage: '4mg',
      frequency: 'Every 8 hours as needed',
      route: 'IV',
      indication: 'Nausea/vomiting',
      maxDose: '32mg/24hr',
      lastGiven: null,
      prescribedBy: 'Dr. Chen',
      status: 'Active'
    },
    {
      id: 'prn-003',
      name: 'Lorazepam',
      dosage: '0.5mg',
      frequency: 'Every 4 hours as needed',
      route: 'Oral',
      indication: 'Anxiety',
      maxDose: '6mg/24hr',
      lastGiven: '2024-01-20T10:15:00',
      prescribedBy: 'Dr. Martinez',
      status: 'Active'
    }
  ];

  // Mock IV Fluids data
  const ivFluids = [
    {
      id: 'iv-001',
      name: 'Normal Saline 0.9%',
      concentration: '0.9% NaCl',
      rate: '125 mL/hr',
      volume: '1000 mL',
      started: '2024-01-20T08:00:00',
      remaining: '650 mL',
      site: 'Left forearm 18G',
      prescribedBy: 'Dr. Wilson',
      status: 'Infusing'
    },
    {
      id: 'iv-002',
      name: 'Lactated Ringers',
      concentration: 'LR Solution',
      rate: '75 mL/hr',
      volume: '500 mL',
      started: '2024-01-20T12:00:00',
      remaining: '200 mL',
      site: 'Right hand 20G',
      prescribedBy: 'Dr. Chen',
      status: 'Infusing'
    },
    {
      id: 'iv-003',
      name: 'D5W with KCl',
      concentration: '5% Dextrose + 20mEq KCl',
      rate: '100 mL/hr',
      volume: '1000 mL',
      started: '2024-01-19T20:00:00',
      remaining: '0 mL',
      site: 'Left forearm 18G',
      prescribedBy: 'Dr. Martinez',
      status: 'Completed'
    }
  ];

  // Mock Diabetic Record data
  const diabeticRecord = [
    {
      id: 'bg-001',
      time: '2024-01-20T07:30:00',
      glucose: 145,
      insulin: 'Humalog 8 units',
      carbs: 45,
      notes: 'Pre-breakfast',
      nurseName: 'Sarah Johnson'
    },
    {
      id: 'bg-002',
      time: '2024-01-20T11:30:00',
      glucose: 180,
      insulin: 'Humalog 10 units',
      carbs: 60,
      notes: 'Pre-lunch, slightly elevated',
      nurseName: 'Sarah Johnson'
    },
    {
      id: 'bg-003',
      time: '2024-01-20T17:30:00',
      glucose: 120,
      insulin: 'Humalog 6 units',
      carbs: 40,
      notes: 'Pre-dinner, good control',
      nurseName: 'Sarah Johnson'
    }
  ];

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'vitals', label: 'Vital Signs' },
    { id: 'mar', label: 'MAR' },
    { id: 'notes', label: 'Notes' },
    { id: 'admission-records', label: 'Admission Records' },
    { id: 'advanced-directives', label: 'Advanced Directives' },
    { id: 'physicians-orders', label: 'Physicians Orders' },
    { id: 'consults', label: 'Consults' },
    { id: 'labs-reports', label: 'Labs & Reports' },
    { id: 'care-plan', label: 'Care Plan' },
    { id: 'assessments', label: 'Assessments' },
  ];

  const vitalsSubTabs = [
    { id: 'current', label: 'Current Vitals' },
    { id: 'neuro-vs', label: 'Neuro VS' },
    { id: 'frequent', label: 'Frequent Assessment' },
    { id: 'pre-op', label: 'Pre-op Assessment' },
    { id: 'post-op', label: 'Post-op Assessment' },
  ];

  const medicationSubTabs = [
    { id: 'scheduled', label: 'Regularly Scheduled' },
    { id: 'prn', label: 'PRN' },
    { id: 'iv-fluids', label: 'IV Fluids' },
    { id: 'diabetic', label: 'Diabetic Record' },
  ];

  const assessmentSubTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'wounds', label: 'Wounds' },
    { id: 'fluid-balance', label: 'Fluid Balance' },
    { id: 'bowel-record', label: 'Bowel Record' },
  ];

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

  const renderMedicationContent = () => {
    switch (activeMedicationTab) {
      case 'scheduled':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Regularly Scheduled Medications</h3>
            
            {patient.medications.filter(med => med.status === 'Active').map((medication) => (
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
                    <button
                      onClick={() => setSelectedMedication(medication)}
                      className="mt-2 text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 transition-colors"
                    >
                      Medication Labels
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'prn':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">PRN (As Needed) Medications</h3>
              <div className="text-sm text-gray-500">
                {prnMedications.length} PRN medications available
              </div>
            </div>
            
            {prnMedications.map((medication) => (
              <div key={medication.id} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <Pill className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                      <p className="text-sm text-gray-600">
                        {medication.dosage} • {medication.frequency} • {medication.route}
                      </p>
                      <p className="text-sm text-yellow-800 font-medium mt-1">
                        <strong>Indication:</strong> {medication.indication}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Prescribed by {medication.prescribedBy} • Max: {medication.maxDose}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Last Given</p>
                    <p className="text-sm text-gray-600">
                      {medication.lastGiven 
                        ? format(new Date(medication.lastGiven), 'MMM dd, HH:mm')
                        : 'Not given yet'
                      }
                    </p>
                    <button
                      onClick={() => setSelectedMedication(medication)}
                      className="mt-2 text-xs bg-purple-600 text-white px-3 py-1 rounded-full hover:bg-purple-700 transition-colors"
                    >
                      Medication Labels
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">PRN Medication Guidelines</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Assess patient need before administration</li>
                <li>• Document reason for administration</li>
                <li>• Monitor for effectiveness and side effects</li>
                <li>• Respect maximum daily dose limits</li>
                <li>• Check for drug interactions and allergies</li>
              </ul>
            </div>
          </div>
        );

      case 'iv-fluids':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">IV Fluid Administration</h3>
              <div className="text-sm text-gray-500">
                {ivFluids.filter(iv => iv.status === 'Infusing').length} active infusions
              </div>
            </div>
            
            {ivFluids.map((fluid) => (
              <div key={fluid.id} className={`rounded-lg p-4 border ${
                fluid.status === 'Infusing' 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      fluid.status === 'Infusing' 
                        ? 'bg-blue-100' 
                        : 'bg-gray-100'
                    }`}>
                      <Droplet className={`h-4 w-4 ${
                        fluid.status === 'Infusing' 
                          ? 'text-blue-600' 
                          : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{fluid.name}</h4>
                      <p className="text-sm text-gray-600">
                        {fluid.concentration} • {fluid.rate} • {fluid.volume}
                      </p>
                      <p className="text-sm text-blue-800 font-medium mt-1">
                        <strong>Site:</strong> {fluid.site}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Prescribed by {fluid.prescribedBy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      fluid.status === 'Infusing' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {fluid.status}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Started:</strong> {format(new Date(fluid.started), 'MMM dd, HH:mm')}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Remaining:</strong> {fluid.remaining}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">IV Fluid Monitoring</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Monitor infusion rate and pump settings</li>
                <li>• Assess IV site for infiltration or phlebitis</li>
                <li>• Document fluid intake and output</li>
                <li>• Check for signs of fluid overload</li>
                <li>• Ensure proper labeling and identification</li>
              </ul>
            </div>
          </div>
        );

      case 'diabetic':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Diabetic Blood Glucose Record</h3>
              <div className="text-sm text-gray-500">
                Last 3 readings
              </div>
            </div>
            
            {diabeticRecord.map((record) => (
              <div key={record.id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Blood Glucose: {record.glucose} mg/dL
                      </h4>
                      <p className="text-sm text-gray-600">
                        <strong>Insulin:</strong> {record.insulin}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Carbohydrates:</strong> {record.carbs}g
                      </p>
                      <p className="text-sm text-green-800 font-medium mt-1">
                        <strong>Notes:</strong> {record.notes}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Recorded by {record.nurseName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">Time</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(record.time), 'MMM dd, HH:mm')}
                    </p>
                    <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                      record.glucose < 70 ? 'bg-red-100 text-red-800' :
                      record.glucose > 180 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {record.glucose < 70 ? 'Low' :
                       record.glucose > 180 ? 'High' :
                       'Normal'}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Diabetic Care Guidelines</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Check blood glucose before meals and at bedtime</li>
                <li>• Document glucose readings and insulin given</li>
                <li>• Monitor for signs of hypo/hyperglycemia</li>
                <li>• Check ketones if glucose &gt;250 mg/dL</li>
                <li>• Follow sliding scale insulin protocol</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Patients</span>
          </button>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConditionColor(patient.condition)}`}>
              {patient.condition}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-gray-600">
              {age} years old • {patient.gender} • Room {patient.roomNumber}{patient.bedNumber}
            </p>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-sm text-blue-600 font-mono">Patient ID: {patient.patientId}</p>
              <button
                onClick={() => setShowBracelet(true)}
                className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <QrCode className="h-3 w-3" />
                <span>Patient Labels</span>
              </button>
            </div>
          </div>
          
          {/* UPC-128 Barcode next to patient name */}
          <div className="flex items-center space-x-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2 font-medium">Patient ID Barcode</p>
                {generateCode128SVG(patient.patientId, {
                  width: 120,
                  height: 30,
                  showText: true,
                  className: 'mx-auto'
                })}
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-6">
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
                    <span className="text-gray-600">Patient ID:</span>
                    <span className="font-medium font-mono">{patient.patientId}</span>
                  </div>
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
                  {patient.diagnosis && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Diagnosis:</span>
                      <span className="font-medium">{patient.diagnosis}</span>
                    </div>
                  )}
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

        {activeSection === 'mar' && (
          <div className="space-y-6">
            {/* Sub-navigation for MAR */}
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

        {activeSection === 'notes' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Note</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note Content</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your note here..."
                  />
                </div>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>Add Note</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              
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

      {selectedMedication && (
        <MedicationBarcode
          medication={selectedMedication}
          patientName={`${patient.firstName} ${patient.lastName}`}
          patientId={patient.patientId}
          onClose={() => setSelectedMedication(null)}
        />
      )}
    </div>
  );
};