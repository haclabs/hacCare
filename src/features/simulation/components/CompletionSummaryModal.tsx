import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  User,
  Activity,
  Pill,
  FlaskConical,
  FileText,
  Heart,
} from 'lucide-react';
import type { StudentActivity } from '../../../services/simulation/studentActivityService';

interface CompletionSummaryModalProps {
  simulationName: string;
  instructorName: string;
  activities: StudentActivity[];
  warnings: string[];
  /** False when the completion RPC itself threw — simulation may not be archived. */
  completed: boolean;
  onClose: () => void;
}

function entryBreakdown(activity: StudentActivity): Array<{ label: string; count: number; icon: React.ReactNode }> {
  const a = activity.activities;
  return [
    { label: 'Vitals', count: a.vitals.length, icon: <Activity className="h-3 w-3" /> },
    { label: 'Medications', count: a.medications.length, icon: <Pill className="h-3 w-3" /> },
    { label: 'Lab Orders', count: a.labOrders.length, icon: <FlaskConical className="h-3 w-3" /> },
    { label: 'Lab Acks', count: a.labAcknowledgements.length, icon: <FlaskConical className="h-3 w-3" /> },
    { label: 'Notes', count: a.patientNotes.length, icon: <FileText className="h-3 w-3" /> },
    { label: 'Handover', count: a.handoverNotes.length, icon: <FileText className="h-3 w-3" /> },
    { label: 'Doctors Orders', count: a.doctorsOrders.length, icon: <FileText className="h-3 w-3" /> },
    { label: 'Bowel', count: a.bowelAssessments.length, icon: <Activity className="h-3 w-3" /> },
    { label: 'Neuro', count: a.neuroAssessments.length, icon: <Activity className="h-3 w-3" /> },
    { label: 'I&O', count: a.intakeOutput.length, icon: <Activity className="h-3 w-3" /> },
    { label: 'Wounds', count: a.woundAssessments.length, icon: <Heart className="h-3 w-3" /> },
    { label: 'Devices', count: a.deviceAssessments.length, icon: <Activity className="h-3 w-3" /> },
    { label: 'BBIT', count: a.bbitEntries.length, icon: <Activity className="h-3 w-3" /> },
    { label: 'Newborn', count: a.newbornAssessments.length, icon: <Heart className="h-3 w-3" /> },
    { label: 'Adv. Directives', count: a.advancedDirectives.length, icon: <FileText className="h-3 w-3" /> },
  ].filter(e => e.count > 0);
}

export function CompletionSummaryModal({
  simulationName,
  instructorName,
  activities,
  warnings,
  completed,
  onClose,
}: CompletionSummaryModalProps) {
  const hasWarnings = warnings.length > 0;
  const totalEntries = activities.reduce((sum, s) => sum + s.totalEntries, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border-4 border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center gap-3 rounded-t-xl ${
            !completed
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : hasWarnings
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
          }`}
        >
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              !completed
                ? 'bg-red-100 dark:bg-red-900/40'
                : hasWarnings
                ? 'bg-amber-100 dark:bg-amber-900/40'
                : 'bg-green-100 dark:bg-green-900/40'
            }`}
          >
            {!completed ? (
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            ) : hasWarnings ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={`text-lg font-bold truncate ${
                !completed
                  ? 'text-red-900 dark:text-red-100'
                  : hasWarnings
                  ? 'text-amber-900 dark:text-amber-100'
                  : 'text-green-900 dark:text-green-100'
              }`}
            >
              {!completed ? 'Completion Failed' : 'Simulation Completed'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{simulationName}</p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Critical failure — completion RPC threw */}
          {!completed && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
              <p className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">
                ⚠️ ERROR: Simulation may NOT have been archived
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                An error occurred during completion. Student data may still be in the simulation.
              </p>
              {warnings.length > 0 && (
                <div className="bg-red-100 dark:bg-red-900/40 rounded p-3 mb-3 font-mono text-xs text-red-900 dark:text-red-100 break-words space-y-1">
                  {warnings.map((w, i) => <div key={i}>{w}</div>)}
                </div>
              )}
              <div className="bg-red-100 dark:bg-red-900/40 rounded p-3 text-sm font-semibold text-red-900 dark:text-red-100 text-center">
                🚨 DO NOT RESET UNTIL YOU SPEAK TO SUPPORT 🚨
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Resetting now will permanently destroy student records.
              </p>
            </div>
          )}

          {/* Partial warnings — completion succeeded but something was imperfect */}
          {completed && hasWarnings && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">
                ⚠️ Completed with warnings — review before resetting
              </p>
              <ul className="space-y-1 mb-3">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1">
                    <span className="mt-0.5 flex-shrink-0">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                If any student records are missing, contact support before resetting.
              </p>
            </div>
          )}

          {/* Success summary */}
          {completed && !hasWarnings && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                ✅ Simulation archived successfully. All student records have been saved to the debrief report.
              </p>
            </div>
          )}

          {/* Instructor */}
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Completed by: <span className="font-semibold text-slate-900 dark:text-slate-100">{instructorName}</span>
          </div>

          {/* Student activity summary */}
          {activities.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Student Records Saved &mdash; {activities.length} student{activities.length !== 1 ? 's' : ''},{' '}
                {totalEntries} total entries
              </h4>
              <div className="space-y-2">
                {activities.map((activity) => {
                  const breakdown = entryBreakdown(activity);
                  return (
                    <div
                      key={activity.studentName}
                      className="border border-slate-200 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-700/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {activity.studentName}
                        </span>
                        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                          {activity.totalEntries} entries
                        </span>
                      </div>
                      {breakdown.length > 0 ? (
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {breakdown.map((e) => (
                            <span
                              key={e.label}
                              className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400"
                            >
                              {e.icon}
                              {e.label}: {e.count}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No categorized entries</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
              <User className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              No student activity records were captured for this simulation.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
