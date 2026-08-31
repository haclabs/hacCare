import React from 'react';
import { FileText, Users, Beaker, History, BookOpen, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { getSimulationTemplates } from '../../services/simulation/simulationService';
import { useUserProgramAccess } from '../../hooks/useUserProgramAccess';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

/**
 * Program Workspace Component
 * Landing page for program tenants. Management functions moved to sidebar navigation.
 */
export const ProgramWorkspace: React.FC = () => {
  const { currentTenant, programTenants } = useTenant();
  const navigate = useNavigate();

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
        secureLogger.error('Error fetching program:', error);
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

  const quickLinks = [
    {
      label: 'Templates',
      description: 'Build and manage simulation scenarios',
      icon: FileText,
      color: 'blue',
      onClick: () => navigate('/app?tab=simulations', { state: { initialTab: 'templates' } }),
    },
    {
      label: 'Active Simulations',
      description: 'Monitor and launch running sessions',
      icon: Beaker,
      color: 'violet',
      onClick: () => navigate('/app?tab=simulations', { state: { initialTab: 'active' } }),
    },
    {
      label: 'Debrief Reports',
      description: 'Review completed session activity',
      icon: History,
      color: 'green',
      onClick: () => navigate('/app?tab=simulations', { state: { initialTab: 'history' } }),
    },
    {
      label: 'Students',
      description: 'Manage the simulation student roster',
      icon: Users,
      color: 'purple',
      onClick: () => navigate('/app?tab=program-students'),
    },
    {
      label: 'Knowledge Base',
      description: 'Guides and answers for common tasks',
      icon: BookOpen,
      color: 'orange',
      onClick: () => navigate('/app?tab=documentation'),
    },
    {
      label: 'Instructor Guide',
      description: 'Walkthrough of the simulation workflow',
      icon: GraduationCap,
      color: 'indigo',
      onClick: () => navigate('/app?tab=simulations', { state: { initialTab: 'guide' } }),
    },
  ] as const;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Templates</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{filteredTemplates.length}</p>
          <p className="text-xs text-gray-500 mt-1">Active simulation templates</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Students</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{studentCount}</p>
          <p className="text-xs text-gray-500 mt-1">Simulation students</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <Beaker className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Sessions</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{completedSessions}</p>
          <p className="text-xs text-gray-500 mt-1">Completed this semester</p>
        </div>
      </div>

      {/* Instructor dashboard */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-3">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={link.onClick}
                className="group flex items-start gap-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all p-4 text-left"
              >
                <div className={`p-2 rounded-lg transition-colors ${colorClasses[link.color]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{link.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgramWorkspace;

