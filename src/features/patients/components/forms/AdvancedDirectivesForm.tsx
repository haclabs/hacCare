import React, { useState, useEffect } from 'react';
import { X, Save, FileCheck, Shield, Heart, AlertTriangle } from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';
import { upsertAdvancedDirective, AdvancedDirective } from '../../../../api/advancedDirectives'; 

interface AdvancedDirectivesFormProps {
  patientId: string;
  patientName?: string;
  onClose: () => void;
  onSave?: () => void;
}

export const AdvancedDirectivesForm: React.FC<AdvancedDirectivesFormProps> = ({
  patientId,
  patientName,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<AdvancedDirective | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { refreshPatients } = usePatients();

  useEffect(() => {
    loadAdvancedDirective();
  }, [patientId]);

  const loadAdvancedDirective = async () => {
    try {
      setLoading(true);
      
      // Always start with a completely empty form
      const emptyDirective: AdvancedDirective = {
        patient_id: patientId,
        living_will_exists: false,
        living_will_status: '',
        living_will_date: '',
        healthcare_proxy_name: '',
        healthcare_proxy_phone: '',
        dnr_status: false,
        organ_donation_status: false,
        organ_donation_details: '',
        religious_preference: '',
        special_instructions: ''
      };
      
      setFormData(emptyDirective);
    } catch (err: any) {
      console.error('Error loading advanced directive:', err);
      setError(err.message || 'Failed to load advanced directive');
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
      
      // Make sure required fields are filled
      const requiredFields = ['living_will_status', 'dnr_status'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
      
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setSaving(false);
        return;
      }
      
      // Save to database
      const savedDirective = await upsertAdvancedDirective(formData);
      console.log('Advanced directive saved successfully:', savedDirective);
      
      // Refresh patient data to reflect changes
      await refreshPatients();
      
      if (onSave) {
        onSave();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving advanced directive:', err);
      setError(err.message || 'Failed to save advanced directive');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof AdvancedDirective, value: string | boolean) => {
    if (!formData) return;
    setFormData((prev: AdvancedDirective | null) => prev ? { ...prev, [field]: value } : null);
  };

  const updateBooleanField = (field: keyof AdvancedDirective, value: string) => {
    if (!formData) return;
    const boolValue = value === 'true' || value === 'yes';
    setFormData((prev: AdvancedDirective | null) => prev ? { ...prev, [field]: boolValue } : null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading advanced directives...</p>
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
            <p className="text-gray-600 dark:text-gray-400">Failed to load advanced directives</p>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Update Advanced Directives - {patientName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            type="button"
          >
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

          {/* Legal Documents */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <FileCheck className="h-5 w-5 mr-2 text-blue-600" />
              Legal Documents & Directives
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Living Will Status
                </label>
                <select
                  value={formData.living_will_status}
                  onChange={(e) => updateField('living_will_status', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.living_will_status ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  required
                >
                  <option value="">Select status</option>
                  <option value="On File">On File</option>
                  <option value="Not Available">Not Available</option>
                  <option value="Pending">Pending</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Living Will Date
                </label>
                <input
                  type="date"
                  value={formData.living_will_date}
                  onChange={(e) => updateField('living_will_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Healthcare Proxy
                </label>
                <input
                  type="text"
                  value={formData.healthcare_proxy_name}
                  onChange={(e) => updateField('healthcare_proxy_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Name and relationship"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Healthcare Proxy Phone
                </label>
                <input
                  type="tel"
                  value={formData.healthcare_proxy_phone}
                  onChange={(e) => updateField('healthcare_proxy_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DNR Status
                </label>
                <select
                  value={formData.dnr_status ? 'yes' : 'no'}
                  onChange={(e) => updateBooleanField('dnr_status', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600`}
                  required
                >
                  <option value="no">No DNR</option>
                  <option value="yes">DNR (Do Not Resuscitate)</option>
                  <option value="DNI">Do Not Intubate</option>
                  <option value="DNR/DNI">DNR/DNI</option>
                  <option value="Comfort Care">Comfort Care Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Organ Donation */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Heart className="h-5 w-5 mr-2 text-red-600" />
              Organ Donation Preferences
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Organ Donation Status
                </label>
                <select
                  value={formData.organ_donation_status ? 'yes' : 'no'}
                  onChange={(e) => updateBooleanField('organ_donation_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                >
                  <option value="no">Not an organ donor</option>
                  <option value="yes">Registered organ donor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Donation Details
                </label>
                <input
                  type="text"
                  value={formData.organ_donation_details}
                  onChange={(e) => updateField('organ_donation_details', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="All organs and tissues"
                />
              </div>
            </div>
          </div>

          {/* Religious and Personal Preferences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-600" />
              Religious & Personal Preferences
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Religious Preference
                </label>
                <input
                  type="text"
                  value={formData.religious_preference}
                  onChange={(e) => updateField('religious_preference', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Catholic, Protestant, Jewish, etc."
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Special Instructions
              </label>
              <textarea
                value={formData.special_instructions}
                onChange={(e) => updateField('special_instructions', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Any special instructions for care, family involvement, religious considerations, etc."
              />
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <p className="text-yellow-800 dark:text-yellow-300 font-medium text-sm">Important Notes</p>
            </div>
            <ul className="text-yellow-700 dark:text-yellow-400 text-sm space-y-1">
              <li>• All advance directives should be reviewed and updated regularly</li>
              <li>• Healthcare proxy should be contacted and aware of patient preferences</li>
              <li>• Patient competency should be assessed before making changes</li>
              <li>• Copies of all documents should be maintained in the medical record</li>
            </ul>
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
              <span>{saving ? 'Saving...' : 'Save Directives'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};