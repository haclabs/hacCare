import React from 'react';
import { Plus, RefreshCw, Users, Calendar, Stethoscope } from 'lucide-react';
import { usePatients, useCreatePatient, useRefreshPatientData } from '../../hooks/queries/usePatients';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * React Query Demo Component
 * 
 * This component demonstrates the migration from PatientContext to React Query.
 * Compare this with the old PatientManagement component to see the difference!
 */
export const PatientManagementRQ: React.FC = () => {
  // 🚀 React Query replaces all this boilerplate:
  // - const [patients, setPatients] = useState([]);
  // - const [loading, setLoading] = useState(true);
  // - const [error, setError] = useState(null);
  // - useEffect(() => { loadPatients(); }, []);
  
  const { 
    data: patients = [], 
    isLoading, 
    error, 
    isFetching 
  } = usePatients();
  
  const createPatientMutation = useCreatePatient();
  const { refreshAll } = useRefreshPatientData();

  // Handle adding a new patient (for demo purposes)
  const handleAddPatient = () => {
    const newPatient = {
      id: `demo-${Date.now()}`,
      patient_id: `PT${Math.floor(Math.random() * 10000)}`,
      first_name: 'Demo',
      last_name: 'Patient',
      date_of_birth: '1990-01-01',
      gender: 'Male' as const,
      room_number: '101',
      bed_number: 'A',
      admission_date: new Date().toISOString(),
      condition: 'Stable' as const,
      diagnosis: 'React Query Migration Demo',
      allergies: ['None'],
      blood_type: 'O+',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_relationship: 'Family',
      emergency_contact_phone: '555-0123',
      assigned_nurse: 'Demo Nurse',
      vitals: [],
      medications: [],
      notes: []
    };

    createPatientMutation.mutate(newPatient);
  };

  // 🎯 Loading state (much simpler than before!)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
        <p className="ml-4 text-gray-600 dark:text-gray-400">Loading patients with React Query...</p>
      </div>
    );
  }

  // 🚨 Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
          Failed to Load Patients
        </h3>
        <p className="text-red-600 dark:text-red-400 mb-4">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </p>
        <button
          onClick={() => refreshAll()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with React Query Benefits */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          🚀 React Query Migration Demo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="flex items-center mb-2">
              <RefreshCw className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Smart Caching</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Data is cached automatically and stays fresh
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="flex items-center mb-2">
              <Stethoscope className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Optimistic Updates</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              UI updates instantly, rolls back on error
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="flex items-center mb-2">
              <Users className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">Less Code</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No more manual loading states!
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Patients ({patients.length})
          </h3>
          {isFetching && (
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Syncing...</span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => refreshAll()}
            disabled={isFetching}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={handleAddPatient}
            disabled={createPatientMutation.isPending}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>
              {createPatientMutation.isPending ? 'Adding...' : 'Add Demo Patient'}
            </span>
          </button>
        </div>
      </div>

      {/* Patient Grid */}
      {patients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Patients Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add a demo patient to see React Query in action!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    {patient.first_name} {patient.last_name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ID: {patient.patient_id}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  patient.condition === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                  patient.condition === 'Stable' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                  patient.condition === 'Improving' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {patient.condition}
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Room {patient.room_number}-{patient.bed_number}</span>
                </div>
                <div>
                  <strong>Diagnosis:</strong> {patient.diagnosis}
                </div>
                <div>
                  <strong>Nurse:</strong> {patient.assigned_nurse}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* React Query Status */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          React Query Status
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span className={`ml-2 font-medium ${
              isLoading ? 'text-blue-600' : 
              error ? 'text-red-600' : 
              'text-green-600'
            }`}>
              {isLoading ? 'Loading' : error ? 'Error' : 'Success'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Fetching:</span>
            <span className={`ml-2 font-medium ${isFetching ? 'text-blue-600' : 'text-gray-400'}`}>
              {isFetching ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Cached:</span>
            <span className="ml-2 font-medium text-green-600">Yes</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Fresh for:</span>
            <span className="ml-2 font-medium text-blue-600">2 min</span>
          </div>
        </div>
      </div>
    </div>
  );
};
