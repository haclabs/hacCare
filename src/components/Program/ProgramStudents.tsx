import React, { useMemo, useState } from 'react';
import { KeyRound, Search, Eye, EyeOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../../contexts/TenantContext';
import { getSimulationAutoStudentsByProgram } from '../../services/simulation/autoStudentService';
import { supabase } from '../../lib/api/supabase';
import LoadingSpinner from '../UI/LoadingSpinner';
import { format } from 'date-fns';
import { secureLogger } from '../../lib/security/secureLogger';

const STATUS_BADGE: Record<string, string> = {
  running: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-700',
};

/**
 * Active Simulation Student Logins
 *
 * Instructors never create real student accounts by hand — every student
 * login is a disposable "simulation-only" account auto-generated from the
 * "auto-generate student" checkbox on Launch Simulation. This page just lets
 * an instructor look up which simulation an account belongs to and reveal
 * its password again (same info shown by the "Logins" button on Active
 * Simulations), rather than offering roster CRUD that would never be used.
 */
export const ProgramStudents: React.FC = () => {
  const { currentTenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const { data: currentProgram } = useQuery({
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

  const { data: logins = [], isLoading } = useQuery({
    queryKey: ['simulation-auto-students', currentProgram?.id],
    queryFn: () => getSimulationAutoStudentsByProgram(currentProgram!.id),
    enabled: !!currentProgram?.id,
    staleTime: 30000
  });

  const filteredLogins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return logins;
    return logins.filter(l =>
      l.email.toLowerCase().includes(q) ||
      l.student_number.toLowerCase().includes(q) ||
      (l.label || '').toLowerCase().includes(q) ||
      (l.simulation?.name || '').toLowerCase().includes(q)
    );
  }, [logins, searchQuery]);

  const toggleReveal = (id: string) => {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!currentTenant || currentTenant.tenant_type !== 'program') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">Not in a program workspace</p>
      </div>
    );
  }

  if (!currentProgram || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <KeyRound className="h-8 w-8 text-purple-600" />
          Active Simulation Student Logins
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {currentProgram.name} - {logins.length} auto-generated login{logins.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, student number, or simulation..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Logins Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Simulation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No auto-generated student logins found</p>
                  <p className="text-xs mt-1">
                    Use the "Auto-generate simulation-only student login(s)" option on Launch Simulation to create one.
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
                    >
                      Clear search
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredLogins.map((login) => (
                <tr key={login.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold shrink-0">
                        {(login.label || login.student_number)[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {login.label || login.student_number}
                        </div>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                          {login.student_number}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {login.simulation ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[login.simulation.status] || 'bg-gray-100 text-gray-700'}`}>
                        {login.simulation.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Simulation deleted</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">
                    {login.email}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-800 dark:text-gray-200">
                        {revealed.has(login.id) ? login.temp_password : '••••••••'}
                      </span>
                      <button
                        onClick={() => toggleReveal(login.id)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title={revealed.has(login.id) ? 'Hide password' : 'Show password'}
                      >
                        {revealed.has(login.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(login.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgramStudents;
