import React, { useState } from 'react';
import { FileText, Plus, Search, Grid, List, Play, Edit, Copy, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '../../contexts/TenantContext';
import { getSimulationTemplates } from '../../services/simulation/simulationService';
import { useUserProgramAccess } from '../../hooks/useUserProgramAccess';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '../UI/LoadingSpinner';

interface SimulationTemplate {
  id: string;
  name: string;
  description?: string;
  status: string;
  default_duration_minutes: number;
  created_at: string;
  snapshot_data?: unknown;
  primary_categories?: string[] | null;
}

/**
 * Program Templates Management Page
 * Manages simulation templates for the program
 */
export const ProgramTemplates: React.FC = () => {
  const { programTenants, currentTenant } = useTenant();
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { filterByPrograms } = useUserProgramAccess();

  // Load templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getSimulationTemplates(),
    staleTime: 30000
  });

  // Filter by program access
  const filteredTemplates = filterByPrograms(templates as SimulationTemplate[]);

  // Further filter by search
  const searchedTemplates = searchQuery
    ? (filteredTemplates as SimulationTemplate[]).filter((t: SimulationTemplate) =>
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredTemplates;

  if (!currentProgram) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">No program context found</p>
      </div>
    );
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
            <FileText className="h-8 w-8 text-blue-600" />
            Simulation Templates
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentProgram.program_name} - {searchedTemplates.length} templates available
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md">
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Search and View Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      {searchedTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No templates found' : 'No templates yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery 
              ? 'Try adjusting your search query'
              : 'Create your first simulation template to get started'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear search
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(searchedTemplates as SimulationTemplate[]).map((template: SimulationTemplate) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {template.name}
                  </h3>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      template.status === 'ready'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}
                  >
                    {template.status}
                  </span>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 space-y-1">
                <div>Duration: {template.default_duration_minutes} minutes</div>
                <div>Created {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium"
                  title="Edit template"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  disabled={!template.snapshot_data}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  title="Launch simulation"
                >
                  <Play className="h-4 w-4" />
                  Launch
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm"
                  title="Duplicate template"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm"
                  title="Delete template"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Template</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(searchedTemplates as SimulationTemplate[]).map((template: SimulationTemplate) => (
                <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                    {template.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                        {template.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        template.status === 'ready'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {template.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {template.default_duration_minutes} min
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        disabled={!template.snapshot_data}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProgramTemplates;
