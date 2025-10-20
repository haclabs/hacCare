import React, { useState } from 'react';
import { X, User, MapPin, Phone, AlertTriangle, Save, ChevronDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Patient } from '../../../../types';
import { useTenantNurses } from '../../../admin/hooks/useTenantNurses';

/**
 * Patient Form Component
 * 
 * Comprehensive form for creating and editing patient records.
 * Handles all patient information including demographics, medical history,
 * emergency contacts, and room assignments.
 */
interface PatientFormProps {
  patient?: Patient | null;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ patient, onClose, onSave }) => {
  // Get nurses for the current tenant
  const { nurses, loading: nursesLoading, error: nursesError } = useTenantNurses();

  // Form state management
  const [formData, setFormData] = useState<Partial<Patient>>({
    patient_id: patient?.patient_id || generatePatientId(),
    first_name: patient?.first_name || '',
    last_name: patient?.last_name || '',
    date_of_birth: patient?.date_of_birth || '',
    gender: patient?.gender || 'Male',
    room_number: patient?.room_number || '',
    bed_number: patient?.bed_number || 'A',
    admission_date: patient?.admission_date || new Date().toISOString().split('T')[0],
    condition: patient?.condition || 'Stable',
    diagnosis: patient?.diagnosis || '',
    allergies: patient?.allergies || [],
    blood_type: patient?.blood_type || 'O+',
    emergency_contact_name: patient?.emergency_contact_name || '',
    emergency_contact_relationship: patient?.emergency_contact_relationship || '',
    emergency_contact_phone: patient?.emergency_contact_phone || '',
    assigned_nurse: patient?.assigned_nurse || '',
    vitals: patient?.vitals || [],
    medications: patient?.medications || [],
    notes: patient?.notes || []
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newAllergy, setNewAllergy] = useState('');

  /**
   * Generate a unique patient ID in PTXXXXX format
   */
  function generatePatientId(): string {
    const randomNum = Math.floor(Math.random() * 90000) + 10000; // Ensures 5 digits
    return `PT${randomNum}`;
  }

  /**
   * Update form field value
   */
  const updateField = (field: keyof Patient, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  /**
   * Add new allergy to the list
   */
  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies?.includes(newAllergy.trim())) {
      setFormData(prev => ({
        ...prev,
        allergies: [...(prev.allergies || []), newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  /**
   * Remove allergy from the list
   */
  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies?.filter((_, i) => i !== index) || []
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (!formData.room_number?.trim()) newErrors.room_number = 'Room number is required';
    if (!formData.diagnosis?.trim()) newErrors.diagnosis = 'Diagnosis is required';
    if (!formData.assigned_nurse?.trim()) {
      newErrors.assigned_nurse = nurses.length === 0 
        ? 'No nurses available for this tenant. Contact your administrator.'
        : 'Assigned nurse is required';
    }

    // Emergency contact validation
    if (!formData.emergency_contact_name?.trim()) {
      newErrors.emergency_contact_name = 'Emergency contact name is required';
    }
    if (!formData.emergency_contact_relationship?.trim()) {
      newErrors.emergency_contact_relationship = 'Emergency contact relationship is required';
    }
    if (!formData.emergency_contact_phone?.trim()) {
      newErrors.emergency_contact_phone = 'Emergency contact phone is required';
    }

    // Date validation
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (birthDate > today) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future';
      }
    }

    // Phone number validation (basic)
    if (formData.emergency_contact_phone && 
        !/^\(\d{3}\)\s\d{3}-\d{4}$/.test(formData.emergency_contact_phone) &&
        !/^\d{10}$/.test(formData.emergency_contact_phone.replace(/\D/g, ''))) {
      newErrors.emergency_contact_phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Create complete patient object
      const patientData: Patient = {
        id: patient?.id || uuidv4(), // Generate proper UUID for new patients
        patient_id: formData.patient_id!,
        first_name: formData.first_name!,
        last_name: formData.last_name!,
        date_of_birth: formData.date_of_birth!,
        gender: formData.gender!,
        room_number: formData.room_number!,
        bed_number: formData.bed_number!,
        admission_date: formData.admission_date!,
        condition: formData.condition!,
        diagnosis: formData.diagnosis!,
        allergies: formData.allergies!,
        blood_type: formData.blood_type!,
        emergency_contact_name: formData.emergency_contact_name!,
        emergency_contact_relationship: formData.emergency_contact_relationship!,
        emergency_contact_phone: formData.emergency_contact_phone!,
        assigned_nurse: formData.assigned_nurse!,
        vitals: formData.vitals || [],
        medications: formData.medications || [],
        notes: formData.notes || []
      };

      await onSave(patientData);
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Failed to save patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {patient ? 'Edit Patient' : 'Add New Patient'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={formData.patient_id}
                  onChange={(e) => updateField('patient_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.first_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {errors.first_name && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.last_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {errors.last_name && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.date_of_birth ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                />
                {errors.date_of_birth && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.date_of_birth}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Blood Type
                </label>
                <select
                  value={formData.blood_type}
                  onChange={(e) => updateField('blood_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Room and Medical Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Room & Medical Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => updateField('room_number', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.room_number ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="302"
                    required
                  />
                  {errors.room_number && (
                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.room_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bed
                  </label>
                  <select
                    value={formData.bed_number}
                    onChange={(e) => updateField('bed_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Admission Date
                </label>
                <input
                  type="date"
                  value={formData.admission_date}
                  onChange={(e) => updateField('admission_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => updateField('condition', e.target.value as Patient['condition'])}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Critical">Critical</option>
                  <option value="Stable">Stable</option>
                  <option value="Improving">Improving</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Nurse *
                </label>
                <div className="relative">
                  <select
                    value={formData.assigned_nurse}
                    onChange={(e) => updateField('assigned_nurse', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none pr-10 ${
                      errors.assigned_nurse ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                    disabled={nursesLoading}
                  >
                    <option value="">
                      {nursesLoading ? 'Loading nurses...' : 'Select a nurse'}
                    </option>
                    
                    {/* Show current assigned nurse if not in the list (for backward compatibility) */}
                    {formData.assigned_nurse && 
                     !nurses.find(n => n.name === formData.assigned_nurse) && 
                     !nursesLoading && (
                      <option value={formData.assigned_nurse}>
                        {formData.assigned_nurse} (Currently assigned)
                      </option>
                    )}
                    
                    {/* Show available nurses */}
                    {nurses.map((nurse) => (
                      <option key={nurse.id} value={nurse.name}>
                        {nurse.name}
                        {nurse.department && ` - ${nurse.department}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                
                {/* Show various status messages */}
                {nursesError && (
                  <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                    ⚠️ {nursesError}
                  </p>
                )}
                
                {formData.assigned_nurse && 
                 !nurses.find(n => n.name === formData.assigned_nurse) && 
                 !nursesLoading && 
                 !nursesError && (
                  <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                    ℹ️ Currently assigned nurse may not be in this tenant anymore.
                  </p>
                )}
                
                {errors.assigned_nurse && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.assigned_nurse}</p>
                )}
                
                {nurses.length === 0 && !nursesLoading && !nursesError && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                    No nurses found for this tenant. Contact your administrator.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Diagnosis *
              </label>
              <textarea
                value={formData.diagnosis}
                onChange={(e) => updateField('diagnosis', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.diagnosis ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter primary diagnosis and relevant medical conditions..."
                required
              />
              {errors.diagnosis && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.diagnosis}</p>
              )}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
              Allergies
            </h3>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter allergy (e.g., Penicillin, Latex)"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Add
                </button>
              </div>

              {formData.allergies && formData.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => removeAllergy(index)}
                        className="ml-2 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              Emergency Contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name || ''}
                  onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.emergency_contact_name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="John Doe"
                  required
                />
                {errors.emergency_contact_name && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.emergency_contact_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_relationship || ''}
                  onChange={(e) => updateField('emergency_contact_relationship', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.emergency_contact_relationship ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Spouse, Parent, Sibling"
                  required
                />
                {errors.emergency_contact_relationship && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.emergency_contact_relationship}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact_phone || ''}
                  onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.emergency_contact_phone ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="(555) 123-4567"
                  required
                />
                {errors.emergency_contact_phone && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.emergency_contact_phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : patient ? 'Update Patient' : 'Create Patient'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};