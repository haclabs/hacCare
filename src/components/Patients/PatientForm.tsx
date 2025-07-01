import React, { useState } from 'react';
import { X, User, Calendar, MapPin, Heart, Phone, AlertTriangle, Save } from 'lucide-react';
import { Patient } from '../../types';
import { generatePatientId } from '../../utils/patientUtils';

/**
 * Patient Form Component
 * 
 * Comprehensive form for creating and editing patient records.
 * Handles all patient information including demographics, medical history,
 * emergency contacts, and room assignments.
 * 
 * Features:
 * - Complete patient information form
 * - Validation for required fields
 * - Allergy management
 * - Emergency contact information
 * - Room and bed assignment
 * - Medical history and diagnosis
 * 
 * @param {Object} props - Component props
 * @param {Patient | null} props.patient - Patient to edit (null for new patient)
 * @param {Function} props.onClose - Callback when form is closed
 * @param {Function} props.onSave - Callback when patient is saved
 */
interface PatientFormProps {
  patient?: Patient | null;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ patient, onClose, onSave }) => {
  // Form state management
  const [formData, setFormData] = useState<Partial<Patient>>({
    patientId: patient?.patientId || generatePatientId(),
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    dateOfBirth: patient?.dateOfBirth || '',
    gender: patient?.gender || 'Male',
    roomNumber: patient?.roomNumber || '',
    bedNumber: patient?.bedNumber || 'A',
    admissionDate: patient?.admissionDate || new Date().toISOString().split('T')[0],
    condition: patient?.condition || 'Stable',
    diagnosis: patient?.diagnosis || '',
    allergies: patient?.allergies || [],
    bloodType: patient?.bloodType || 'O+',
    emergencyContact: patient?.emergencyContact || {
      name: '',
      relationship: '',
      phone: ''
    },
    assignedNurse: patient?.assignedNurse || '',
    // Only include vitals if editing existing patient, not for new patients
    vitals: patient?.vitals || undefined,
    medications: patient?.medications || [],
    notes: patient?.notes || []
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newAllergy, setNewAllergy] = useState('');

  /**
   * Update form field value
   * @param {string} field - Field name to update
   * @param {any} value - New value for the field
   */
  const updateField = (field: string, value: any) => {
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
   * Update emergency contact field
   * @param {string} field - Emergency contact field name
   * @param {string} value - New value for the field
   */
  const updateEmergencyContact = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact!,
        [field]: value
      }
    }));
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
   * @param {number} index - Index of allergy to remove
   */
  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies?.filter((_, i) => i !== index) || []
    }));
  };

  /**
   * Validate form data
   * @returns {boolean} True if form is valid
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.roomNumber?.trim()) newErrors.roomNumber = 'Room number is required';
    if (!formData.diagnosis?.trim()) newErrors.diagnosis = 'Diagnosis is required';
    if (!formData.assignedNurse?.trim()) newErrors.assignedNurse = 'Assigned nurse is required';

    // Emergency contact validation
    if (!formData.emergencyContact?.name?.trim()) {
      newErrors.emergencyContactName = 'Emergency contact name is required';
    }
    if (!formData.emergencyContact?.relationship?.trim()) {
      newErrors.emergencyContactRelationship = 'Emergency contact relationship is required';
    }
    if (!formData.emergencyContact?.phone?.trim()) {
      newErrors.emergencyContactPhone = 'Emergency contact phone is required';
    }

    // Date validation
    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    // Phone number validation (basic)
    if (formData.emergencyContact?.phone && 
        !/^\(\d{3}\)\s\d{3}-\d{4}$/.test(formData.emergencyContact.phone) &&
        !/^\d{10}$/.test(formData.emergencyContact.phone.replace(/\D/g, ''))) {
      newErrors.emergencyContactPhone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * @param {React.FormEvent} e - Form event
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
        id: patient?.id || `patient-${Date.now()}`,
        patientId: formData.patientId!,
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        dateOfBirth: formData.dateOfBirth!,
        gender: formData.gender!,
        roomNumber: formData.roomNumber!,
        bedNumber: formData.bedNumber!,
        admissionDate: formData.admissionDate!,
        condition: formData.condition!,
        diagnosis: formData.diagnosis!,
        allergies: formData.allergies!,
        bloodType: formData.bloodType!,
        emergencyContact: formData.emergencyContact!,
        assignedNurse: formData.assignedNurse!,
        // Only include vitals if they exist (for existing patients)
        // New patients will have no vitals until first entry
        vitals: formData.vitals || {
          temperature: 0,
          bloodPressure: { systolic: 0, diastolic: 0 },
          heartRate: 0,
          respiratoryRate: 0,
          oxygenSaturation: 0,
          lastUpdated: ''
        },
        medications: formData.medications!,
        notes: formData.notes!
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {patient ? 'Edit Patient' : 'Add New Patient'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={formData.patientId}
                  onChange={(e) => updateField('patientId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.firstName && (
                  <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.lastName && (
                  <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.dateOfBirth && (
                  <p className="text-red-600 text-xs mt-1">{errors.dateOfBirth}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Type
                </label>
                <select
                  value={formData.bloodType}
                  onChange={(e) => updateField('bloodType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-blue-600" />
              Room & Medical Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => updateField('roomNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.roomNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="302"
                    required
                  />
                  {errors.roomNumber && (
                    <p className="text-red-600 text-xs mt-1">{errors.roomNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bed
                  </label>
                  <select
                    value={formData.bedNumber}
                    onChange={(e) => updateField('bedNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Date
                </label>
                <input
                  type="date"
                  value={formData.admissionDate}
                  onChange={(e) => updateField('admissionDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => updateField('condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Critical">Critical</option>
                  <option value="Stable">Stable</option>
                  <option value="Improving">Improving</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Nurse *
                </label>
                <input
                  type="text"
                  value={formData.assignedNurse}
                  onChange={(e) => updateField('assignedNurse', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.assignedNurse ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Sarah Johnson"
                  required
                />
                {errors.assignedNurse && (
                  <p className="text-red-600 text-xs mt-1">{errors.assignedNurse}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis *
              </label>
              <textarea
                value={formData.diagnosis}
                onChange={(e) => updateField('diagnosis', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.diagnosis ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter primary diagnosis and relevant medical conditions..."
                required
              />
              {errors.diagnosis && (
                <p className="text-red-600 text-xs mt-1">{errors.diagnosis}</p>
              )}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
              Allergies
            </h3>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800 border border-amber-200"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => removeAllergy(index)}
                        className="ml-2 text-amber-600 hover:text-amber-800"
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
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-blue-600" />
              Emergency Contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact?.name || ''}
                  onChange={(e) => updateEmergencyContact('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.emergencyContactName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                  required
                />
                {errors.emergencyContactName && (
                  <p className="text-red-600 text-xs mt-1">{errors.emergencyContactName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact?.relationship || ''}
                  onChange={(e) => updateEmergencyContact('relationship', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.emergencyContactRelationship ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Spouse, Parent, Sibling"
                  required
                />
                {errors.emergencyContactRelationship && (
                  <p className="text-red-600 text-xs mt-1">{errors.emergencyContactRelationship}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContact?.phone || ''}
                  onChange={(e) => updateEmergencyContact('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.emergencyContactPhone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="(555) 123-4567"
                  required
                />
                {errors.emergencyContactPhone && (
                  <p className="text-red-600 text-xs mt-1">{errors.emergencyContactPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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