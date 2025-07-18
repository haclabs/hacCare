import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, Building, Phone, Heart, AlertTriangle } from 'lucide-react';
import { AdmissionRecord, fetchAdmissionRecord, upsertAdmissionRecord, createDefaultAdmissionRecord } from '../../../lib/admissionService';
import { usePatients } from '../../../hooks/usePatients';

interface AdmissionRecordsFormProps {
  patientId: string;
  patientName?: string;
  onClose: () => void;
  onSave?: () => void;
}

export const AdmissionRecordsForm: React.FC<AdmissionRecordsFormProps> = ({
  patientId,
  patientName,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<AdmissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { refreshPatients } = usePatients();

  useEffect(() => {
    loadAdmissionRecord();
  }, [patientId]);

  const loadAdmissionRecord = async () => {
    try {
      setLoading(true);
      
      // Always start with a completely empty form
      const emptyRecord = {
        patient_id: patientId,
        admission_type: '',
        attending_physician: '',
        insurance_provider: '',
        insurance_policy: '',
        admission_source: '',
        chief_complaint: '',
        height: '',
        weight: '',
        bmi: '',
        smoking_status: '',
        alcohol_use: '',
        exercise: '',
        occupation: '',
        family_history: '',
        marital_status: '',
        secondary_contact_name: '',
        secondary_contact_relationship: '',
        secondary_contact_phone: '',
        secondary_contact_address: ''
      };
      
      setFormData(emptyRecord);
    } catch (err: any) {
      console.error('Error loading admission record:', err);
      setError(err.message || 'Failed to load admission record');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    try {
      setSaving(true);
      setError('');
      
      // Make sure all required fields are filled
      const requiredFields = ['admission_type', 'attending_physician', 'chief_complaint'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
      
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setSaving(false);
        return;
      }
      
      // Save to database
      const savedRecord = await upsertAdmissionRecord(formData);
      console.log('Admission record saved successfully:', savedRecord);
      console.log('Admission record saved successfully');
      
      // Refresh patient data to reflect changes
      await refreshPatients();
      
      if (onSave) {
        onSave();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving admission record:', err);
      setError(err.message || 'Failed to save admission record');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof AdmissionRecord, value: string) => {
    if (!formData) return;
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading admission records...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Failed to load admission records</p>
            <button onClick={onClose} className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Update Admission Records - {patientName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            type="button">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
              </div>
              <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Current Admission Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Current Admission Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Admission Type
                </label>
                <select
                  value={formData.admission_type}
                  onChange={(e) => updateField('admission_type', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.admission_type ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                >
                  <option value="">Select admission type</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Elective">Elective</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attending Physician
                </label>
                <input
                  type="text"
                  value={formData.attending_physician}
                  onChange={(e) => updateField('attending_physician', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.attending_physician ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Dr. Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={formData.insurance_provider}
                  onChange={(e) => updateField('insurance_provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Policy
                </label>
                <input
                  type="text"
                  value={formData.insurance_policy}
                  onChange={(e) => updateField('insurance_policy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Source
                </label>
                <select
                  value={formData.admission_source}
                  onChange={(e) => updateField('admission_source', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                >
                  <option value="">Select admission source</option>
                  <option value="Emergency Department">Emergency Department</option>
                  <option value="Physician Referral">Physician Referral</option>
                  <option value="Transfer from Another Facility">Transfer from Another Facility</option>
                  <option value="Direct Admission">Direct Admission</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chief Complaint
                </label>
                <input
                  type="text"
                  value={formData.chief_complaint}
                  onChange={(e) => updateField('chief_complaint', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.chief_complaint ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Reason for admission"
                  required
                />
              </div>
            </div>
          </div>

          {/* Physical Measurements */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-red-600" />
              Physical Measurements
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <input
                  type="text"
                  value={formData.height}
                  onChange={(e) => updateField('height', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight
                </label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BMI
                </label>
                <input
                  type="text"
                  value={formData.bmi}
                  onChange={(e) => updateField('bmi', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Social History */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-green-600" />
              Social & Family History
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Smoking Status
                </label>
                <input
                  type="text"
                  value={formData.smoking_status}
                  onChange={(e) => updateField('smoking_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alcohol Use
                </label>
                <input
                  type="text"
                  value={formData.alcohol_use}
                  onChange={(e) => updateField('alcohol_use', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exercise
                </label>
                <input
                  type="text"
                  value={formData.exercise}
                  onChange={(e) => updateField('exercise', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => updateField('occupation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marital Status
                </label>
                <input
                  type="text"
                  value={formData.marital_status}
                  onChange={(e) => updateField('marital_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Family History
              </label>
              <textarea
                value={formData.family_history}
                onChange={(e) => updateField('family_history', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Secondary Emergency Contact */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-orange-600" />
              Secondary Emergency Contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.secondary_contact_name}
                  onChange={(e) => updateField('secondary_contact_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  value={formData.secondary_contact_relationship}
                  onChange={(e) => updateField('secondary_contact_relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.secondary_contact_phone}
                  onChange={(e) => updateField('secondary_contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.secondary_contact_address}
                  onChange={(e) => updateField('secondary_contact_address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving} 
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Records'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};