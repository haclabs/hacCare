/**
 * Instructor Name Modal
 * Prompts for instructor name when completing a simulation
 */

import React, { useState, useEffect } from 'react';
import { UserCheck, X, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';

interface InstructorNameModalProps {
  simulationName: string;
  programCodes: string[]; // e.g., ['NESA', 'PN']
  onConfirm: (instructorName: string) => void;
  onCancel: () => void;
}

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export const InstructorNameModal: React.FC<InstructorNameModalProps> = ({
  simulationName,
  programCodes,
  onConfirm,
  onCancel
}) => {
  const [instructorName, setInstructorName] = useState('');
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  // Load instructors from programs
  useEffect(() => {
    const loadInstructors = async () => {
      try {
        setLoading(true);
        
        // Query instructors assigned to the simulation's programs
        const { data, error } = await supabase
          .from('user_programs')
          .select(`
            user_id,
            user:user_profiles!inner (
              id,
              first_name,
              last_name,
              email,
              role
            ),
            program:programs!inner (
              code
            )
          `)
          .in('program.code', programCodes.length > 0 ? programCodes : ['___NONE___']) // Filter by program codes
          .eq('user.role', 'instructor');

        if (error) {
          console.error('Error loading instructors:', error);
          return;
        }

        // Extract unique instructors
        const uniqueInstructors = new Map<string, Instructor>();
        data?.forEach((item: any) => {
          const instructor = item.user;
          if (instructor && !uniqueInstructors.has(instructor.id)) {
            uniqueInstructors.set(instructor.id, {
              id: instructor.id,
              first_name: instructor.first_name,
              last_name: instructor.last_name,
              email: instructor.email
            });
          }
        });

        setInstructors(Array.from(uniqueInstructors.values()));
      } catch (error) {
        console.error('Error loading instructors:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInstructors();
  }, [programCodes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instructorName.trim()) {
      onConfirm(instructorName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Complete Simulation
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Completing: <span className="font-semibold text-slate-900 dark:text-white">{simulationName}</span>
            </p>
            
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Your Name (Instructor)
            </label>
            {loading ? (
              <div className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                Loading instructors...
              </div>
            ) : instructors.length === 0 ? (
              <input
                type="text"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         placeholder-slate-400 dark:placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
            ) : (
              <div className="relative">
                <select
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400
                           appearance-none cursor-pointer"
                >
                  <option value="">Select your name...</option>
                  {instructors
                    .sort((a, b) => a.last_name.localeCompare(b.last_name))
                    .map((instructor) => (
                      <option key={instructor.id} value={`${instructor.first_name} ${instructor.last_name}`}>
                        {instructor.first_name} {instructor.last_name}
                      </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {instructors.length > 0 
                ? 'Select your name from the instructors assigned to this program. Your name will be saved with the simulation debrief.'
                : 'Your name will be saved with this simulation debrief for tracking and filtering purposes.'}
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 
                       rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!instructorName.trim()}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg 
                       hover:bg-purple-700 transition-colors font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Simulation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
