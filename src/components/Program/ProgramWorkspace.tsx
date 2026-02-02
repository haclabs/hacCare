import React from 'react';
import { FileText, Users, Calendar as CalendarIcon } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { getSimulationTemplates } from '../../services/simulation/simulationService';
import { useUserProgramAccess } from '../../hooks/useUserProgramAccess';
import { supabase } from '../../lib/api/supabase';
import ProgramCalendar from './ProgramCalendarWithData';
import ProgramAnnouncements from './ProgramAnnouncements';

/**
 * Program Workspace Component
 * Landing page for program tenants showing Calendar + Announcements
 * Management functions moved to sidebar navigation
 */
export const ProgramWorkspace: React.FC = () => {
  const { currentTenant, programTenants } = useTenant();

  // Get the current program info
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);

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

  const programId = program?.id;

  // Load real stats
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getSimulationTemplates(),
    staleTime: 30000
  });

  const { filterByPrograms } = useUserProgramAccess();
  const filteredTemplates = filterByPrograms(templates as Array<{ primary_categories?: string[] | null }>);

  // Load student count
  const { data: studentCount = 0 } = useQuery({
    queryKey: ['studentCount', programId],
    queryFn: async () => {
      if (!programId) return 0;
      const { count } = await supabase
        .from('student_roster')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('is_active', true);
      return count || 0;
    },
    enabled: !!programId
  });



  // Get completed sessions count
  const { data: completedSessions = 0 } = useQuery({
    queryKey: ['completedSessions', programId],
    queryFn: async () => {
      if (!programId) return 0;
      const { count } = await supabase
        .from('simulation_active')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .contains('primary_categories', [currentProgram?.program_code || '']);
      return count || 0;
    },
    enabled: !!programId && !!currentProgram
  });

  if (!currentTenant || currentTenant.tenant_type !== 'program') {
    return null;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Modern Stats Cards with Hover Effects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Templates Card */}
        <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Templates</h3>
            </div>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{filteredTemplates.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active simulation templates</p>
          </div>
        </div>

        {/* Students Card */}
        <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl shadow-lg border border-purple-200 dark:border-purple-800 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-purple-600 text-white rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Students</h3>
            </div>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">{studentCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enrolled students</p>
          </div>
        </div>

        {/* Sessions Card */}
        <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl shadow-lg border border-green-200 dark:border-green-800 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-green-600 text-white rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Sessions</h3>
            </div>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">{completedSessions}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed this semester</p>
          </div>
        </div>
      </div>

      {/* Calendar + Announcements Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Calendar (2/3 width on large screens) */}
        <div className="lg:col-span-2">
          <ProgramCalendar />
        </div>

        {/* Right: Announcements (1/3 width on large screens) */}
        <div className="lg:col-span-1">
          <ProgramAnnouncements />
        </div>
      </div>
    </div>
  );
};

export default ProgramWorkspace;
