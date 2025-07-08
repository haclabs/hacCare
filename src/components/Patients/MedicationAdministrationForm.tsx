import React, { useState } from 'react';
import { X, Save, Clock, User, FileText, AlertTriangle } from 'lucide-react';
import { Medication, MedicationAdministration } from '../../types';
import { format, parseISO } from 'date-fns';
import { formatLocalTime } from '../../utils/dateUtils';
import { recordMedicationAdministration } from '../../lib/medicationService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface MedicationAdministrationFormProps {
  medication: Medication; 
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void; 
}

export const MedicationAdministrationForm: React.FC<MedicationAdministrationFormProps> = ({
  medication,
  patientId,
  patientName,
  onClose,
  onSuccess
}) => {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState<Partial<MedicationAdministration>>({
    medication_id: medication?.id,
    patient_id: patientId,
    administered_by: profile ? `${profile.first_name} ${profile.last_name}` : '', 
    administered_by_id: user?.id,
    timestamp: new Date().toISOString().slice(0, 16), // Format as YYYY-MM-DDTHH:MM for input
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!medication) {
      setError('Medication information is missing');
      return;
    }
    
    if (!formData.administered_by || !formData.administered_by.trim()) {
      setError('Administrator name is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Ensure all required fields are present
      const adminData: Omit<MedicationAdministration, 'id'> = {
        medication_id: medication.id,
        patient_id: patientId,
        administered_by: formData.administered_by!,
        administered_by_id: formData.administered_by_id || user?.id,
        timestamp: formData.timestamp || new Date().toISOString(),
        notes: formData.notes || ''
      };
      
      console.log('Submitting administration data:', adminData);
      
      // Save administration record
      const result = await recordMedicationAdministration(adminData);
      console.log('Administration recorded successfully:', result); 
      
      // Call onSuccess immediately - the refresh will be handled by the parent component
      onSuccess();
    } catch (err: any) {
      console.error('Error recording administration:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('permission denied') || err.message?.includes('foreign key constraint')) {
        setError('Permission error: Unable to record administration. Database configuration issue.');
        console.error('Permission issue with database tables. Check RLS policies.');
      } else {
        setError(err.message || 'Failed to record administration');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof MedicationAdministration, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is updated
    if (error) {
      setError('');
    }
  };

  const getCategoryColor = () => {
    const category = medication.category || 'scheduled';
    switch (category) {
      case 'scheduled': return 'blue';
      case 'prn': return 'green';
      case 'continuous': return 'purple';
      default: return 'blue';
    }
  };

  const color = getCategoryColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-${color}-200 bg-${color}-50`}>
          <div>
            <h2 className={`text-xl font-semibold text-${color}-900`}>
              Record Medication Administration
            </h2>
            <p className="text-sm text-gray-600 mt-1">Patient: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Error</p>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Medication Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Medication Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700"><strong>Name:</strong> {medication.name}</p>
                <p className="text-blue-700"><strong>Dosage:</strong> {medication.dosage}</p>
                <p className="text-blue-700"><strong>Route:</strong> {medication.route}</p>
              </div>
              <div>
                <p className="text-blue-700"><strong>Frequency:</strong> {medication.frequency}</p>
                <p className="text-blue-700"><strong>Category:</strong> {medication.category || 'Scheduled'}</p>
                <p className="text-blue-700"><strong>Status:</strong> {medication.status}</p>
              </div>
            </div>
          </div>

          {/* Administration Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-600" />
              Administration Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label> 
                <input
                  type="datetime-local"
                  value={formData.timestamp}
                  onChange={(e) => {
                    // Store the ISO string representation
                    const localDate = new Date(e.target.value);
                    updateField('timestamp', localDate.toISOString());
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Administered By *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={formData.administered_by}
                    onChange={(e) => updateField('administered_by', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Patient response, observations, etc."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Safety Reminder */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-yellow-800 font-medium text-sm">Medication Safety</p>
            </div>
            <ul className="text-yellow-700 text-xs space-y-1">
              <li>• Verify patient identity using two identifiers</li>
              <li>• Confirm medication name, dose, route, and time</li>
              <li>• Check for allergies and contraindications</li>
              <li>• Document administration immediately after giving</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Record Administration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};