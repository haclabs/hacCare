import React, { useState } from 'react';
import { Patient } from '../../types';
import { Calendar, MapPin, Phone, User, Heart, Thermometer, Activity, Droplets, Clock, Plus, Edit3, Save, X } from 'lucide-react';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState(patient);

  const handleSave = () => {
    // Save logic would go here
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPatient(patient);
    setIsEditing(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'vitals', label: 'Vital Signs' },
    { id: 'medications', label: 'Medications' },
    { id: 'notes', label: 'Notes' },
    { id: 'history', label: 'History' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Patients
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </h1>
                <p className="text-gray-600">Patient ID: {patient.patient_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Patient</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Full Name</p>
                          <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Date of Birth</p>
                          <p className="font-medium">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Room & Bed</p>
                          <p className="font-medium">Room {patient.room_number}, Bed {patient.bed_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Droplets className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Blood Type</p>
                          <p className="font-medium">{patient.blood_type}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium">{patient.emergency_contact_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{patient.emergency_contact_phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Heart className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Relationship</p>
                          <p className="font-medium">{patient.emergency_contact_relationship}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Condition</p>
                        <p className="font-medium">{patient.condition}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Diagnosis</p>
                        <p className="font-medium">{patient.diagnosis}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Assigned Nurse</p>
                        <p className="font-medium">{patient.assigned_nurse}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Admission Date</p>
                        <p className="font-medium">{new Date(patient.admission_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Allergies</h3>
                    <div className="space-y-2">
                      {patient.allergies && patient.allergies.length > 0 ? (
                        patient.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-2"
                          >
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500">No known allergies</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vitals' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Vitals</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Thermometer className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Temperature</p>
                        <p className="text-xl font-bold text-gray-900">98.6°F</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Heart className="w-8 h-8 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600">Blood Pressure</p>
                        <p className="text-xl font-bold text-gray-900">120/80</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Heart Rate</p>
                        <p className="text-xl font-bold text-gray-900">72 bpm</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Droplets className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Oxygen Sat</p>
                        <p className="text-xl font-bold text-gray-900">98%</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Current Medications</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Medication</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">Lisinopril 10mg</h4>
                        <p className="text-sm text-gray-600">Once daily, oral</p>
                        <p className="text-sm text-gray-500">Prescribed by Dr. Smith</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Next dose</p>
                        <p className="font-medium text-gray-900">8:00 AM</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">Metformin 500mg</h4>
                        <p className="text-sm text-gray-600">Twice daily, oral</p>
                        <p className="text-sm text-gray-500">Prescribed by Dr. Johnson</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Next dose</p>
                        <p className="font-medium text-gray-900">12:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Add Note</span>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Assessment</span>
                        <span className="text-sm text-gray-600">by Nurse Johnson</span>
                      </div>
                      <span className="text-sm text-gray-500">2 hours ago</span>
                    </div>
                    <p className="text-gray-900">Patient is stable and responding well to treatment. Vital signs within normal range.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Observation</span>
                        <span className="text-sm text-gray-600">by Nurse Davis</span>
                      </div>
                      <span className="text-sm text-gray-500">4 hours ago</span>
                    </div>
                    <p className="text-gray-900">Patient complained of mild discomfort. Pain medication administered as prescribed.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Medical History</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">Previous Admission</span>
                      <span className="text-sm text-gray-500">March 15, 2024</span>
                    </div>
                    <p className="text-gray-700">Routine surgery - Appendectomy. Recovery was successful with no complications.</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">Emergency Visit</span>
                      <span className="text-sm text-gray-500">January 8, 2024</span>
                    </div>
                    <p className="text-gray-700">Chest pain evaluation. Diagnosed with anxiety-related symptoms. Discharged same day.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};