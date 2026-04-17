import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

import type { Medication } from '../../../../types';
import { updateMedication } from '../../../../services/clinical/medicationService';
import { secureLogger } from '../../../../lib/security/secureLogger';

interface EditMedicationFormProps {
  medication: Medication;
  medications: Medication[];
  onMedicationUpdated: (updatedMedications: Medication[]) => void;
  onClose: () => void;
}

interface EditFormState {
  name: string;
  category: string;
  dosage: string;
  route: string;
  frequency: string;
  admin_time: string;
  admin_times: string[];
  prescribed_by: string;
  start_date: string;
  end_date: string;
}

function initForm(medication: Medication): EditFormState {
  const expectedCount =
    medication.frequency.includes('Four times') || medication.frequency.includes('QID')
      ? 4
      : medication.frequency.includes('Three times') || medication.frequency.includes('TID')
      ? 3
      : medication.frequency.includes('Twice') || medication.frequency.includes('BID')
      ? 2
      : 1;

  let adminTimes = medication.admin_times || [medication.admin_time || '08:00'];
  if (!medication.admin_times || adminTimes.length !== expectedCount) {
    const defaults = ['08:00', '14:00', '20:00', '02:00'];
    if (expectedCount > 1) {
      adminTimes = defaults.slice(0, expectedCount);
      if (medication.admin_time) adminTimes[0] = medication.admin_time;
    }
  }

  return {
    name: medication.name,
    category: medication.category || 'scheduled',
    dosage: medication.dosage,
    route: medication.route,
    frequency: medication.frequency,
    admin_time: medication.admin_time || '08:00',
    admin_times: adminTimes,
    prescribed_by: medication.prescribed_by,
    start_date: medication.start_date.split('T')[0],
    end_date: medication.end_date ? medication.end_date.split('T')[0] : '',
  };
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleChange = (raw: string) => {
    let v = raw.replace(/[^\d:]/g, '');
    if (v.length === 2 && !v.includes(':')) v = v + ':';
    const parts = v.split(':');
    if (parts[0] && parseInt(parts[0]) > 23) parts[0] = '23';
    if (parts[1] && parseInt(parts[1]) > 59) parts[1] = '59';
    onChange(parts.join(':'));
  };

  const handleBlur = (raw: string) => {
    const match = raw.match(/^(\d{1,2}):?(\d{0,2})$/);
    if (match) {
      const h = Math.min(parseInt(match[1]), 23).toString().padStart(2, '0');
      const m = Math.min(parseInt(match[2] || '0'), 59).toString().padStart(2, '0');
      onChange(`${h}:${m}`);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={(e) => handleBlur(e.target.value)}
        placeholder="HH:MM"
        maxLength={5}
        required
        className="w-full px-3 py-2.5 pr-8 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
      >
        <option value="">Select</option>
        {Array.from({ length: 24 }, (_, hour) =>
          ['00', '15', '30', '45'].map((min) => {
            const tv = `${hour.toString().padStart(2, '0')}:${min}`;
            return (
              <option key={tv} value={tv}>
                {tv}
              </option>
            );
          })
        ).flat()}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export const EditMedicationForm: React.FC<EditMedicationFormProps> = ({
  medication,
  medications,
  onMedicationUpdated,
  onClose,
}) => {
  const [form, setForm] = useState<EditFormState>(() => initForm(medication));
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const updateField = (field: string, value: string) => {
    if (field === 'frequency') {
      const match = value.match(/(\d+) times?/);
      const count = match ? parseInt(match[1]) : 1;
      const defaults = ['08:00', '14:00', '20:00', '02:00'];
      const newTimes = count > 1 ? defaults.slice(0, count) : [form.admin_time || '08:00'];
      setForm((prev) => ({
        ...prev,
        frequency: value,
        admin_times: newTimes,
        admin_time: newTimes[0],
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const updateAdminTime = (index: number, time: string) => {
    const newTimes = [...form.admin_times];
    newTimes[index] = time;
    setForm((prev) => ({ ...prev, admin_times: newTimes, admin_time: newTimes[0] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updated = await updateMedication(medication.id, {
        name: form.name,
        dosage: form.dosage,
        route: form.route,
        frequency: form.frequency,
        category: form.category as any,
        prescribed_by: form.prescribed_by,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        admin_time: form.admin_time,
        admin_times: form.admin_times,
      });

      const updatedList = medications.map((m) => (m.id === medication.id ? updated : m));
      onMedicationUpdated(updatedList);
      setSuccessMessage(`Medication "${form.name}" updated successfully`);
      setTimeout(onClose, 1500);
    } catch (error) {
      secureLogger.error('Error updating medication:', error);
      alert('Failed to update medication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isMultiTime =
    (form.frequency.includes('time') || form.frequency.includes('daily')) &&
    !form.frequency.includes('PRN') &&
    !form.frequency.includes('Once daily') &&
    !form.frequency.includes('Once monthly') &&
    !form.frequency.includes('Continuous');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Edit Medication</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medication Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => updateField('dosage', e.target.value)}
                required
                placeholder="e.g., 10mg, 2 tablets"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
              <select
                value={form.route}
                onChange={(e) => updateField('route', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select route...</option>
                <option value="PO">PO (Oral)</option>
                <option value="IV">IV (Intravenous)</option>
                <option value="IM">IM (Intramuscular)</option>
                <option value="SC">SC (Subcutaneous)</option>
                <option value="SL">SL (Sublingual)</option>
                <option value="TOP">Topical</option>
                <option value="INH">Inhaled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">💊 Frequency *</label>
              <select
                value={form.frequency}
                onChange={(e) => updateField('frequency', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select frequency...</option>
                <option value="Once daily">Once daily</option>
                <option value="BID (Twice daily)">BID (Twice daily)</option>
                <option value="TID (Three times daily)">TID (Three times daily)</option>
                <option value="QID (Four times daily)">QID (Four times daily)</option>
                <option value="PRN (As needed)">PRN (As needed)</option>
                <option value="Once monthly">Once monthly</option>
                <option value="Continuous">Continuous</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Category *</label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category...</option>
                <option value="scheduled">Scheduled</option>
                <option value="prn">PRN (As Needed)</option>
                <option value="diabetic">💉 Diabetic</option>
                <option value="continuous">Continuous</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prescribed By *
              </label>
              <input
                type="text"
                value={form.prescribed_by}
                onChange={(e) => updateField('prescribed_by', e.target.value)}
                required
                placeholder="Dr. Prescriber Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-blue-700 mb-2">
                ⏰ Administration {isMultiTime ? 'Times' : 'Time'} *
              </label>
              {isMultiTime ? (
                <div className="grid grid-cols-2 gap-3">
                  {form.admin_times.map((time, i) => (
                    <div key={i} className="space-y-1">
                      <label className="block text-xs font-medium text-blue-600">Time {i + 1}</label>
                      <TimeInput value={time} onChange={(v) => updateAdminTime(i, v)} />
                    </div>
                  ))}
                </div>
              ) : (
                <TimeInput
                  value={form.admin_time}
                  onChange={(v) => updateField('admin_time', v)}
                />
              )}
              <p className="text-xs text-blue-600 mt-2 font-medium">
                🔔 Scheduled alerts and BCMA will use these times for administration checks
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Medication'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
