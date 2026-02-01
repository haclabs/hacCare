import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/api/supabase';

interface ScheduledSimulation {
  id: string;
  name: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'launched' | 'completed' | 'cancelled';
  student_count: number;
  room_location: string | null;
}

/**
 * Program Calendar Component (Connected to Database)
 * Month view calendar showing real scheduled simulations
 */
export const ProgramCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { currentTenant, programTenants } = useTenant();
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);

  // Fetch scheduled simulations for current month
  const { data: scheduledSessions = [], isLoading } = useQuery({
    queryKey: ['scheduled-simulations', currentProgram?.program_id, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!currentProgram?.program_id) return [];
      
      const { data, error } = await supabase
        .from('scheduled_simulations')
        .select('id, name, scheduled_start, scheduled_end, status, student_count, room_location')
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
                className={`min-h-[80px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
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
                      title={`${session.name}${session.room_location ? ` - ${session.room_location}` : ''}\n${session.student_count} students`}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${
                        session.status === 'scheduled'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : session.status === 'launched'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : session.status === 'completed'
                          ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {format(new Date(session.scheduled_start), 'h:mm a')} - {session.name}
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
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md transition-all"
          >
            <Plus className="h-4 w-4" />
            Schedule Simulation
          </button>
          {isLoading && (
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading sessions...</span>
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
    </div>
  );
};

export default ProgramCalendar;
