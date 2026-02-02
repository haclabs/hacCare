import React, { useState } from 'react';
import { Users, Plus, Search, Upload, Edit2, UserX, BarChart } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../contexts/TenantContext';
import { getStudentRoster } from '../../services/admin/programService';
import { supabase } from '../../lib/api/supabase';
import LoadingSpinner from '../UI/LoadingSpinner';
import { format } from 'date-fns';
import AddStudentModal from './AddStudentModal';
import ImportStudentsModal from './ImportStudentsModal';

/**
 * Program Students Management Page
 * Full student roster with search, pagination, and management
 */
export const ProgramStudents: React.FC = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const pageSize = 50;

  // Get program directly using program_id from current tenant
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
        console.error('Error fetching program:', error);
        return null;
      }
      return data;
    },
    enabled: !!currentTenant?.program_id
  });

  // Fetch student roster
  const { data: rosterData, isLoading } = useQuery({
    queryKey: ['student-roster', currentProgram?.id, currentPage, searchQuery],
    queryFn: async () => {
      if (!currentProgram?.id) return { data: [], count: 0 };
      return await getStudentRoster(currentProgram.id, currentPage, pageSize, searchQuery);
    },
    enabled: !!currentProgram?.id,
    staleTime: 30000
  });

  const students = rosterData?.data || [];
  const totalCount = rosterData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (!currentTenant || currentTenant.tenant_type !== 'program') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">Not in a program workspace</p>
      </div>
    );
  }

  if (!currentProgram) {
    return <LoadingSpinner />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-600" />
            Student Roster
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentProgram.name} - {totalCount} enrolled students
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Search by name, email, or student number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Enrolled
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No students found</p>
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
              students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold">
                        {student.user_profile?.first_name?.[0]}{student.user_profile?.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {student.user_profile?.first_name} {student.user_profile?.last_name}
                        </div>
                        {student.notes && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {student.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm font-medium">
                      {student.student_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {student.user_profile?.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(student.enrollment_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View simulations"
                      >
                        <BarChart className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Edit student"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Deactivate student"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} students
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && currentProgram && (
        <AddStudentModal
          programId={currentProgram.program_id}
          programName={currentProgram.program_name}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['student-roster'] });
          }}
        />
      )}

      {/* Import Students Modal */}
      {showImportModal && currentProgram && (
        <ImportStudentsModal
          programId={currentProgram.program_id}
          programName={currentProgram.program_name}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            queryClient.invalidateQueries({ queryKey: ['student-roster'] });
          }}
        />
      )}
    </div>
  );
};

export default ProgramStudents;
