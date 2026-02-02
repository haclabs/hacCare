import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import { getSimulationTemplates } from '../../services/simulation/simulationService';
import { supabase } from '../../lib/api/supabase';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: ScheduledSimulationData) => Promise<void>;
  selectedDate?: Date;
  existingEvent?: ScheduledSimulationData | null;
}

export interface ScheduledSimulationData {
  id?: string;
  template_id: string;
  program_id: string;
  name: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  instructor_id: string;
  room_location: string;
  cohort_id?: string | null;
  status?: 'scheduled' | 'launched' | 'completed' | 'cancelled';
  notes?: string;
}

/**
 * Calendar Event Modal
 * Modal for creating/editing scheduled simulation events
 */
export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  existingEvent
}) => {
  const { user } = useAuth();
  const { currentTenant, programTenants } = useTenant();
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);

  const [formData, setFormData] = useState<Partial<ScheduledSimulationData>>({
    name: '',
    description: '',
    template_id: '',
    program_id: currentProgram?.program_id || '',
    scheduled_start: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'09:00") : format(new Date(), "yyyy-MM-dd'T'09:00"),
    scheduled_end: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'11:00") : format(new Date(), "yyyy-MM-dd'T'11:00"),
    duration_minutes: 120,
    instructor_id: user?.id || '',
    room_location: '',
    cohort_id: null,
    notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load existing event data when editing
  useEffect(() => {
    if (existingEvent) {
      setFormData({
        ...existingEvent,
        scheduled_start: format(new Date(existingEvent.scheduled_start), "yyyy-MM-dd'T'HH:mm"),
        scheduled_end: format(new Date(existingEvent.scheduled_end), "yyyy-MM-dd'T'HH:mm")
      });
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        scheduled_start: format(selectedDate, "yyyy-MM-dd'T'09:00"),
        scheduled_end: format(selectedDate, "yyyy-MM-dd'T'11:00")
      }));
    }
  }, [existingEvent, selectedDate]);

  // Get program directly using program_id from current tenant
  const { data: program } = useQuery({
    queryKey: ['program', currentTenant?.program_id],
    queryFn: async () => {
      if (!currentTenant?.program_id) return null;
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', currentTenant.program_id)
        .single();
      
      if (error) {
        console.error('Error fetching program:', error);
        return null;
      }
      return data;
    },
    enabled: !!currentTenant?.program_id
  });
  
  const programs = program ? [program] : [];

  // Fetch templates for dropdown
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getSimulationTemplates(),
    staleTime: 30000
  });

  // Calculate duration when dates change
  useEffect(() => {
    if (formData.scheduled_start && formData.scheduled_end) {
      const start = new Date(formData.scheduled_start);
      const end = new Date(formData.scheduled_end);
      const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
      if (minutes > 0) {
        setFormData(prev => ({ ...prev, duration_minutes: minutes }));
      }
    }
  }, [formData.scheduled_start, formData.scheduled_end]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name?.trim()) {
      setError('Event name is required');
      return;
    }
    if (!formData.template_id) {
      setError('Please select a simulation template');
      return;
    }
    if (!formData.scheduled_start || !formData.scheduled_end) {
      setError('Start and end times are required');
      return;
    }

    const start = new Date(formData.scheduled_start);
    const end = new Date(formData.scheduled_end);
    if (end <= start) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        program_id: formData.program_id || currentProgram?.program_id || '',
        instructor_id: formData.instructor_id || user?.id || '',
        scheduled_start: new Date(formData.scheduled_start).toISOString(),
        scheduled_end: new Date(formData.scheduled_end).toISOString()
      } as ScheduledSimulationData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">
              {existingEvent ? 'Edit Event' : 'Schedule Simulation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., NESA Morning Session"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <BookOpen className="inline h-4 w-4 mr-1" />
              Simulation Template <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.template_id || ''}
              onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduled_start || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={formData.scheduled_end || ''}
                onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Duration Display */}
          {formData.duration_minutes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Duration:</strong> {formData.duration_minutes} minutes ({Math.floor(formData.duration_minutes / 60)}h {formData.duration_minutes % 60}m)
              </p>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Room/Location
            </label>
            <input
              type="text"
              value={formData.room_location || ''}
              onChange={(e) => setFormData({ ...formData, room_location: e.target.value })}
              placeholder="e.g., Simulation Lab 3A"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about this simulation session..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Internal)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes for instructors..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : existingEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarEventModal;
