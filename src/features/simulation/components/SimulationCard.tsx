import React from 'react';
import { Play, Pause, RotateCcw, Trash2, Users, Clock, AlertTriangle, CheckCircle, Printer, Tag, Package } from 'lucide-react';
import type { SimulationActiveWithDetails } from '../types/simulation';
import { PRIMARY_CATEGORIES, SUB_CATEGORIES } from '../types/simulation';
import { formatDistanceToNow } from 'date-fns';

interface SimulationCardProps {
  sim: SimulationActiveWithDetails;
  actionLoading: string | null;
  onPause: (id: string) => void;
  onResume: (id: string, isCompleted: boolean) => void;
  onReset: (id: string) => void;
  onComplete: (sim: SimulationActiveWithDetails) => void;
  onDelete: (id: string) => void;
  onEditCategories: (sim: SimulationActiveWithDetails) => void;
  onPrintLabels: (sim: SimulationActiveWithDetails) => void;
  onViewTemplateChanges: (sim: SimulationActiveWithDetails) => void;
}

export const SimulationCard: React.FC<SimulationCardProps> = ({
  sim,
  actionLoading,
  onPause,
  onResume,
  onReset,
  onComplete,
  onDelete,
  onEditCategories,
  onPrintLabels,
  onViewTemplateChanges,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{sim.name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              sim.status === 'running'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : sim.status === 'paused'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : sim.status === 'pending'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {sim.status}
            </span>
            {sim.status === 'completed' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Needs Reset
              </span>
            )}
            {sim.status === 'pending' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Ready to Start
              </span>
            )}
            {sim.is_expired && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Expired
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Template: {sim.template?.name}
          </p>

          {/* Category Badges */}
          {((sim.primary_categories && sim.primary_categories.length > 0) || (sim.sub_categories && sim.sub_categories.length > 0)) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {sim.primary_categories?.map((cat) => {
                const categoryConfig = PRIMARY_CATEGORIES.find(c => c.value === cat);
                return categoryConfig ? (
                  <span key={cat} className={`px-2 py-1 rounded text-xs font-medium ${categoryConfig.color}`}>
                    {categoryConfig.label}
                  </span>
                ) : null;
              })}
              {sim.sub_categories?.map((cat) => {
                const categoryConfig = SUB_CATEGORIES.find(c => c.value === cat);
                return categoryConfig ? (
                  <span key={cat} className={`px-2 py-1 rounded text-xs font-medium ${categoryConfig.color}`}>
                    {categoryConfig.label}
                  </span>
                ) : null;
              })}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{sim.participant_count} participants</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {(sim.time_remaining_minutes ?? 0) > 0
                  ? `${sim.time_remaining_minutes} minutes left`
                  : 'Time expired'}
              </span>
            </div>
            {sim.starts_at && (
              <div className="text-xs">
                Started {formatDistanceToNow(new Date(sim.starts_at), { addSuffix: true })}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditCategories(sim)}
            className="p-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
            title="Edit category tags"
          >
            <Tag className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPrintLabels(sim)}
            className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
            title="Print patient and medication labels"
          >
            <Printer className="h-4 w-4" />
          </button>
          {sim.status === 'running' ? (
            <button
              onClick={() => onPause(sim.id)}
              disabled={actionLoading === sim.id}
              className="p-2 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 disabled:opacity-50"
              title="Pause simulation"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onResume(sim.id, false)}
              disabled={actionLoading === sim.id}
              className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50"
              title={sim.status === 'pending' ? 'Start simulation' : sim.status === 'paused' ? 'Resume simulation' : 'Start simulation'}
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {(sim.status === 'running' || sim.status === 'paused' || sim.status === 'completed') && (
            <button
              onClick={() => onReset(sim.id)}
              disabled={actionLoading === sim.id}
              className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 disabled:opacity-50"
              title="Reset simulation data and set to ready state"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          {(sim.status === 'running' || sim.status === 'paused') && (
            <button
              onClick={() => onComplete(sim)}
              disabled={actionLoading === sim.id}
              className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 disabled:opacity-50"
              title="Complete simulation and create debrief"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(sim.id)}
            disabled={actionLoading === sim.id}
            className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50"
            title="Delete simulation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Participants List */}
      {sim.participants && sim.participants.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Participants:</h4>
          <div className="flex flex-wrap gap-2">
            {sim.participants.map((participant: any) => (
              <span
                key={participant.id}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-300"
              >
                {participant.user_profiles
                  ? `${participant.user_profiles.first_name} ${participant.user_profiles.last_name}`
                  : participant.user_profiles?.email} ({participant.role})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Template Update Banner */}
      {(sim as any).template_updated && (
        <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">Template Updated</h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                Template has been updated to v{(sim as any).template_current_version}.
                Running v{(sim as any).template_running_version}.
              </p>
              <button
                onClick={() => onViewTemplateChanges(sim)}
                className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
              >
                View Changes & Sync →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
