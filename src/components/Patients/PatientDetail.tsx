import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, FileText, AlertTriangle, Activity, Pill, Stethoscope, Ban as Bandage } from 'lucide-react';
import { Patient, PatientNote, PatientAlert, PatientVitals, PatientMedication, PatientWound } from '../../types';
import { patientService } from '../../lib/patientService';
import { supabase } from '../../lib/supabase';
import { PatientNoteForm } from './PatientNoteForm';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationForm } from './MedicationForm';
import WoundAssessment from './WoundAssessment';
import VitalsTrends from './VitalsTrends';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [vitals, setVitals] = useState<PatientVitals[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [wounds, setWounds] = useState<PatientWound[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showWoundForm, setShowWoundForm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Fetch patient details
      const patientData = await patientService.getPatient(id);
      setPatient(patientData);

      // Fetch notes
      const { data: notesData } = await supabase
        .from('patient_notes')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });
      setNotes(notesData || []);

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from('patient_alerts')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });
      setAlerts(alertsData || []);

      // Fetch vitals
      const { data: vitalsData } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', id)
        .order('recorded_at', { ascending: false });
      setVitals(vitalsData || []);

      // Fetch medications
      const { data: medicationsData } = await supabase
        .from('patient_medications')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });
      setMedications(medicationsData || []);

      // Fetch wounds
      const { data: woundsData } = await supabase
        .from('patient_wounds')
        .select('*')
        .eq('patient_id', id)
        .order('assessment_date', { ascending: false });
      setWounds(woundsData || []);

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Patient not found</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'vitals', label: 'Vital Signs', icon: Activity },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'wounds', label: 'Wound Care', icon: Bandage },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Patient ID:</span>
                  <span className="font-medium">{patient.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date of Birth:</span>
                  <span className="font-medium">{new Date(patient.date_of_birth).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium">{patient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blood Type:</span>
                  <span className="font-medium">{patient.blood_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Room:</span>
                  <span className="font-medium">{patient.room_number} - {patient.bed_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Assigned Nurse:</span>
                  <span className="font-medium">{patient.assigned_nurse}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Condition:</span>
                  <p className="font-medium mt-1">{patient.condition}</p>
                </div>
                <div>
                  <span className="text-gray-600">Diagnosis:</span>
                  <p className="font-medium mt-1">{patient.diagnosis}</p>
                </div>
                <div>
                  <span className="text-gray-600">Allergies:</span>
                  <div className="mt-1">
                    {patient.allergies && patient.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {patient.allergies.map((allergy, index) => (
                          <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                            {allergy}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">No known allergies</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{patient.emergency_contact_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Relationship:</span>
                  <span className="font-medium">{patient.emergency_contact_relationship}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{patient.emergency_contact_phone}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {notes.slice(0, 3).map((note) => (
                  <div key={note.id} className="border-l-4 border-blue-500 pl-3">
                    <p className="text-sm font-medium">{note.type}</p>
                    <p className="text-sm text-gray-600">{note.content.substring(0, 100)}...</p>
                    <p className="text-xs text-gray-500">{new Date(note.created_at!).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'vitals':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
              <button
                onClick={() => setShowVitalsForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Record Vitals
              </button>
            </div>
            
            {showVitalsForm && (
              <VitalSignsEditor
                patientId={id!}
                onClose={() => setShowVitalsForm(false)}
                onSave={fetchPatientData}
              />
            )}

            <VitalsTrends vitals={vitals} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vitals.map((vital) => (
                <div key={vital.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-gray-500">
                      {new Date(vital.recorded_at!).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temperature:</span>
                      <span className="font-medium">{vital.temperature}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Blood Pressure:</span>
                      <span className="font-medium">{vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heart Rate:</span>
                      <span className="font-medium">{vital.heart_rate} bpm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Respiratory Rate:</span>
                      <span className="font-medium">{vital.respiratory_rate} rpm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">O2 Saturation:</span>
                      <span className="font-medium">{vital.oxygen_saturation}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Medications</h3>
              <button
                onClick={() => setShowMedicationForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Medication
              </button>
            </div>
            
            {showMedicationForm && (
              <MedicationForm
                patientId={id!}
                onClose={() => setShowMedicationForm(false)}
                onSave={fetchPatientData}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.map((medication) => (
                <div key={medication.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{medication.name}</h4>
                      <p className="text-sm text-gray-600">{medication.dosage} - {medication.route}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      medication.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {medication.status}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span>{medication.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prescribed by:</span>
                      <span>{medication.prescribed_by}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span>{new Date(medication.start_date).toLocaleDateString()}</span>
                    </div>
                    {medication.end_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span>{new Date(medication.end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Due:</span>
                      <span>{new Date(medication.next_due).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'wounds':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Wound Assessment</h3>
              <button
                onClick={() => setShowWoundForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Assessment
              </button>
            </div>
            
            {showWoundForm && (
              <WoundAssessment
                patientId={id!}
                onClose={() => setShowWoundForm(false)}
                onSave={fetchPatientData}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wounds.map((wound) => (
                <div key={wound.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{wound.location}</h4>
                      <p className="text-sm text-gray-600">{wound.type} - Stage {wound.stage}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(wound.assessment_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Size:</span>
                      <span>{wound.size_length} x {wound.size_width} cm</span>
                    </div>
                    {wound.size_depth && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Depth:</span>
                        <span>{wound.size_depth} cm</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progress:</span>
                      <span>{wound.healing_progress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assessed by:</span>
                      <span>{wound.assessed_by}</span>
                    </div>
                  </div>
                  {wound.description && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-700">{wound.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              <button
                onClick={() => setShowNoteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Note
              </button>
            </div>
            
            {showNoteForm && (
              <PatientNoteForm
                patientId={id!}
                onClose={() => setShowNoteForm(false)}
                onSave={fetchPatientData}
              />
            )}

            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{note.type}</h4>
                      <p className="text-sm text-gray-600">By {note.nurse_name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        note.priority === 'high' ? 'bg-red-100 text-red-800' :
                        note.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {note.priority}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(note.created_at!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Patient Alerts</h3>
            {alerts.map((alert) => (
              <div key={alert.id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                alert.priority === 'critical' ? 'border-red-500' :
                alert.priority === 'high' ? 'border-orange-500' :
                alert.priority === 'medium' ? 'border-yellow-500' :
                'border-blue-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{alert.alert_type}</h4>
                    <p className="text-gray-700 mt-1">{alert.message}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.priority}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {alert.acknowledged && (
                  <div className="mt-2 text-sm text-green-600">
                    Acknowledged at {new Date(alert.acknowledged_at!).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {patient.condition} • Room {patient.room_number}-{patient.bed_number}
            </p>
          </div>
          <button
            onClick={() => navigate(`/patients/${id}/edit`)}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Patient
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {renderTabContent()}
    </div>
  );
}