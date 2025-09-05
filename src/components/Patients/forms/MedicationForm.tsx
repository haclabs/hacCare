import React, { useState } from 'react';
import { X, Pill, User, Save, AlertTriangle } from 'lucide-react';
import { Medication } from '../../../types';
import { createMedication, updateMedication } from '../../../lib/medicationService'; 
import { addHours, setHours, setMinutes, format } from 'date-fns';
import { formatLocalTime } from '../../../utils/dateUtils';
import { CheckCircle } from 'lucide-react';

interface MedicationFormProps {
  medication?: Medication | null;
  patientId: string;
  patientName: string;
  onClose: () => void; 
  onSuccess: (medication: Medication) => void;
  onCancel?: () => void;
}

export const MedicationForm: React.FC<MedicationFormProps> = ({
  medication,
  patientId,
  patientName,
  onClose,
  onSuccess,
  onCancel = onClose
}) => {
  const [formData, setFormData] = useState({
    name: medication?.name || '',
    dosage: medication?.dosage || '',
    category: medication?.category || 'scheduled',
    frequency: medication?.frequency || 'Once daily',
    route: medication?.route || 'Oral',
    startDate: medication?.start_date || format(new Date(), 'yyyy-MM-dd'),
    endDate: medication?.end_date || '',
    prescribedBy: medication?.prescribed_by || '',
    instructions: '',
    status: medication?.status || 'Active' as 'Active' | 'Completed' | 'Discontinued',
    adminTime: medication?.admin_time || '08:00' // Default to 8:00 AM
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate next due time based on frequency and admin time
  const calculateNextDue = (frequency: string, startDate: string, adminTime: string): string => {
    const start = new Date(startDate);
    const now = new Date();
    
    console.log('Calculating next due time:');
    console.log('- Frequency:', frequency);
    console.log('- Start date:', startDate);
    console.log('- Admin time:', adminTime);
    console.log('- Current time:', now.toISOString());
    
    // Parse admin time (HH:MM format)
    const [hours, minutes] = adminTime.split(':').map(Number);
    console.log('- Parsed hours:', hours, 'minutes:', minutes);
    
    // If start date is in the future, use start date with admin time
    if (start > now) {
      return setHours(setMinutes(start, minutes), hours).toISOString();
    }

    // Calculate next administration time based on frequency
    switch (frequency) {
      case 'Once daily':
        const today = new Date(now);
        const todayAdmin = setHours(setMinutes(today, minutes), hours);
        
        console.log('- Today admin time:', todayAdmin.toISOString());
        console.log('- Current time vs today admin:', now < todayAdmin ? 'before' : 'after');
        
        // If today's admin time hasn't passed, use it; otherwise, use tomorrow
        if (todayAdmin > now) {
          console.log('- Using today admin time');
          return todayAdmin.toISOString();
        } else {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowAdmin = setHours(setMinutes(tomorrow, minutes), hours);
          console.log('- Using tomorrow admin time:', tomorrowAdmin.toISOString());
          return tomorrowAdmin.toISOString();
        }
        
      case 'Twice daily':
        // Use user's admin time and 12 hours later
        const firstTime = setHours(setMinutes(new Date(now), minutes), hours);
        const secondTime = setHours(setMinutes(new Date(now), minutes), (hours + 12) % 24);
        
        // Find next upcoming time
        if (now < firstTime) {
          return firstTime.toISOString();
        } else if (now < secondTime) {
          return secondTime.toISOString();
        } else {
          // Next day's first time
          const nextDay = new Date(now);
          nextDay.setDate(nextDay.getDate() + 1);
          return setHours(setMinutes(nextDay, minutes), hours).toISOString();
        }
        
      case 'Three times daily':
        // Use user's admin time, +8 hours, +16 hours
        const times = [
          setHours(setMinutes(new Date(now), minutes), hours),
          setHours(setMinutes(new Date(now), minutes), (hours + 8) % 24),
          setHours(setMinutes(new Date(now), minutes), (hours + 16) % 24)
        ];
        
        for (const time of times) {
          if (now < time) {
            return time.toISOString();
          }
        }
        
        // Next day's first time
        const nextDay3 = new Date(now);
        nextDay3.setDate(nextDay3.getDate() + 1);
        return setHours(setMinutes(nextDay3, minutes), hours).toISOString();
        
      case 'Every 4 hours':
        return addHours(now, 4).toISOString();
        
      case 'Every 6 hours':
        // Calculate from user's admin time in 6-hour intervals
        const userTime = setHours(setMinutes(new Date(now), minutes), hours);
        const intervals = [];
        for (let i = 0; i < 4; i++) {
          const intervalTime = new Date(userTime);
          intervalTime.setHours((hours + (i * 6)) % 24);
          intervals.push(intervalTime);
        }
        
        for (const time of intervals) {
          if (now < time) {
            return time.toISOString();
          }
        }
        
        // Next day's first time
        const nextDay6 = new Date(now);
        nextDay6.setDate(nextDay6.getDate() + 1);
        return setHours(setMinutes(nextDay6, minutes), hours).toISOString();
        
      case 'Every 8 hours':
        // Calculate from user's admin time in 8-hour intervals
        const intervals8 = [];
        for (let i = 0; i < 3; i++) {
          const intervalTime = new Date(now);
          intervalTime.setHours((hours + (i * 8)) % 24);
          intervalTime.setMinutes(minutes);
          intervals8.push(intervalTime);
        }
        
        for (const time of intervals8) {
          if (now < time) {
            return time.toISOString();
          }
        }
        
        // Next day's first time
        const nextDay8 = new Date(now);
        nextDay8.setDate(nextDay8.getDate() + 1);
        return setHours(setMinutes(nextDay8, minutes), hours).toISOString();
        
      case 'Every 12 hours':
        // Use user's admin time and 12 hours later
        const first12 = setHours(setMinutes(new Date(now), minutes), hours);
        const second12 = setHours(setMinutes(new Date(now), minutes), (hours + 12) % 24);
        
        if (now < first12) {
          return first12.toISOString();
        } else if (now < second12) {
          return second12.toISOString();
        } else {
          // Next day's first time
          const nextDay12 = new Date(now);
          nextDay12.setDate(nextDay12.getDate() + 1);
          return setHours(setMinutes(nextDay12, minutes), hours).toISOString();
        }
        
      case 'As needed (PRN)':
        return now.toISOString(); // Immediate availability
        
      default:
        // Default to user's admin time
        const defaultTime = setHours(setMinutes(new Date(now), minutes), hours);
        if (now < defaultTime) {
          return defaultTime.toISOString();
        } else {
          const nextDayDefault = new Date(now);
          nextDayDefault.setDate(nextDayDefault.getDate() + 1);
          return setHours(setMinutes(nextDayDefault, minutes), hours).toISOString();
        }
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
    if (!formData.adminTime) newErrors.adminTime = 'Administration time is required for BCMA scheduling';

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
      if (medication) {
        // Update existing medication - include all fields for update
        const medicationData = {
          patient_id: patientId,
          name: formData.name,
          category: formData.category as 'scheduled' | 'unscheduled' | 'prn' | 'continuous',
          dosage: formData.dosage,
          frequency: formData.frequency,
          route: formData.route,
          start_date: formData.startDate,
          end_date: formData.endDate || undefined,
          prescribed_by: formData.prescribedBy,
          next_due: calculateNextDue(formData.frequency, formData.startDate, formData.adminTime),
          status: formData.status,
          admin_time: formData.adminTime
        };
        
        console.log('Updating existing medication:', medicationData);
        const updatedMedication = await updateMedication(medication.id, medicationData);
        console.log('Medication updated successfully:', updatedMedication);
        onSuccess(updatedMedication);
      } else {
        // Create new medication - exclude ID to let database generate it
        const medicationData: Omit<Medication, 'id'> = {
          patient_id: patientId,
          name: formData.name,
          category: formData.category as 'scheduled' | 'unscheduled' | 'prn' | 'continuous',
          dosage: formData.dosage,
          frequency: formData.frequency,
          route: formData.route,
          start_date: formData.startDate,
          end_date: formData.endDate || undefined,
          prescribed_by: formData.prescribedBy,
          next_due: calculateNextDue(formData.frequency, formData.startDate, formData.adminTime),
          status: formData.status,
          admin_time: formData.adminTime
        };
        
        console.log('Creating new medication:', medicationData);
        const newMedication = await createMedication(medicationData);
        console.log('New medication added successfully:', newMedication);
        onSuccess(newMedication);
      }
    } catch (error) {
      console.error('Error saving medication:', error);
      setErrors({ general: 'Failed to save medication. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {medication ? 'Edit Medication' : 'Add New Medication'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Patient: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6" onReset={onCancel}>
          {/* Medication Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Pill className="h-5 w-5 mr-2 text-green-600" />
              Medication Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g., Lisinopril, Metformin, Aspirin"
                  required
                />
                {errors.name && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Category
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.category === 'scheduled' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateField('category', 'scheduled')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Scheduled</span>
                      {formData.category === 'scheduled' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                    </div>
                    <p className="text-xs text-gray-500">Regular timing (daily, BID, TID, etc.)</p>
                  </div>
                  
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.category === 'unscheduled' 
                        ? 'border-yellow-500 bg-yellow-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateField('category', 'unscheduled')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Unscheduled</span>
                      {formData.category === 'unscheduled' && <CheckCircle className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <p className="text-xs text-gray-500">Irregular or one-time medications</p>
                  </div>
                  
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.category === 'prn' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateField('category', 'prn')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">PRN</span>
                      {formData.category === 'prn' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="text-xs text-gray-500">As needed medications</p>
                  </div>
                  
                  <div
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.category === 'continuous' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateField('category', 'continuous')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">Continuous</span>
                      {formData.category === 'continuous' && <CheckCircle className="h-4 w-4 text-purple-500" />}
                    </div>
                    <p className="text-xs text-gray-500">IV drips and continuous infusions</p>
                  </div>
                </div>
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

              <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  ⏰ Administration Time *
                </label>
                <input
                  type="time"
                  value={formData.adminTime}
                  onChange={(e) => updateField('adminTime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.adminTime ? 'border-red-300 dark:border-red-600' : 'border-blue-300 dark:border-blue-600'
                  }`}
                  required
                />
                {errors.adminTime && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.adminTime}</p>
                )}
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  🔔 Scheduled alerts and BCMA will use this time for administration checks
                </p>
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

              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-700">
                <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  📅 Next Scheduled Administration
                </label>
                <div className="px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-lg text-sm font-medium text-green-800 dark:text-green-200">
                  {formatLocalTime(new Date(calculateNextDue(formData.frequency, formData.startDate, formData.adminTime)), 'dd MMM yyyy - HH:mm')}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  🔔 Alert will trigger 15 minutes before • BCMA window: ±30 minutes • 24-hour format
                </p>
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

          {/* BCMA Integration Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Pill className="h-4 w-4 text-blue-600" />
              <p className="text-blue-800 dark:text-blue-300 font-medium text-sm">BCMA - Barcode Medication Administration</p>
            </div>
            <div className="text-blue-700 dark:text-blue-400 text-xs space-y-1">
              <p className="font-medium">When administering this medication, the BCMA system will:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>🔍 Require scanning of patient wristband barcode</li>
                <li>💊 Require scanning of medication package barcode</li>
                <li>⏰ Verify administration time matches scheduled time (±30 minutes)</li>
                <li>✅ Validate the "Five Rights" before allowing administration</li>
                <li>📝 Automatically log administration with timestamp and user</li>
              </ul>
              <p className="mt-2 text-xs italic">
                Administration time set above ({formData.adminTime}) will be used for timing validation.
              </p>
            </div>
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
              type="reset"
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