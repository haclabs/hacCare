import React, { useState, useEffect } from 'react';
import { Patient } from '../../types';
import { 
  ArrowLeft, Edit, Thermometer, Heart, Activity, 
  Pill, FileText, User, Phone, Calendar, MapPin, 
  AlertTriangle, Clock, Stethoscope, QrCode, Printer,
  TrendingUp, Plus, Save, X, Target, Shield, Users,
  Clipboard, BookOpen, FileCheck, UserCheck, Settings,
  Zap, Award, CheckCircle, AlertCircle, Info, Star, Wrench, PenTool as Tool 
} from 'lucide-react';
import { format, differenceInDays, isValid } from 'date-fns';
import { VitalSignsEditor } from './VitalSignsEditor';
import { VitalsTrends } from './VitalsTrends';
import { PatientBracelet } from './PatientBracelet';
import { HospitalBracelet } from './HospitalBracelet';
import { MedicationBarcode } from './MedicationBarcode';
import { MedicationForm } from './MedicationForm';
import { PatientNoteForm } from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
import { WoundAssessment } from './WoundAssessment';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { usePatients } from '../../contexts/PatientContext';
import { fetchAdmissionRecord, fetchAdvancedDirective } from '../../lib/admissionService';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showBracelet, setShowBracelet] = useState(false);
  const [showWristband, setShowWristband] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [showMedicationBarcode, setShowMedicationBarcode] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAdvancedDirectivesForm, setShowAdvancedDirectivesForm] = useState(false);
  
  // State for admission records and advanced directives
  const [admissionRecord, setAdmissionRecord] = useState<any>(null);
  const [advancedDirective, setAdvancedDirective] = useState<any>(null);
  const [loadingAdmissionRecord, setLoadingAdmissionRecord] = useState(false);
  const [loadingAdvancedDirective, setLoadingAdvancedDirective] = useState(false);
  const [admissionError, setAdmissionError] = useState('');
  const [directiveError, setDirectiveError] = useState('');
  
  const { getPatient, updatePatient, refreshPatients } = usePatients();

  // Get the most current patient data from context
  const currentPatient = getPatient(patient.id) || patient;

  // Load admission record and advanced directives when tab changes
  useEffect(() => {
    if (activeTab === 'admission-records') {
      loadAdmissionRecord();
    } else if (activeTab === 'advanced-directives') {
      loadAdvancedDirective();
    }
  }, [activeTab, currentPatient.id]);

  // Load admission record
  const loadAdmissionRecord = async () => {
    try {
      setLoadingAdmissionRecord(true);
      setAdmissionError('');
      
      console.log('Loading admission record for tab display');
      const record = await fetchAdmissionRecord(currentPatient.id);
      setAdmissionRecord(record);
    } catch (err: any) {
      console.error('Error loading admission record for display:', err);
      setAdmissionError(err.message || 'Failed to load admission record');
    } finally {
      setLoadingAdmissionRecord(false);
    }
  };

  // Load advanced directive
  const loadAdvancedDirective = async () => {
    try {
      setLoadingAdvancedDirective(true);
      setDirectiveError('');
      
      console.log('Loading advanced directive for tab display');
      const directive = await fetchAdvancedDirective(currentPatient.id);
      setAdvancedDirective(directive);
    } catch (err: any) {
      console.error('Error loading advanced directive for display:', err);
      setDirectiveError(err.message || 'Failed to load advanced directive');
    } finally {
      setLoadingAdvancedDirective(false);
    }
  };

  // Calculate age and days admitted
  const birthDate = new Date(currentPatient.date_of_birth);
  const age = isValid(birthDate) ? new Date().getFullYear() - birthDate.getFullYear() : 'N/A';
  const admissionDate = new Date(currentPatient.admission_date);
  const daysAdmitted = isValid(admissionDate) ? differenceInDays(new Date(), admissionDate) : 0;

  const handleSaveVitals = (newVitals: any) => {
    // The VitalSignsEditor now handles saving to database
    // and refreshes the patient data automatically
    setShowVitalsEditor(false);
  };

  const handleSaveMedication = async (medicationData: any) => {
    try {
      // Update patient with new medication
      const updatedMedications = selectedMedication 
        ? currentPatient.medications.map(med => 
            med.id === selectedMedication.id ? medicationData : med
          )
        : [...(currentPatient.medications || []), medicationData];

      await updatePatient(currentPatient.id, {
        medications: updatedMedications
      });
      
      setShowMedicationForm(false);
      setSelectedMedication(null);
    } catch (error) {
      console.error('Error saving medication:', error);
      throw error;
    }
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      // Update patient with new note
      const updatedNotes = [...(currentPatient.notes || []), noteData];

      await updatePatient(currentPatient.id, {
        notes: updatedNotes
      });
      
      setShowNoteForm(false);
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  };

  const handleSaveAssessment = async (assessmentData: any) => {
    try {
      // In a real app, this would save to a separate assessments table
      console.log('Assessment saved:', assessmentData);
      setShowAssessmentForm(false);
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  };

  const handleSaveAdmissionRecord = async () => {
    setShowAdmissionForm(false);
    // Reload admission record data
    await loadAdmissionRecord();
  };

  const handleSaveAdvancedDirective = async () => {
    setShowAdvancedDirectivesForm(false);
    // Reload advanced directive data
    await loadAdvancedDirective();
  };

  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'Stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'Improving': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get latest vitals from the vitals array
  const latestVitals = currentPatient.vitals && currentPatient.vitals.length > 0 
    ? currentPatient.vitals.sort((a, b) => {
        const dateA = new Date(a.recorded_at || a.lastUpdated || 0);
        const dateB = new Date(b.recorded_at || b.lastUpdated || 0);
        return dateB.getTime() - dateA.getTime();
      })[0]
    : null;

  // Check if patient has any vitals data
  const hasVitalsData = latestVitals && (
    latestVitals.temperature > 0 ||
    latestVitals.heartRate > 0 ||
    latestVitals.bloodPressure?.systolic > 0 ||
    latestVitals.oxygenSaturation > 0 ||
    latestVitals.respiratoryRate > 0
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Summary Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentPatient.first_name} {currentPatient.last_name}
                    </h2>
                    <p className="text-gray-600">{age} years old • {currentPatient.gender}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                        {currentPatient.patient_id}
                      </span>
                      <button
                        onClick={() => setShowBracelet(true)}
                        className="text-sm text-gray-600 hover:text-blue-600 flex items-center space-x-1"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Patient Labels</span>
                      </button>
                      <button
                        onClick={() => setShowWristband(true)}
                        className="text-sm text-gray-600 hover:text-blue-600 flex items-center space-x-1"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Generate Patient Wristband</span>
                      </button>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConditionColor(currentPatient.condition)}`}>
                  {currentPatient.condition}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>Room {currentPatient.room_number}{currentPatient.bed_number}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Admitted {isValid(admissionDate) ? format(admissionDate, 'MMM dd, yyyy') : 'N/A'} ({daysAdmitted} days)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Stethoscope className="h-4 w-4" />
                    <span>Dr. Wilson (Attending)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Nurse: {currentPatient.assigned_nurse}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Activity className="h-4 w-4" />
                    <span>Blood Type: {currentPatient.blood_type}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>Emergency: {currentPatient.emergency_contact_name}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentPatient.allergies && currentPatient.allergies.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-red-800 font-medium text-sm">Allergies</span>
                      </div>
                      <div className="space-y-1">
                        {currentPatient.allergies.map((allergy, index) => (
                          <span key={index} className="block text-red-700 text-sm">{allergy}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Primary Diagnosis
              </h3>
              <p className="text-gray-700">{currentPatient.diagnosis}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowVitalsEditor(true)}
                className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Edit className="h-5 w-5" />
                <span>Record Vitals</span>
              </button>
              
              <button
                onClick={() => setActiveTab('medications')}
                className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Pill className="h-5 w-5" />
                <span>View Medications</span>
              </button>
              
              <button
                onClick={() => setShowNoteForm(true)}
                className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Add Note</span>
              </button>
            </div>
          </div>
        );

      case 'vitals':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
              <button
                onClick={() => setShowVitalsEditor(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Record Vitals</span>
              </button>
            </div>

            {!hasVitalsData ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Thermometer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Vital Signs Recorded</h3>
                <p className="text-gray-600 mb-4">
                  No vital signs have been recorded for this patient yet.
                </p>
                <button
                  onClick={() => setShowVitalsEditor(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Record First Vitals</span>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <Thermometer className="h-8 w-8 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-900">{latestVitals.temperature}°F</span>
                    </div>
                    <p className="text-blue-700 font-medium">Temperature</p>
                    <p className="text-blue-600 text-sm">Normal range: 97.8-99.1°F</p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <Heart className="h-8 w-8 text-red-600" />
                      <span className="text-2xl font-bold text-red-900">{latestVitals.heartRate}</span>
                    </div>
                    <p className="text-red-700 font-medium">Heart Rate (BPM)</p>
                    <p className="text-red-600 text-sm">Normal range: 60-100 BPM</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="h-8 w-8 text-purple-600" />
                      <span className="text-2xl font-bold text-purple-900">
                        {latestVitals.bloodPressure?.systolic}/{latestVitals.bloodPressure?.diastolic}
                      </span>
                    </div>
                    <p className="text-purple-700 font-medium">Blood Pressure</p>
                    <p className="text-purple-600 text-sm">Normal: <120/80 mmHg</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="h-8 w-8 text-green-600" />
                      <span className="text-2xl font-bold text-green-900">{latestVitals.oxygenSaturation}%</span>
                    </div>
                    <p className="text-green-700 font-medium">O2 Saturation</p>
                    <p className="text-green-600 text-sm">Normal range: 95-100%</p>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="h-8 w-8 text-indigo-600" />
                      <span className="text-2xl font-bold text-indigo-900">{latestVitals.respiratoryRate}</span>
                    </div>
                    <p className="text-indigo-700 font-medium">Respiratory Rate</p>
                    <p className="text-indigo-600 text-sm">Normal range: 12-20/min</p>
                  </div>

                  <VitalsTrends vitals={currentPatient.vitals} />
                </div>

                {latestVitals?.lastUpdated && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      <strong>Last Updated:</strong> {format(new Date(latestVitals.lastUpdated), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Medication Administration Record (MAR)</h3>
              <button 
                onClick={() => {
                  setSelectedMedication(null);
                  setShowMedicationForm(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Medication</span>
              </button>
            </div>

            {!currentPatient.medications || currentPatient.medications.filter(med => med.status === 'Active').length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Medications</h3>
                <p className="text-gray-600 mb-4">
                  No medications have been prescribed for this patient yet.
                </p>
                <button
                  onClick={() => {
                    setSelectedMedication(null);
                    setShowMedicationForm(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Medication</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {currentPatient.medications.filter(med => med.status === 'Active').map((medication) => (
                  <div key={medication.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Pill className="h-6 w-6 text-green-600" />
                          <h4 className="text-lg font-semibold text-gray-900">{medication.name}</h4>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                            {medication.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Dosage</p>
                            <p className="font-medium text-red-600">{medication.dosage}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Frequency</p>
                            <p className="font-medium">{medication.frequency}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Route</p>
                            <p className="font-medium">{medication.route}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Prescribed by</p>
                            <p className="font-medium">{medication.prescribed_by}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-600">Next due: </span>
                            <span className="font-medium text-blue-600">
                              {format(new Date(medication.next_due), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Started: </span>
                            <span className="font-medium">
                              {format(new Date(medication.start_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedMedication(medication);
                            setShowMedicationBarcode(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Generate Medication Labels"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedMedication(medication);
                            setShowMedicationForm(true);
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              <button 
                onClick={() => setShowNoteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="space-y-4">
              {currentPatient.notes && currentPatient.notes.length > 0 ? (
                currentPatient.notes.map((note) => (
                  <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{note.type}</h4>
                          <p className="text-sm text-gray-600">by {note.nurse_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          note.priority === 'High' ? 'bg-red-100 text-red-800' :
                          note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {note.priority} Priority
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700">{note.content}</p>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Recorded</h3>
                  <p className="text-gray-600 mb-4">
                    No notes have been recorded for this patient yet.
                  </p>
                  <button
                    onClick={() => setShowNoteForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add First Note</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'admission-records':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Admission Records</h3>
              <button 
                onClick={() => setShowAdmissionForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Update Records</span>
              </button>
            </div>

            {loadingAdmissionRecord ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading admission records...</p>
              </div>
            ) : admissionError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-900">Error Loading Records</h4>
                </div>
                <p className="text-red-700">{admissionError}</p>
                <button 
                  onClick={loadAdmissionRecord}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : admissionRecord ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Admission Details */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Admission Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Admission Type</p>
                      <p className="font-medium text-gray-900">{admissionRecord.admission_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Attending Physician</p>
                      <p className="font-medium text-gray-900">{admissionRecord.attending_physician}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Insurance Provider</p>
                      <p className="font-medium text-gray-900">{admissionRecord.insurance_provider}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Insurance Policy</p>
                      <p className="font-medium text-gray-900">{admissionRecord.insurance_policy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Admission Source</p>
                      <p className="font-medium text-gray-900">{admissionRecord.admission_source}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Chief Complaint</p>
                      <p className="font-medium text-gray-900">{admissionRecord.chief_complaint}</p>
                    </div>
                  </div>
                </div>

                {/* Physical Measurements */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Heart className="h-5 w-5 mr-2 text-red-600" />
                    Physical Measurements
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-red-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Height</p>
                      <p className="font-medium text-gray-900">{admissionRecord.height}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Weight</p>
                      <p className="font-medium text-gray-900">{admissionRecord.weight}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">BMI</p>
                      <p className="font-medium text-gray-900">{admissionRecord.bmi}</p>
                    </div>
                  </div>
                </div>

                {/* Social History */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2 text-green-600" />
                    Social & Family History
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Smoking Status</p>
                      <p className="font-medium text-gray-900">{admissionRecord.smoking_status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Alcohol Use</p>
                      <p className="font-medium text-gray-900">{admissionRecord.alcohol_use}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Exercise</p>
                      <p className="font-medium text-gray-900">{admissionRecord.exercise}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Occupation</p>
                      <p className="font-medium text-gray-900">{admissionRecord.occupation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Marital Status</p>
                      <p className="font-medium text-gray-900">{admissionRecord.marital_status}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Family History</p>
                      <p className="font-medium text-gray-900">{admissionRecord.family_history}</p>
                    </div>
                  </div>
                </div>

                {/* Secondary Contact */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-orange-600" />
                    Secondary Emergency Contact
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{admissionRecord.secondary_contact_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Relationship</p>
                      <p className="font-medium text-gray-900">{admissionRecord.secondary_contact_relationship}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{admissionRecord.secondary_contact_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium text-gray-900">{admissionRecord.secondary_contact_address}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">
                  No admission records found. Click "Update Records" to add comprehensive admission information.
                </p>
              </div>
            )}
          </div>
        );

      case 'advanced-directives':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Directives</h3>
              <button 
                onClick={() => setShowAdvancedDirectivesForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Update Directives</span>
              </button>
            </div>

            {loadingAdvancedDirective ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading advanced directives...</p>
              </div>
            ) : directiveError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-900">Error Loading Directives</h4>
                </div>
                <p className="text-red-700">{directiveError}</p>
                <button 
                  onClick={loadAdvancedDirective}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : advancedDirective ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Legal Documents */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileCheck className="h-5 w-5 mr-2 text-blue-600" />
                    Legal Documents & Directives
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Living Will Status</p>
                      <p className="font-medium text-gray-900">{advancedDirective.living_will_status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Living Will Date</p>
                      <p className="font-medium text-gray-900">{advancedDirective.living_will_date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Healthcare Proxy</p>
                      <p className="font-medium text-gray-900">{advancedDirective.healthcare_proxy_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Healthcare Proxy Phone</p>
                      <p className="font-medium text-gray-900">{advancedDirective.healthcare_proxy_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">DNR Status</p>
                      <p className="font-medium text-gray-900">{advancedDirective.dnr_status}</p>
                    </div>
                  </div>
                </div>

                {/* Organ Donation */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Heart className="h-5 w-5 mr-2 text-red-600" />
                    Organ Donation Preferences
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Organ Donation Status</p>
                      <p className="font-medium text-gray-900">{advancedDirective.organ_donation_status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Donation Details</p>
                      <p className="font-medium text-gray-900">{advancedDirective.organ_donation_details}</p>
                    </div>
                  </div>
                </div>

                {/* Religious & Personal Preferences */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-purple-600" />
                    Religious & Personal Preferences
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4 bg-purple-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Religious Preference</p>
                      <p className="font-medium text-gray-900">{advancedDirective.religious_preference}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Special Instructions</p>
                      <p className="font-medium text-gray-900">{advancedDirective.special_instructions}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600">
                  No advanced directives found. Click "Update Directives" to add directive information.
                </p>
              </div>
            )}
          </div>
        );

      case 'assessments':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assessments</h3>
              <button 
                onClick={() => setShowAssessmentForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Assessment</span>
              </button>
            </div>

            {/* Assessment Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button 
                  onClick={() => setShowAssessmentForm(true)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Stethoscope className="h-6 w-6 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Physical Assessment</h4>
                  </div>
                  <p className="text-sm text-gray-600">Head-to-toe physical examination</p>
                </button>

                <button 
                  onClick={() => setShowAssessmentForm(true)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Activity className="h-6 w-6 text-green-600" />
                    <h4 className="font-medium text-gray-900">Neurological</h4>
                  </div>
                  <p className="text-sm text-gray-600">Cognitive and neurological function</p>
                </button>

                <button 
                  onClick={() => setShowAssessmentForm(true)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Heart className="h-6 w-6 text-red-600" />
                    <h4 className="font-medium text-gray-900">Pain Assessment</h4>
                  </div>
                  <p className="text-sm text-gray-600">Pain scale and management</p>
                </button>
              </div>

              {/* Wound Assessment Component */}
              <WoundAssessment patientId={currentPatient.patient_id} />
            </div>
          </div>
        );

      case 'tools':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Tool className="h-6 w-6 mr-2 text-blue-600" />
                Patient Tools & Utilities
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Patient Labels */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <QrCode className="h-8 w-8 text-blue-600" />
                  <h4 className="text-lg font-medium text-gray-900">Patient Labels</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Generate Avery 5160 compatible patient identification labels with barcode.
                </p>
                <button
                  onClick={() => setShowBracelet(true)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate Labels
                </button>
              </div>

              {/* Hospital Wristband */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Printer className="h-8 w-8 text-green-600" />
                  <h4 className="text-lg font-medium text-gray-900">Hospital Wristband</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Generate professional hospital patient identification wristband.
                </p>
                <button
                  onClick={() => setShowWristband(true)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Generate Wristband
                </button>
              </div>

              {/* Medication Labels */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Pill className="h-8 w-8 text-purple-600" />
                  <h4 className="text-lg font-medium text-gray-900">Medication Labels</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Generate medication labels for active prescriptions with barcodes.
                </p>
                <div className="space-y-2">
                  {currentPatient.medications && currentPatient.medications.filter(med => med.status === 'Active').length > 0 ? (
                    currentPatient.medications.filter(med => med.status === 'Active').slice(0, 2).map((medication) => (
                      <button
                        key={medication.id}
                        onClick={() => {
                          setSelectedMedication(medication);
                          setShowMedicationBarcode(true);
                        }}
                        className="w-full text-left bg-purple-50 border border-purple-200 px-3 py-2 rounded text-sm hover:bg-purple-100 transition-colors"
                      >
                        {medication.name} - {medication.dosage}
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No active medications</p>
                  )}
                </div>
              </div>

              {/* Vital Signs Trends */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="h-8 w-8 text-teal-600" />
                  <h4 className="text-lg font-medium text-gray-900">Vitals Trends</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  View historical vital signs data and trend analysis.
                </p>
                <button
                  onClick={() => setActiveTab('vitals')}
                  className="w-full bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  View Trends
                </button>
              </div>

              {/* Assessment Tools */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Stethoscope className="h-8 w-8 text-indigo-600" />
                  <h4 className="text-lg font-medium text-gray-900">Assessment Tools</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Access wound assessment and other clinical assessment tools.
                </p>
                <button
                  onClick={() => setActiveTab('assessments')}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Open Assessments
                </button>
              </div>

              {/* Documentation */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <FileText className="h-8 w-8 text-orange-600" />
                  <h4 className="text-lg font-medium text-gray-900">Documentation</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Quick access to patient notes and documentation tools.
                </p>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600">This section is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Patients</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {currentPatient.first_name} {currentPatient.last_name}
            </h1>
            <p className="text-sm text-gray-600">Patient ID: {currentPatient.patient_id}</p>
          </div>
          
          <div className="w-24"></div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        {/* First Row of Tabs */}
        <div className="flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: User, color: 'blue' },
            { id: 'vitals', label: 'Vital Signs', icon: Activity, color: 'red' },
            { id: 'medications', label: 'MAR', icon: Pill, color: 'green' },
            { id: 'notes', label: 'Notes', icon: FileText, color: 'purple' },
            { id: 'admission-records', label: 'Admission Records', icon: Clipboard, color: 'indigo' },
            { id: 'advanced-directives', label: 'Advanced Directives', icon: FileCheck, color: 'violet' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Second Row of Tabs */}
        <div className="flex space-x-8 overflow-x-auto border-t border-gray-100">
          {[
            { id: 'assessments', label: 'Assessments', icon: Stethoscope, color: 'teal' },
            { id: 'tools', label: 'Tools', icon: Wrench, color: 'orange' },
            { id: 'physicians-orders', label: 'Physicians Orders', icon: UserCheck, color: 'cyan' },
            { id: 'consults', label: 'Consults', icon: Users, color: 'pink' },
            { id: 'labs-reports', label: 'Labs & Reports', icon: BookOpen, color: 'emerald' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          patientId={currentPatient.id}
          vitals={latestVitals}
          onSave={handleSaveVitals}
          onCancel={() => setShowVitalsEditor(false)}
        />
      )}

      {showBracelet && (
        <PatientBracelet
          patient={currentPatient}
          onClose={() => setShowBracelet(false)}
        />
      )}

      {showWristband && (
        <HospitalBracelet
          patient={currentPatient}
          onClose={() => setShowWristband(false)}
        />
      )}

      {showMedicationBarcode && selectedMedication && (
        <MedicationBarcode
          medication={selectedMedication}
          patientName={`${currentPatient.first_name} ${currentPatient.last_name}`}
          patientId={currentPatient.patient_id}
          onClose={() => {
            setShowMedicationBarcode(false);
            setSelectedMedication(null);
          }}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          medication={selectedMedication}
          patientId={currentPatient.id}
          patientName={`${currentPatient.first_name} ${currentPatient.last_name}`}
          onClose={() => {
            setShowMedicationForm(false);
            setSelectedMedication(null);
          }}
          onSave={handleSaveMedication}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={currentPatient.id}
          patientName={`${currentPatient.first_name} ${currentPatient.last_name}`}
          onClose={() => setShowNoteForm(false)}
          onSave={handleSaveNote}
        />
      )}

      {showAssessmentForm && (
        <AssessmentForm
          patientId={currentPatient.id}
          patientName={`${currentPatient.first_name} ${currentPatient.last_name}`}
          onClose={() => setShowAssessmentForm(false)}
          onSave={handleSaveAssessment}
        />
      )}

      {showAdmissionForm && (
        <AdmissionRecordsForm
          patientId={currentPatient.id}
          patientName={`${currentPatient.first_name} ${currentPatient.last_name}`}
          onClose={() => setShowAdmissionForm(false)}
          onSave={handleSaveAdmissionRecord}
        />
      )}

      {showAdvancedDirectivesForm && (
        <AdvancedDirectivesForm
          patientId={currentPatient.id}
          patientName={`${currentPatient.first_name} ${currentPatient.last_name}`}
          onClose={() => setShowAdvancedDirectivesForm(false)}
          onSave={handleSaveAdvancedDirective}
        />
      )}
    </div>
  );
};