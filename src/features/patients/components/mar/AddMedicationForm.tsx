import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

import type { Patient, Medication } from '../../../../types';
import { createMedication } from '../../../../services/clinical/medicationService';
import { secureLogger } from '../../../../lib/security/secureLogger';

interface AddMedicationFormProps {
  patient: Patient;
  currentMedications: Medication[];
  onMedicationAdded: (updatedMedications: Medication[]) => void;
  onClose: () => void;
}

interface MedFormState {
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

const defaultForm: MedFormState = {
  name: '',
  category: '',
  dosage: '',
  route: '',
  frequency: '1 time daily',
  admin_time: '08:00',
  admin_times: ['08:00'],
  prescribed_by: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
};

function calculateNextDue(
  frequency: string,
  _startDate: string,
  adminTime: string,
  adminTimes?: string[]
): string {
  if (!adminTime) return new Date().toISOString();

  const now = new Date();

  if (
    (frequency.includes('time daily') || frequency.includes('times daily')) &&
    !frequency.includes('PRN') &&
    adminTimes &&
    adminTimes.length > 0
  ) {
    const todayTimes = adminTimes
      .map((time) => {
        const [h, m] = time.split(':').map(Number);
        const t = new Date(now);
        t.setHours(h, m, 0, 0);
        return t;
      })
      .sort((a, b) => a.getTime() - b.getTime());

    for (const t of todayTimes) {
      if (t > now) return t.toISOString();
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [fh, fm] = adminTimes[0].split(':').map(Number);
    tomorrow.setHours(fh, fm, 0, 0);
    return tomorrow.toISOString();
  }

  const [hours, minutes] = adminTime.split(':').map(Number);

  switch (frequency) {
    case 'Once daily': {
      const todayAdmin = new Date(now);
      todayAdmin.setHours(hours, minutes, 0, 0);
      if (todayAdmin > now) return todayAdmin.toISOString();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hours, minutes, 0, 0);
      return tomorrow.toISOString();
    }
    case 'Once monthly': {
      const todayAdmin = new Date(now);
      todayAdmin.setHours(hours, minutes, 0, 0);
      if (todayAdmin > now) return todayAdmin.toISOString();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setHours(hours, minutes, 0, 0);
      return nextMonth.toISOString();
    }
    case 'Twice daily': {
      const first = new Date(now);
      first.setHours(hours, minutes, 0, 0);
      const second = new Date(first);
      second.setHours(hours + 12, minutes, 0, 0);
      if (second.getDate() !== first.getDate()) {
        second.setDate(second.getDate() - 1);
        second.setHours(second.getHours() - 12);
      }
      if (now < first) return first.toISOString();
      if (now < second) return second.toISOString();
      const next = new Date(first);
      next.setDate(next.getDate() + 1);
      return next.toISOString();
    }
    case 'Three times daily': {
      const times = Array.from({ length: 3 }, (_, i) => {
        const t = new Date(now);
        t.setHours(hours + i * 8, minutes, 0, 0);
        if (t.getDate() !== now.getDate() && i > 0) {
          t.setDate(t.getDate() - 1);
          t.setHours(t.getHours() - 24);
        }
        return t;
      });
      const next = times.find((t) => t > now);
      if (next) return next.toISOString();
      const nextDay = new Date(times[0]);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay.toISOString();
    }
    case 'Four times daily': {
      const times = Array.from({ length: 4 }, (_, i) => {
        const t = new Date(now);
        t.setHours(hours + i * 6, minutes, 0, 0);
        if (t.getDate() !== now.getDate() && i > 0) {
          t.setDate(t.getDate() - 1);
          t.setHours(t.getHours() - 24);
        }
        return t;
      });
      const next = times.find((t) => t > now);
      if (next) return next.toISOString();
      const nextDay = new Date(times[0]);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay.toISOString();
    }
    case 'Every 4 hours':
    case 'Every 6 hours':
    case 'Every 8 hours':
    case 'Every 12 hours': {
      const intervalHours = parseInt(frequency.match(/\d+/)?.[0] || '24');
      const nextDose = new Date(now);
      nextDose.setHours(hours, minutes, 0, 0);
      if (nextDose <= now) {
        nextDose.setTime(nextDose.getTime() + intervalHours * 60 * 60 * 1000);
      }
      return nextDose.toISOString();
    }
    default: {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(hours, minutes, 0, 0);
      return next.toISOString();
    }
  }
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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
        className="w-full px-3 py-2.5 pr-8 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
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

export const AddMedicationForm: React.FC<AddMedicationFormProps> = ({
  patient,
  currentMedications,
  onMedicationAdded,
  onClose,
}) => {
  const [form, setForm] = useState<MedFormState>(defaultForm);
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
    if (
      !form.name ||
      !form.category ||
      !form.dosage ||
      !form.route ||
      !form.prescribed_by ||
      !form.start_date
    ) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const medicationData: Omit<Medication, 'id'> = {
        patient_id: patient.id,
        name: form.name,
        dosage: form.dosage,
        route: form.route,
        frequency: form.frequency,
        category: form.category as any,
        status: 'Active',
        prescribed_by: form.prescribed_by,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        next_due:
          form.category === 'prn' || form.category === 'stat'
            ? new Date().toISOString()
            : calculateNextDue(form.frequency, form.start_date, form.admin_time, form.admin_times),
        last_administered: undefined,
        admin_time: form.admin_time,
        admin_times: form.admin_times.length > 1 ? form.admin_times : null,
      };

      secureLogger.debug('Creating medication in database:', medicationData);
      const saved = await createMedication(medicationData);
      secureLogger.debug('Medication saved successfully:', saved);

      onMedicationAdded([...currentMedications, saved]);
      setSuccessMessage(`${form.category} medication "${form.name}" added successfully`);
      setTimeout(onClose, 1500);
    } catch (error) {
      secureLogger.error('Error adding medication:', error);
      alert(`Failed to add medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isMultiTime =
    (form.frequency.includes('time daily') || form.frequency.includes('times daily')) &&
    !form.frequency.includes('PRN') &&
    !form.frequency.includes('One Time Admin');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Add New Medication</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                placeholder="Enter medication name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="prn">PRN (As Needed) - No alerts</option>
                <option value="scheduled">Scheduled - Time-based alerts</option>
                <option value="continuous">IV/Continuous - Critical alerts</option>
                <option value="stat">STAT (No Alert)</option>
                <option value="diabetic">🩸 Diabetic - Glucose monitoring</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => updateField('dosage', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 10mg, 5ml"
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
                <option value="">Select route</option>
                <option value="Oral">Oral</option>
                <option value="IV">Intravenous (IV)</option>
                <option value="IM">Intramuscular (IM)</option>
                <option value="SC">Subcutaneous (SC)</option>
                <option value="Topical">Topical</option>
                <option value="Inhalation">Inhalation</option>
                <option value="Rectal">Rectal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <select
                value={form.frequency}
                onChange={(e) => updateField('frequency', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select frequency</option>
                <option value="1 time daily">1 time daily</option>
                <option value="2 times daily">2 times daily</option>
                <option value="3 times daily">3 times daily</option>
                <option value="4 times daily">4 times daily</option>
                <option value="Every 4 hours">Every 4 hours</option>
                <option value="As needed (PRN)">As needed (PRN)</option>
                <option value="One Time Admin (Now)">One Time Admin (Now)</option>
                <option value="Continuous">Continuous infusion</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-blue-700 mb-3">
                ⏰ Administration {isMultiTime ? 'Times' : 'Time'} *{' '}
                {!isMultiTime && (
                  <span className="text-gray-500 font-normal">(24-hour format)</span>
                )}
              </label>
              {isMultiTime ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {form.admin_times.map((time, i) => (
                    <div key={i} className="space-y-1">
                      <label className="text-xs text-blue-600 font-medium">
                        Time {i + 1} <span className="text-gray-500">(24h)</span>
                      </label>
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
              <p className="text-xs text-blue-600 mt-3 font-medium">
                🔔 Enter time in 24-hour format (e.g., 08:00, 14:30) • Used for alerts and BCMA
                validation
              </p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. Smith"
              />
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
                {isLoading ? 'Adding...' : 'Add Medication'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
