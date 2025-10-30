import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Edit, Trash2, Search, Eye, 
  Calendar, MapPin, Heart, AlertTriangle, User, RefreshCw, ArrowRightLeft 
} from 'lucide-react';
import { Patient } from '../../../types';
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient } from '../hooks/usePatients';
import { PatientForm } from './forms/PatientForm';
import PatientTransferModal from './PatientTransferModal';

/**
 * Patient Management Component
 * 
 * Comprehensive patient management interface for super administrators.
 * Provides full CRUD operations for patient records with advanced search
 * and filtering capabilities.
 * 
 * Features:
 * - Patient list with search and filtering
 * - Create, edit, and delete patient records
 * - Patient detail view
 * - Bulk operations
 * - Export functionality
 * - Advanced filtering by condition, department, etc.
 * 
 * @returns {JSX.Element} The patient management component
 */
export const PatientManagement: React.FC = () => {
  // Get patient data using react-query hook
  const { data: patients = [], isLoading: loading, error, refetch: refreshPatients } = usePatients();
  
  // Mutation hooks for patient operations
  const createPatientMutation = useCreatePatient();
  const updatePatientMutation = useUpdatePatient();
  const deletePatientMutation = useDeletePatient();
  
  const navigate = useNavigate();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [patientToTransfer, setPatientToTransfer] = useState<Patient | null>(null);
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'room' | 'admission' | 'condition'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Filter and search patients based on current criteria
   * Safety: Handle undefined patients array
   */
  const filteredPatients = (patients || []).filter(patient => {
    // Search filter - safely handle undefined properties
    const matchesSearch = 
      (patient.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.patient_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.room_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Condition filter
    const matchesCondition = filterCondition === 'all' || patient.condition === filterCondition;

    return matchesSearch && matchesCondition;
  }).sort((a, b) => {
    // Sorting logic - safely handle undefined properties
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'name':
        aValue = `${a.last_name || ''}, ${a.first_name || ''}`;
        bValue = `${b.last_name || ''}, ${b.first_name || ''}`;
        break;
      case 'room':
        aValue = `${a.room_number || ''}${a.bed_number || ''}`;
        bValue = `${b.room_number || ''}${b.bed_number || ''}`;
        break;
      case 'admission':
        aValue = new Date(a.admission_date || '').getTime();
        bValue = new Date(b.admission_date || '').getTime();
        break;
      case 'condition':
        aValue = a.condition || '';
        bValue = b.condition || '';
        break;
      default:
        aValue = a.patient_id || '';
        bValue = b.patient_id || '';
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  /**
   * Handle patient deletion
   * @param {string} patientId - ID of patient to delete
   */
  const handleDeletePatient = async (patientId: string) => {
    if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await deletePatientMutation.mutateAsync(patientId);
      
      // Clear selected patient if deleted patient was selected
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle patient form submission (create/update)
   * @param {Patient} patientData - Patient data to save
   */
  const handleSavePatient = async (patientData: Patient) => {
    try {
      setActionLoading(true);
      
      if (selectedPatient) {
        // Update existing patient
        await updatePatientMutation.mutateAsync({
          patientId: selectedPatient.id,
          updates: patientData
        });
      } else {
        // Create new patient
        await createPatientMutation.mutateAsync(patientData);
      }

      setShowForm(false);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Failed to save patient. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle patient transfer
   */
  const handleTransferPatient = (patient: Patient) => {
    setPatientToTransfer(patient);
    setShowTransferModal(true);
  };

  /**
   * Handle transfer completion
   */
  const handleTransferComplete = (success: boolean, message: string) => {
    if (success) {
      // Refresh the patient list to reflect changes
      refreshPatients();
      // You can also show a success toast notification here
      console.log('✅ Transfer successful:', message);
    } else {
      // Show error message
      console.error('❌ Transfer failed:', message);
      alert(`Transfer failed: ${message}`);
    }
  };

  /**
   * Get condition color styling
   * @param {string} condition - Patient condition
   * @returns {string} CSS classes for condition styling
   */
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'Stable': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'Improving': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  /**
   * Calculate patient age
   * @param {string} dateOfBirth - Patient's date of birth
   * @returns {number} Age in years
   */
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 'N/A';
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  /**
   * Handle viewing patient details
   * @param {Patient} patient - Patient to view details for
   */
  const handleViewPatient = (patient: Patient) => {
    // Use relative path since we're already inside /app/* routes
    navigate(`/app/patient/${patient.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Patient Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage all patient records and information
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refreshPatients()}
            disabled={loading}
            className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setSelectedPatient(null);
              setShowForm(true);
            }}
            disabled={loading || actionLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add Patient</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
          </div>
          <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error.message || 'Failed to load patients'}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{patients.length}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical Patients</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {(patients || []).filter(p => p.condition === 'Critical').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/50">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stable Patients</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {(patients || []).filter(p => p.condition === 'Stable').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
              <Heart className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admissions Today</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {(patients || []).filter(p => {
                  const today = new Date().toDateString();
                  const admissionDate = new Date(p.admission_date || '').toDateString();
                  return today === admissionDate;
                }).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search patients by name, ID, room, or diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Condition Filter */}
          <div>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Conditions</option>
              <option value="Critical">Critical</option>
              <option value="Stable">Stable</option>
              <option value="Improving">Improving</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'name' | 'room' | 'admission' | 'condition');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="room-asc">Room (Low-High)</option>
              <option value="room-desc">Room (High-Low)</option>
              <option value="admission-desc">Newest First</option>
              <option value="admission-asc">Oldest First</option>
              <option value="condition-asc">Condition (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Showing {filteredPatients.length} of {patients.length} patients
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Patient List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No patients found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || filterCondition !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first patient'
              }
            </p>
            {!searchTerm && filterCondition === 'all' && (
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Patient
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Diagnosis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nurse
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full mr-3">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {patient.first_name} {patient.last_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {patient.patient_id} • {calculateAge(patient.date_of_birth)} years • {patient.gender}
                          </div>
                          {patient.allergies && patient.allergies.length > 0 && (
                            <div className="flex items-center mt-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400 mr-1" />
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                {patient.allergies.length} allergies
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                        {patient.room_number}{patient.bed_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getConditionColor(patient.condition)}`}>
                        {patient.condition}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={patient.diagnosis}>
                        {patient.diagnosis}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {patient.assigned_nurse}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewPatient(patient)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowForm(true);
                          }}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded"
                          title="Edit Patient"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTransferPatient(patient)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded"
                          title="Transfer Patient"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded"
                          title="Delete Patient"
                          disabled={actionLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Form Modal */}
      {showForm && (
        <PatientForm
          patient={selectedPatient}
          onClose={() => {
            setShowForm(false);
            setSelectedPatient(null);
          }}
          onSave={handleSavePatient}
        />
      )}

      {/* Patient Transfer Modal */}
      {showTransferModal && patientToTransfer && (
        <PatientTransferModal
          isOpen={showTransferModal}
          patient={patientToTransfer}
          onClose={() => {
            setShowTransferModal(false);
            setPatientToTransfer(null);
          }}
          onTransferComplete={handleTransferComplete}
        />
      )}

      {/* Bulk Label Print Modal */}
      {showBulkPrint && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Bulk Label Printing
              </h3>
              <button
                onClick={() => setShowBulkPrint(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
            <BulkLabelPrint />
          </div>
        </div>
      )}
    </div>
  );
};

// Add default export for lazy loading
export default PatientManagement;