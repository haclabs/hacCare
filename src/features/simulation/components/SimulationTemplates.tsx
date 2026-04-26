/**
 * ===========================================================================
 * SIMULATION TEMPLATES TAB
 * ===========================================================================
 * Template management with Create/Edit/Snapshot/Launch functionality.
 * List-first layout with search, filter chips, program grouping, and
 * hover-reveal actions. Grid view available via toggle.
 * ===========================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Play, Save, Trash2, Camera, Upload, Edit,
  Search, LayoutGrid, List, ChevronDown, HelpCircle, FolderOpen, Folder, X, Check,
} from 'lucide-react';
import { getSimulationTemplates, saveTemplateSnapshot, deleteSimulationTemplate, updateTemplateFolder } from '../../../services/simulation/simulationService';
import type { SimulationTemplateWithDetails } from '../types/simulation';
import CreateTemplateModal from './CreateTemplateModal';
import LaunchSimulationModal from './LaunchSimulationModal';
import TemplateExportButton from './TemplateExportButton';
import TemplateImportModal from './TemplateImportModal';
import { formatDistanceToNow } from 'date-fns';
import { useUserProgramAccess } from '../../../hooks/useUserProgramAccess';
import { useNavigate } from 'react-router-dom';
import { secureLogger } from '../../../lib/security/secureLogger';

/** Extract the patient/scenario part of a name after the separator → first letter as avatar initial */
function getTemplateInitial(name: string): string {
  const match = name.match(/[—–-]+\s*(\S)/);
  return match ? match[1].toUpperCase() : name.charAt(0).toUpperCase();
}

/** Deterministic avatar color based on the patient name character, cycles through a palette */
function getAvatarColor(name: string): string {
  const palettes = [
    'bg-blue-500',   'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500',  'bg-cyan-500',   'bg-indigo-500',  'bg-teal-500',
  ];
  // Sum char codes of the part after the separator for a stable, name-specific color
  const seed = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return palettes[seed % palettes.length];
}

const SimulationTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<SimulationTemplateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<SimulationTemplateWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter / view state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'draft'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Folder editing state
  const [editingFolderFor, setEditingFolderFor] = useState<string | null>(null);
  const [folderInput, setFolderInput] = useState('');

  // Expanded row state
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  // Get user's program access
  const { filterByPrograms, canSeeAllPrograms, isInstructor } = useUserProgramAccess();

  const loadTemplates = async () => {
    try {
      const data = await getSimulationTemplates();
      setTemplates(data);
    } catch (error) {
      secureLogger.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTemplates();
  }, []);

  // ── Derived / filtered data ────────────────────────────────────────────────

  const programFiltered = useMemo(
    () => filterByPrograms(templates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates],
  );

  const displayedTemplates = useMemo(() => {
    const q = search.toLowerCase();
    return programFiltered.filter(t => {
      if (q && !t.name.toLowerCase().includes(q) && !(t.description?.toLowerCase().includes(q))) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      const folderLabel = t.folder || 'Uncategorized';
      if (groupFilter !== 'all' && folderLabel !== groupFilter) return false;
      return true;
    });
  }, [programFiltered, search, statusFilter, groupFilter]);

  /** Unique folders across ALL program-filtered templates (for filter chips) */
  const uniqueFolders = useMemo(() => {
    const folders = new Set(programFiltered.map(t => t.folder || 'Uncategorized'));
    folders.delete('Uncategorized');
    return [...folders].sort();
  }, [programFiltered]);

  /** Templates grouped by folder, for the list view */
  const grouped = useMemo(() => {
    const acc: Record<string, SimulationTemplateWithDetails[]> = {};
    for (const t of displayedTemplates) {
      const g = t.folder || 'Uncategorized';
      if (!acc[g]) acc[g] = [];
      acc[g].push(t);
    }
    return acc;
  }, [displayedTemplates]);

  const sortedGroups = useMemo(
    () => Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    }),
    [grouped],
  );

  /** All existing folder names (for autocomplete suggestions when assigning) */
  const existingFolders = useMemo(
    () => [...new Set(templates.map(t => t.folder).filter(Boolean) as string[])].sort(),
    [templates],
  );

  const handleSaveFolder = async (templateId: string) => {
    const value = folderInput.trim() || null;
    try {
      await updateTemplateFolder(templateId, value);
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, folder: value } : t));
    } catch (error) {
      secureLogger.error('Error updating template folder:', error);
      alert('Failed to update folder');
    } finally {
      setEditingFolderFor(null);
      setFolderInput('');
    }
  };

  const handleSaveSnapshot = async (templateId: string) => {
    setActionLoading(templateId);
    try {
      const result = await saveTemplateSnapshot(templateId);
      if (result.success) {
        alert('Snapshot saved successfully!');
        await loadTemplates();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      secureLogger.error('Error saving snapshot:', error);
      alert('Failed to save snapshot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Delete this template? This will NOT delete active simulations using this template.')) {
      return;
    }
    setActionLoading(templateId);
    try {
      await deleteSimulationTemplate(templateId);
      await loadTemplates();
    } catch (error) {
      secureLogger.error('Error deleting template:', error);
      alert('Failed to delete template');
    } finally {
      setActionLoading(null);
    }
  };


  const handleEditTemplate = async (template: SimulationTemplateWithDetails) => {
    // Store the template being edited in session storage
    secureLogger.debug('🎨 Edit Template clicked:', template.name, template.id);
    
    // Store the template being edited in session storage
    const editInfo = {
      template_id: template.id,
      template_name: template.name,
      tenant_id: template.tenant_id
    };
    secureLogger.debug('💾 Storing edit info:', editInfo);
    sessionStorage.setItem('editing_template', JSON.stringify(editInfo));

    // Navigate to patients page and trigger template edit mode
    secureLogger.debug('🚀 Navigating to patients view and triggering template-edit-start event');
    
    // Dispatch event to notify TemplateEditingBanner with the template info
    window.dispatchEvent(new CustomEvent('template-edit-start', { detail: editInfo }));
    
    // Navigate to patients tab in main app view
    navigate('/app?tab=patients');
  };
  
  const handleLaunch = (template: SimulationTemplateWithDetails) => {
    setSelectedTemplate(template);
    setShowLaunchModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalFiltered = displayedTemplates.length;

  return (
    <>
      <div className="space-y-3">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Simulation Templates
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create and manage simulation scenarios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <Upload className="h-4 w-4" />
              + Import
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              + Create Template
            </button>
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Status chips */}
          {(['all', 'ready', 'draft'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                statusFilter === s
                  ? s === 'all'
                    ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent'
                    : s === 'ready'
                    ? 'bg-green-600 text-white border-transparent'
                    : 'bg-amber-500 text-white border-transparent'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}

          {/* Folder chips */}
          {uniqueFolders.map(g => (
            <button
              key={g}
              onClick={() => setGroupFilter(groupFilter === g ? 'all' : g)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                groupFilter === g
                  ? 'bg-purple-600 text-white border-transparent'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <Folder className="h-3 w-3" />
              {g}
            </button>
          ))}

          <div className="flex-1" />

          {/* List / grid toggle */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Instructor notice ────────────────────────────────────────────── */}
        {isInstructor && !canSeeAllPrograms && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            Admins and coordinators can create templates. Instructors see only their assigned programs.
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {totalFiltered === 0 && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {search || statusFilter !== 'all' || groupFilter !== 'all'
                ? 'No templates match your filters'
                : isInstructor ? 'No Templates in Your Program' : 'No Templates Yet'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {search || statusFilter !== 'all' || groupFilter !== 'all'
                ? 'Try clearing the search or filters'
                : isInstructor
                ? 'Templates must be tagged with your program to appear here'
                : 'Create your first simulation template to get started'}
            </p>
            {canSeeAllPrograms && !search && statusFilter === 'all' && groupFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Create Template
              </button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            LIST VIEW
        ══════════════════════════════════════════════════════════════════ */}
        {viewMode === 'list' && totalFiltered > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {sortedGroups.map((group, gIdx) => (
              <div key={group}>
                {/* Group header */}
                <div className={`px-4 py-2.5 flex items-center gap-3 bg-slate-100/80 dark:bg-slate-700/50 ${
                  gIdx > 0 ? 'border-t border-slate-200 dark:border-slate-700' : ''
                }`}>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    {group}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200">
                    {grouped[group].length}
                  </span>
                </div>

                {/* Template rows */}
                {grouped[group].map((template, tIdx) => (
                  <div key={template.id}>
                  <div
                    onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                    className={`group relative flex items-center gap-3 pl-3 pr-4 py-3 transition-colors cursor-pointer border-l-4 ${
                      template.status === 'ready'
                        ? 'border-l-green-500'
                        : template.status === 'draft'
                        ? 'border-l-amber-400'
                        : 'border-l-slate-300 dark:border-l-slate-600'
                    } ${
                      tIdx % 2 === 0
                        ? 'bg-white dark:bg-slate-800'
                        : 'bg-slate-100/80 dark:bg-slate-700/40'
                    } hover:bg-blue-50/60 dark:hover:bg-slate-700/50 ${
                      tIdx < grouped[group].length - 1
                        ? 'border-b border-slate-100 dark:border-slate-700/50'
                        : ''
                    }`}
                  >
                    {/* Patient initials avatar */}
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(template.name)}`}>
                      {getTemplateInitial(template.name)}
                    </div>

                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {template.name}
                        </span>
                        {template.primary_categories && template.primary_categories.length > 0 && (
                          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                            {template.primary_categories.map(c => (
                              <span
                                key={c}
                                className="px-1.5 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {template.description}
                        </p>
                      )}
                    </div>

                    {/* Expand chevron */}
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-slate-300 ${
                      expandedTemplate === template.id ? 'rotate-180' : ''
                    }`} />

                    {/* Right-side meta — visible at rest, fades on hover */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 transition-opacity duration-150 group-hover:opacity-0 pointer-events-none shrink-0">
                      <span>{template.default_duration_minutes} min</span>
                      {template.snapshot_taken_at ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
                          <Camera className="h-3 w-3" />
                          {formatDistanceToNow(new Date(template.snapshot_taken_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-amber-500 dark:text-amber-400">No snapshot</span>
                      )}
                      <span className={`capitalize px-2 py-0.5 rounded-full font-medium ${
                        template.status === 'ready'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : template.status === 'draft'
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {template.status}
                      </span>
                    </div>

                    {/* Hover action buttons — revealed on hover, absolutely positioned */}
                    {editingFolderFor === template.id ? (
                      /* Folder assignment inline editor */
                      <div className="absolute right-4 inset-y-0 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <FolderOpen className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <div className="relative">
                          <input
                            autoFocus
                            type="text"
                            value={folderInput}
                            onChange={e => setFolderInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveFolder(template.id);
                              if (e.key === 'Escape') { setEditingFolderFor(null); setFolderInput(''); }
                            }}
                            placeholder="Folder name…"
                            list={`folders-${template.id}`}
                            className="w-40 px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-amber-400 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                          />
                          {existingFolders.length > 0 && (
                            <datalist id={`folders-${template.id}`}>
                              {existingFolders.map(f => <option key={f} value={f} />)}
                            </datalist>
                          )}
                        </div>
                        <button
                          onClick={() => handleSaveFolder(template.id)}
                          className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 rounded-md"
                          title="Save folder"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => { setEditingFolderFor(null); setFolderInput(''); }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 rounded-md"
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="absolute right-4 inset-y-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          disabled={actionLoading === template.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-md disabled:opacity-50 transition-colors"
                          title="Edit template patients and data"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleSaveSnapshot(template.id)}
                          disabled={actionLoading === template.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-md disabled:opacity-50 transition-colors"
                          title="Save current state as snapshot"
                        >
                          <Save className="h-3 w-3" />
                          Snapshot
                        </button>
                        <button
                          onClick={() => handleLaunch(template)}
                          disabled={!template.snapshot_data || actionLoading === template.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={!template.snapshot_data ? 'Save snapshot first' : 'Launch simulation'}
                        >
                          <Play className="h-3 w-3" />
                          Launch
                        </button>
                        <button
                          onClick={() => { setEditingFolderFor(template.id); setFolderInput(template.folder || ''); }}
                          className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-md transition-colors"
                          title={template.folder ? `Folder: ${template.folder} — click to change` : 'Assign to folder'}
                        >
                          <Folder className="h-3 w-3" />
                        </button>
                        <TemplateExportButton
                          templateId={template.id}
                          templateName={template.name}
                          disabled={!template.snapshot_data || actionLoading === template.id}
                        />
                        <button
                          onClick={() => handleDelete(template.id)}
                          disabled={actionLoading === template.id}
                          className="p-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md disabled:opacity-50 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        {actionLoading === template.id && (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded description panel */}
                  {expandedTemplate === template.id && (
                    <div className={`px-4 py-3 border-l-4 ${
                      template.status === 'ready' ? 'border-l-green-500' : template.status === 'draft' ? 'border-l-amber-400' : 'border-l-slate-300 dark:border-l-slate-600'
                    } ${
                      tIdx % 2 === 0 ? 'bg-blue-50/40 dark:bg-slate-700/30' : 'bg-blue-50/60 dark:bg-slate-700/50'
                    } ${
                      tIdx < grouped[group].length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''
                    }`}>
                      <div className="ml-11 space-y-2">
                        {template.description ? (
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {template.description}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 dark:text-slate-500 italic">No description provided.</p>
                        )}
                        <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>Duration: <strong className="text-slate-700 dark:text-slate-300">{template.default_duration_minutes} min</strong></span>
                          <span>Status: <strong className={`${
                            template.status === 'ready' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                          } capitalize`}>{template.status}</strong></span>
                          {template.snapshot_taken_at && (
                            <span className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              Snapshot {formatDistanceToNow(new Date(template.snapshot_taken_at), { addSuffix: true })}
                            </span>
                          )}
                          {template.folder && (
                            <span className="flex items-center gap-1">
                              <Folder className="h-3 w-3" />
                              {template.folder}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            GRID VIEW (original card layout)
        ══════════════════════════════════════════════════════════════════ */}
        {viewMode === 'grid' && totalFiltered > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <span
                      className={`
                        inline-block px-2 py-1 rounded text-xs font-medium
                        ${
                          template.status === 'ready'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : template.status === 'draft'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                        }
                      `}
                    >
                      {template.status}
                    </span>
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Program Category Badges */}
                {template.primary_categories && template.primary_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.primary_categories.map((category) => (
                      <span
                        key={category}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        📚 {category}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-xs text-slate-500 dark:text-slate-500 mb-4 space-y-1">
                  <div>Default duration: {template.default_duration_minutes} minutes</div>
                  <div>Created {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</div>
                  {template.snapshot_data && template.snapshot_taken_at && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Camera className="h-3 w-3" />
                      <span>Snapshot saved {formatDistanceToNow(new Date(template.snapshot_taken_at), { addSuffix: true })}</span>
                    </div>
                  )}
                  {template.snapshot_data && !template.snapshot_taken_at && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Camera className="h-3 w-3" />
                      <span>Snapshot saved</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      disabled={actionLoading === template.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      title="Edit template patients and data"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleLaunch(template)}
                      disabled={!template.snapshot_data || actionLoading === template.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      title={!template.snapshot_data ? 'Save snapshot first' : 'Launch simulation'}
                    >
                      <Play className="h-4 w-4" />
                      <span className="hidden sm:inline">Launch</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveSnapshot(template.id)}
                      disabled={actionLoading === template.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg disabled:opacity-50 text-sm"
                      title="Save current state as snapshot"
                    >
                      <Save className="h-4 w-4" />
                      <span className="hidden sm:inline">Save</span>
                    </button>
                    <TemplateExportButton
                      templateId={template.id}
                      templateName={template.name}
                      disabled={!template.snapshot_data || actionLoading === template.id}
                    />
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={actionLoading === template.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg disabled:opacity-50 text-sm"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── How to Use (collapsible) ─────────────────────────────────────── */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowHowTo(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
          >
            <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              How to Use Simulation Templates
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 ml-auto transition-transform duration-200 ${showHowTo ? 'rotate-180' : ''}`} />
          </button>

          {showHowTo && (
            <div className="px-6 py-5 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-xs">1</span>
                  Create a Template
                </h4>
                <p className="ml-7">
                  Click "+ Create Template" above. Give it a name, description, and default duration.
                  The template starts with{' '}
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300 font-mono text-xs">draft</span>{' '}
                  status.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-xs">2</span>
                  Build Your Scenario
                </h4>
                <p className="ml-7">
                  Click <strong>Edit</strong> to switch into the template tenant and add patients, medications, vitals, and assessments.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-xs">3</span>
                  Save Snapshot
                </h4>
                <p className="ml-7">
                  Click <strong>Snapshot</strong> once your scenario is ready. This captures all data and marks the template as{' '}
                  <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-300 font-mono text-xs">ready</span>.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 bg-green-600 text-white rounded-full text-xs">4</span>
                  Launch Simulation
                </h4>
                <p className="ml-7">
                  Click <strong>Launch</strong> to create a new simulation instance. Select participants and duration.
                  Each launch creates a separate, isolated environment from the snapshot.
                </p>
              </div>
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-900 dark:text-yellow-100">
                  <strong>💡 Tip:</strong> You can launch the same template multiple times to run parallel simulations with different groups.
                  Each launch creates a separate, isolated environment.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTemplates();
          }}
        />
      )}

      {showImportModal && (
        <TemplateImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadTemplates();
          }}
        />
      )}

      {showLaunchModal && selectedTemplate && (
        <LaunchSimulationModal
          template={selectedTemplate}
          onClose={() => {
            setShowLaunchModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowLaunchModal(false);
            setSelectedTemplate(null);
            // Optionally switch to Active tab
          }}
        />
      )}
    </>
  );
};

export default SimulationTemplates;
