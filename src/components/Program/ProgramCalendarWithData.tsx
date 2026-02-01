import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/api/supabase';
import { 
  createScheduledSimulation, 
  updateScheduledSimulation, 
  deleteScheduledSimulation 
} from '../../services/admin/programService';
import CalendarEventModal, { ScheduledSimulationData } from './CalendarEventModal';

interface ScheduledSimulation {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'launched' | 'completed' | 'cancelled';
  student_count: number;
  room_location: string | null;
  instructor_id: string;
  notes: string | null;
}

/**
 * Program Calendar Component (Connected to Database)
 * Month view calendar showing real scheduled simulations
 */
export const ProgramCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editingEvent, setEditingEvent] = useState<ScheduledSimulation | null>(null);
  const [selectedEventForAction, setSelectedEventForAction] = useState<ScheduledSimulation | null>(null);
  
  const { currentTenant, programTenants } = useTenant();
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);
  const queryClient = useQueryClient();

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);

  // Fetch scheduled simulations for current month
  const { data: scheduledSessions = [], isLoading } = useQuery({
    queryKey: ['scheduled-simulations', currentProgram?.program_id, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!currentProgram?.program_id) return [];
      
      const { data, error } = await supabase
        .from('scheduled_simulations')
        .select('id, template_id, name, description, scheduled_start, scheduled_end, status, student_count, room_location, instructor_id, notes')
        .eq('program_id', currentProgram.program_id)
        .gte('scheduled_start', monthStart.toISOString())
        .lte('scheduled_start', monthEnd.toISOString())
        .order('scheduled_start');
      
      if (error) {
        console.error('Error fetching scheduled simulations:', error);
        return [];
      }
      
      return data as ScheduledSimulation[];
    },
    enabled: !!currentProgram?.program_id,
    staleTime: 30000
  });

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledSimulation[]> = {};
    scheduledSessions.forEach(session => {
      const dateKey = format(new Date(session.scheduled_start), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return grouped;
  }, [scheduledSessions]);

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const leadingEmptyCells = Array(firstDayOfWeek).fill(null);

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ScheduledSimulationData) => createScheduledSimulation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-simulations'] });
      setShowEventModal(false);
      setEditingEvent(null);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduledSimulationData> }) => 
      updateScheduledSimulation(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-simulations'] });
      setShowEventModal(false);
      setEditingEvent(null);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduledSimulation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-simulations'] });
      setSelectedEventForAction(null);
    }
  });

  const handleSaveEvent = async (eventData: ScheduledSimulationData) => {
    if (editingEvent?.id) {
      // Update existing
      await updateMutation.mutateAsync({ id: editingEvent.id, updates: eventData });
    } else {
      // Create new
      await createMutation.mutateAsync(eventData);
    }
  };

  const handleEditEvent = (event: ScheduledSimulation) => {
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (event: ScheduledSimulation) => {
    if (confirm(`Delete "${event.name}"? This cannot be undone.`)) {
      await deleteMutation.mutateAsync(event.id);
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingEvent(null);
    setShowEventModal(true);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells before month starts */}
          {leadingEmptyCells.map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[80px]" />
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day) => {
            const isCurrentDay = isToday(day);
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySessions = sessionsByDate[dateKey] || [];

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`min-h-[100px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
                  isCurrentDay
                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400 dark:ring-blue-600'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                } transition-colors cursor-pointer overflow-hidden`}
              >
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {daySessions.map(session => (
                    <div
                      key={session.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventForAction(session);
                      }}
                      className={`group relative px-1.5 py-1 rounded text-[10px] font-medium ${
                        session.status === 'scheduled'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                          : session.status === 'launched'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : session.status === 'completed'
                          ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/50'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                      }`}
                    >
                      <div className="truncate">
                        {format(new Date(session.scheduled_start), 'h:mm a')} - {session.name}
                      </div>
                      {session.room_location && (
                        <div className="text-[9px] opacity-75 truncate">{session.room_location}</div>
                      )}
                      {/* Action buttons on hover */}
                      <div className="absolute top-0 right-0 hidden group-hover:flex gap-1 p-1 bg-white dark:bg-gray-800 rounded shadow-lg">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(session);
                          }}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                          title="Edit event"
                        >
                          <Edit2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(session);
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Delete event"
                        >
                          <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setEditingEvent(null);
              setShowEventModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md transition-all"
          >
            <Plus className="h-4 w-4" />
            Schedule Simulation
          </button>
          {isLoading && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</span>
          )}
          {(createMutation.isPending || updateMutation.isPending || deleteMutation.isPending) && (
            <span className="text-sm text-blue-600 dark:text-blue-400">Saving...</span>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && scheduledSessions.length === 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>No sessions scheduled this month.</strong> Click "Schedule Simulation" to create your first session.
            </p>
          </div>
        )}
      </div>

      {/* Event Modal */}
      <CalendarEventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        selectedDate={selectedDate}
        existingEvent={editingEvent ? {
          id: editingEvent.id,
          template_id: editingEvent.template_id,
          program_id: currentProgram?.program_id || '',
          name: editingEvent.name,
          description: editingEvent.description || '',
          scheduled_start: editingEvent.scheduled_start,
          scheduled_end: editingEvent.scheduled_end,
          duration_minutes: Math.round((new Date(editingEvent.scheduled_end).getTime() - new Date(editingEvent.scheduled_start).getTime()) / 60000),
          instructor_id: editingEvent.instructor_id,
          room_location: editingEvent.room_location || '',
          status: editingEvent.status,
          notes: editingEvent.notes || ''
        } : null}
      />
    </div>
  );
};

export default ProgramCalendar;
