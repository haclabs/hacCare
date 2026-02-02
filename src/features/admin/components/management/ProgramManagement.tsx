import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { useTenant } from '../../../../contexts/TenantContext';
import { useAuth } from '../../../../hooks/useAuth';
import {
  getProgramsWithUserCounts,
  createProgram,
  updateProgram,
  deleteProgram,
  type ProgramWithUserCount
} from '../../../../services/admin/programService';
import LoadingSpinner from '../../../../components/UI/LoadingSpinner';

/**
 * Program Management Component
 * 
 * Allows super_admin and coordinator roles to manage programs within their tenant.
 * Programs are used to organize instructors, students, templates, and simulations.
 */
export const ProgramManagement: React.FC = () => {
  const { currentTenant } = useTenant();
  const { hasRole } = useAuth();
  const [programs, setPrograms] = useState<ProgramWithUserCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramWithUserCount | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check permissions
  const canManage = hasRole(['super_admin', 'coordinator']);

  useEffect(() => {
    loadPrograms();
  }, [currentTenant?.id, currentTenant?.parent_tenant_id]);

  const loadPrograms = async () => {
    if (!currentTenant) return;
    
    setLoading(true);
    
    // If in a program tenant, get programs from the parent organization
    // Otherwise, get programs for the current tenant
    const tenantIdToQuery = currentTenant.parent_tenant_id || currentTenant.id;
    
    const { data, error } = await getProgramsWithUserCounts(tenantIdToQuery);
    
    if (error) {
      setError('Failed to load programs');
      console.error(error);
    } else {
      setPrograms(data || []);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setFormData({ code: '', name: '', description: '' });
    setEditingProgram(null);
    setShowCreateModal(true);
    setError('');
    setSuccess('');
  };

  const handleEdit = (program: ProgramWithUserCount) => {
    setFormData({
      code: program.code,
      name: program.name,
      description: program.description || ''
    });
    setEditingProgram(program);
    setShowCreateModal(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (editingProgram) {
        // Update existing program
        const { error } = await updateProgram(editingProgram.id, {
          name: formData.name,
          description: formData.description || null
        });

        if (error) throw error;
        setSuccess('Program updated successfully');
      } else {
        // Create new program
        const { error } = await createProgram(
          currentTenant.id,
          formData.code,
          formData.name,
          formData.description
        );

        if (error) throw error;
        setSuccess('Program created successfully');
      }

      await loadPrograms();
      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save program');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (program: ProgramWithUserCount) => {
    if (!confirm(`Are you sure you want to delete program "${program.name}"?\n\nThis will remove ${program.user_count} user assignment(s).`)) {
      return;
    }

    const { error } = await deleteProgram(program.id);
    
    if (error) {
      setError('Failed to delete program');
      console.error(error);
    } else {
      setSuccess('Program deleted successfully');
      await loadPrograms();
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  if (!canManage) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Access Denied</h3>
        <p className="text-red-700 dark:text-red-300">
          Only Super Admins and Coordinators can manage programs.
        </p>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">About Programs</p>
            <p>Programs organize instructors, students, and simulations (e.g., NESA, PN, SIM Hub, BNAD). Each program has a dedicated workspace tenant where instructors can manage program-specific content.</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Program Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage programs for organizing instructors, students, and simulations
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Program
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Programs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {programs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No programs found. Create your first program to get started.</p>
                </td>
              </tr>
            ) : (
              programs.map((program) => (
                <tr key={program.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                      <Tag className="h-4 w-4" />
                      {program.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{program.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                      {program.description || <span className="italic opacity-50">No description</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <Users className="h-4 w-4" />
                      {program.user_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(program)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      title="Edit program"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(program)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete program"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingProgram ? 'Edit Program' : 'Create Program'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Code (only for new programs) */}
              {!editingProgram && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Program Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., NESA, PN, BNAD"
                    maxLength={10}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Short code used in simulation categories
                  </p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Program Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Practical Nursing Program"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {submitting ? 'Saving...' : editingProgram ? 'Update Program' : 'Create Program'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramManagement;
