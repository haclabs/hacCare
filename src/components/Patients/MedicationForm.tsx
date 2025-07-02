import React, { useState } from 'react';
import { X, Pill, User, Save, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Medication } from '../../types';
import { format, addHours, setHours, setMinutes } from 'date-fns';

interface MedicationFormProps {
  medication?: Medication | null;
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSave: (medication: Medication) => void;
}

export const MedicationForm: React.FC<MedicationFormProps> = ({
  medication,
  patientId,
  patientName,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: medication?.name || '',
    dosage: medication?.dosage || '',
    frequency: medication?.frequency || 'Once daily',
    route: medication?.route || 'Oral',
    startDate: medication?.start_date || format(new Date(), 'yyyy-MM-dd'),
    endDate: medication?.end_date || '',
    prescribedBy: medication?.prescribed_by || '',
    instructions: '',
    status: medication?.status || 'Active' as 'Active' | 'Completed' | 'Discontinued'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate next due time based on frequency
  const calculateNextDue = (frequency: string, startDate: string): string => {
    const start = new Date(startDate);
    const now = new Date();
    
    // If start date is in the future, use start date
    if (start > now) {
      return setHours(setMinutes(start, 0), 8).toISOString(); // 8:00 AM
    }

    // Calculate next administration time based on frequency
    switch (frequency) {
      case 'Once daily':
        return setHours(setMinutes(now, 0), 8).toISOString(); // 8:00 AM
      case 'Twice daily':
        const currentHour = now.getHours();
        if (currentHour < 8) {
          return setHours(setMinutes(now, 0), 8).toISOString(); // 8:00 AM
        } else if (currentHour < 20) {
          return setHours(setMinutes(now, 0), 20).toISOString(); // 8:00 PM
        } else {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return setHours(setMinutes(tomorrow, 0), 8).toISOString(); // 8:00 AM tomorrow
        }
      case 'Three times daily':
        const threeTimes = [8, 14, 20]; // 8 AM, 2 PM, 8 PM
        for (const hour of threeTimes) {
          if (now.getHours() < hour) {
            return setHours(setMinutes(now, 0), hour).toISOString();
          }
        }
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        return setHours(setMinutes(nextDay, 0), 8).toISOString();
      case 'Every 4 hours':
        return addHours(now, 4).toISOString();
      case 'Every 6 hours':
        const sixHourTimes = [6, 12, 18, 24]; // 6 AM, 12 PM, 6 PM, 12 AM
        for (const hour of sixHourTimes) {
          if (now.getHours() < hour) {
            return setHours(setMinutes(now, 0), hour).toISOString();
          }
        }
        const nextDay6 = new Date(now);
        nextDay6.setDate(nextDay6.getDate() + 1);
        return setHours(setMinutes(nextDay6, 0), 6).toISOString();
      case 'Every 8 hours':
        const eightHourTimes = [8, 16, 24]; // 8 AM, 4 PM, 12 AM
        for (const hour of eightHourTimes) {
          if (now.getHours() < hour) {
            return setHours(setMinutes(now, 0), hour).toISOString();
          }
        }
        const nextDay8 = new Date(now);
        nextDay8.setDate(nextDay8.getDate() + 1);
        return setHours(setMinutes(nextDay8, 0), 8).toISOString();
      case 'Every 12 hours':
        const twelveHourTimes = [8, 20]; // 8 AM, 8 PM
        for (const hour of twelveHourTimes) {
          if (now.getHours() < hour) {
            return setHours(setMinutes(now, 0), hour).toISOString();
          }
        }
        const nextDay12 = new Date(now);
        nextDay12.setDate(nextDay12.getDate() + 1);
        return setHours(setMinutes(nextDay12, 0), 8).toISOString();
      case 'As needed (PRN)':
        return now.toISOString(); // Immediate availability
      default:
        return setHours(setMinutes(now, 0), 8).toISOString(); // Default to 8 AM
    }
  };

  const updateField = (field: string, value: string) => {
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Medication name is required';
    if (!formData.dosage.trim()) newErrors.dosage = 'Dosage is required';
    if (!formData.prescribedBy.trim()) newErrors.prescribedBy = 'Prescribing physician is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';

    // Validate end date if provided
    if (formData.endDate && formData.startDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const medicationData: Medication = {
        id: medication?.id || uuidv4(),
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        route: formData.route,
        start_date: formData.startDate,
        end_date: formData.endDate || undefined,
        prescribed_by: formData.prescribedBy,
        next_due: calculateNextDue(formData.frequency, formData.startDate),
        status: formData.status
      };

      await onSave(medicationData);
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('Failed to save medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {medication ? 'Edit Medication' : 'Add New Medication'}
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
          {/* Medication Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Pill className="h-5 w-5 mr-2 text-green-600" />
              Medication Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Lisinopril, Metformin, Aspirin"
                  required
                />
                {errors.name && (
                  <p className="text-red-600 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage *
                </label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => updateField('dosage', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dosage ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 10mg, 500mg, 81mg"
                  required
                />
                {errors.dosage && (
                  <p className="text-red-600 text-xs mt-1">{errors.dosage}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route
                </label>
                <select
                  value={formData.route}
                  onChange={(e) => updateField('route', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Oral">Oral (PO)</option>
                  <option value="IV">Intravenous (IV)</option>
                  <option value="IM">Intramuscular (IM)</option>
                  <option value="SubQ">Subcutaneous (SubQ)</option>
                  <option value="Topical">Topical</option>
                  <option value="Inhaled">Inhaled</option>
                  <option value="Rectal">Rectal (PR)</option>
                  <option value="Sublingual">Sublingual (SL)</option>
                  <option value="Transdermal">Transdermal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => updateField('frequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Once daily">Once daily</option>
                  <option value="Twice daily">Twice daily (BID)</option>
                  <option value="Three times daily">Three times daily (TID)</option>
                  <option value="Four times daily">Four times daily (QID)</option>
                  <option value="Every 4 hours">Every 4 hours</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Every 8 hours">Every 8 hours</option>
                  <option value="Every 12 hours">Every 12 hours</option>
                  <option value="As needed (PRN)">As needed (PRN)</option>
                  <option value="Once weekly">Once weekly</option>
                  <option value="At bedtime">At bedtime (HS)</option>
                  <option value="Before meals">Before meals (AC)</option>
                  <option value="After meals">After meals (PC)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>
            </div>
          </div>

          {/* Prescriber and Dates */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Prescriber & Schedule
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prescribing Physician *
                </label>
                <input
                  type="text"
                  value={formData.prescribedBy}
                  onChange={(e) => updateField('prescribedBy', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.prescribedBy ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Dr. Smith, Dr. Johnson"
                  required
                />
                {errors.prescribedBy && (
                  <p className="text-red-600 text-xs mt-1">{errors.prescribedBy}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.startDate && (
                  <p className="text-red-600 text-xs mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="text-red-600 text-xs mt-1">{errors.endDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Due
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                  {format(new Date(calculateNextDue(formData.frequency, formData.startDate)), 'MMM dd, yyyy HH:mm')}
                </div>
                <p className="text-xs text-gray-500 mt-1">Calculated based on frequency</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Instructions (Optional)
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => updateField('instructions', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Take with food, Monitor blood pressure, Hold if systolic BP < 100"
            />
          </div>

          {/* Safety Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-yellow-800 font-medium text-sm">Medication Safety</p>
            </div>
            <ul className="text-yellow-700 text-xs space-y-1">
              <li>• Verify patient allergies before administering</li>
              <li>• Check for drug interactions with current medications</li>
              <li>• Confirm dosage calculations and administration route</li>
              <li>• Document administration time and patient response</li>
            </ul>
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : medication ? 'Update Medication' : 'Add Medication'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};