/**
 * ===========================================================================
 * PATIENT TEMPLATES LIBRARY
 * ===========================================================================
 * Reusable single-patient templates that instructors (scoped to their
 * program) or super_admin can build, edit, and copy into any simulation
 * template. Mirrors SimulationTemplates.tsx's list/edit/delete pattern, but
 * simplified — one patient per template, single snapshot, no versioning.
 * ===========================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { UserCog, Plus, Trash2, Edit, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPatientTemplates, deletePatientTemplate } from '../../../services/simulation/patientTemplateService';
import type { PatientTemplate } from '../types/patientTemplate';
import CreatePatientTemplateModal from './CreatePatientTemplateModal';
import { useUserProgramAccess } from '../../../hooks/useUserProgramAccess';
import { secureLogger } from '../../../lib/security/secureLogger';

const PatientTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<PatientTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { filterByPrograms, canSeeAllPrograms, isInstructor } = useUserProgramAccess();

  const loadTemplates = async () => {
    try {
      const data = await getPatientTemplates();
      setTemplates(data);
    } catch (error) {
      secureLogger.error('Error loading patient templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTemplates();
  }, []);

  const displayedTemplates = useMemo(() => {
    const programFiltered = filterByPrograms(templates);
    const q = search.toLowerCase();
    if (!q) return programFiltered;
    return programFiltered.filter(t =>
      t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, search]);

  const handleEdit = (template: PatientTemplate) => {
    const editInfo = {
      template_id: template.id,
      template_name: template.name,
      tenant_id: template.tenant_id,
      kind: 'patient' as const,
    };
    sessionStorage.setItem('editing_template', JSON.stringify(editInfo));
    window.dispatchEvent(new CustomEvent('template-edit-start', { detail: editInfo }));
    navigate('/app?tab=patients');
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this patient template? This will NOT affect simulation templates it was already copied into.')) {
      return;
    }
    setActionLoading(templateId);
    try {
      await deletePatientTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      secureLogger.error('Error deleting patient template:', error);
      alert('Failed to delete patient template');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 p-3 bg-fuchsia-100 rounded-xl">
                <UserCog className="h-6 w-6 text-fuchsia-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Patient Library</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Build reusable single-patient templates you can add into any simulation template
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              Create Patient Template
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-8 py-6 space-y-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patient templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {isInstructor && !canSeeAllPrograms && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
              <UserCog className="h-3.5 w-3.5 flex-shrink-0" />
              You see only patient templates tagged with your assigned program(s).
            </div>
          )}

          {displayedTemplates.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-gray-700 mb-1">
                {search ? 'No patient templates match your search' : 'No Patient Templates Yet'}
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {search
                  ? 'Try clearing the search'
                  : 'Create a reusable patient you can add into any simulation template'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Create Patient Template
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {displayedTemplates.map((template, idx) => (
                <div
                  key={template.id}
                  className={`flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors border-l-4 ${
                    template.status === 'ready' ? 'border-l-green-500' : 'border-l-amber-400'
                  } ${idx < displayedTemplates.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{template.name}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        template.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {template.status === 'ready' ? 'Ready' : 'Draft'}
                      </span>
                      {template.primary_categories?.map(c => (
                        <span key={c} className="px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                          {c}
                        </span>
                      ))}
                    </div>
                    {template.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{template.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={actionLoading === template.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreatePatientTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTemplates();
          }}
        />
      )}
    </>
  );
};

export default PatientTemplates;
