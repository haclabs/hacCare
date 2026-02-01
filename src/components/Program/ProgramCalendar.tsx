import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from 'date-fns';

/**
 * Program Calendar Component
 * Simple calendar view for scheduling simulations
 * TODO: Integrate with react-big-calendar and scheduled_simulations table
 */
export const ProgramCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Generate a consistent "random" seed for placeholder events based on month
  // This will be the same between renders but different between months
  const eventSeed = monthStart.getTime();

  // Get day of week for first day of month (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();
  
  // Add empty cells for days before month starts
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
          {leadingEmptyCells.map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}
          
          {/* Days of month */}
          {daysInMonth.map((day) => {
            const today = isToday(day);
            // Use deterministic "random" based on date + seed for consistent placeholder events
            const hasEvent = (day.getDate() + eventSeed) % 3 === 0;
            
            return (
              <button
                key={day.toString()}
                className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/30 relative group ${
                  today 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' 
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <span>{format(day, 'd')}</span>
                
                {/* Placeholder for events - will be replaced with real data */}
                {hasEvent && !today && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-purple-500" />
                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                  </div>
                )}
                
                {/* Hover effect for scheduling */}
                <div className="absolute inset-0 rounded-lg border-2 border-blue-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all shadow-md">
          <Plus className="h-5 w-5" />
          Schedule Simulation
        </button>
      </div>

      {/* Coming Soon Note */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-blue-50 dark:bg-blue-900/20">
        <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
          📅 <strong>Coming Soon:</strong> Interactive scheduling with drag-and-drop, recurring sessions, and automated student assignment
        </p>
      </div>
    </div>
  );
};

export default ProgramCalendar;
