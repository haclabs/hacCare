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
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-2">
            <h3 className="text-sm font-semibold text-gray-900">{sim.name}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              sim.status === 'running'
                ? 'bg-green-100 text-green-700'
                : sim.status === 'paused'
                ? 'bg-yellow-100 text-yellow-700'
                : sim.status === 'pending'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {sim.status}
            </span>
            {sim.status === 'completed' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Needs Reset
              </span>
            )}
            {sim.status === 'pending' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Ready to Start
              </span>
            )}
            {sim.is_expired && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Expired
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">
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

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{sim.participant_count} participants</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
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
            className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
            title="Edit category tags"
          >
            <Tag className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPrintLabels(sim)}
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            title="Print patient and medication labels"
          >
            <Printer className="h-4 w-4" />
          </button>
          {sim.status === 'running' ? (
            <button
              onClick={() => onPause(sim.id)}
              disabled={actionLoading === sim.id}
              className="p-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition-colors disabled:opacity-50"
              title="Pause simulation"
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => onResume(sim.id, false)}
              disabled={actionLoading === sim.id}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
              title={sim.status === 'pending' ? 'Start simulation' : sim.status === 'paused' ? 'Resume simulation' : 'Start simulation'}
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {(sim.status === 'running' || sim.status === 'paused' || sim.status === 'completed') && (
            <button
              onClick={() => onReset(sim.id)}
              disabled={actionLoading === sim.id}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
              title="Reset simulation data and set to ready state"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          {(sim.status === 'running' || sim.status === 'paused') && (
            <button
              onClick={() => onComplete(sim)}
              disabled={actionLoading === sim.id}
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              title="Complete simulation and create debrief"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(sim.id)}
            disabled={actionLoading === sim.id}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            title="Delete simulation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Participants List */}
      {sim.participants && sim.participants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-600 mb-2">Participants:</h4>
          <div className="flex flex-wrap gap-1.5">
            {sim.participants.map((participant: any) => (
              <span
                key={participant.id}
                className="px-2.5 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600"
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
        <div className="mt-4 bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">Template Updated</h4>
              <p className="text-sm text-amber-800 mb-2">
                Template has been updated to v{(sim as any).template_current_version}.
                Running v{(sim as any).template_running_version}.
              </p>
              <button
                onClick={() => onViewTemplateChanges(sim)}
                className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
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
