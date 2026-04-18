import React from 'react';
import { Play, Pause, RotateCcw, Trash2, CheckCircle, Printer, FileText } from 'lucide-react';

export const SimulationInstructorGuide: React.FC = () => {
  return (
    <div className="lg:col-span-1">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 p-6 sticky top-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Instructor Quick Guide</h3>
        </div>

        <div className="space-y-4 text-sm">
          {/* Workflow Steps */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Session Workflow</h4>
            <div className="space-y-2">
              {[
                { num: 1, bg: 'bg-indigo-600', title: 'Print Labels', desc: 'Patient & medication barcodes' },
                { num: 2, bg: 'bg-green-600', title: 'Click Play to Start', desc: 'Timer begins, students can access' },
                { num: 3, bg: 'bg-emerald-600', title: 'Click Complete', desc: 'Enter instructor name, creates debrief' },
                { num: 4, bg: 'bg-blue-600', title: 'Click Reset', desc: 'Clears data, status → "Ready to Start"' },
                { num: 5, bg: 'bg-green-600', title: 'Click Play (Next Group)', desc: 'Starts fresh timer for new students' },
              ].map(({ num, bg, title, desc }) => (
                <div key={num} className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full ${bg} text-white flex items-center justify-center text-xs font-bold`}>{num}</div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{title}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Print Labels */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</div>
              <Printer className="h-4 w-4" />
              Print Labels
              <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 ml-auto">(Optional if not pre-printed)</span>
            </h4>
            <p className="text-slate-700 dark:text-slate-300 mb-2">
              Print patient and medication barcode labels for BCMA scanning.
            </p>
            <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded text-xs">
              <p className="font-medium text-indigo-800 dark:text-indigo-300 mb-1">Printing Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
                <li>Use Avery 5160 label sheets (30 labels per sheet)</li>
                <li>Select high-quality print setting for barcode clarity</li>
                <li>Test print one sheet before bulk printing</li>
              </ul>
            </div>
          </div>

          {/* Start/Pause */}
          <div className="bg-gradient-to-r from-green-50 to-yellow-50 dark:from-green-900/20 dark:to-yellow-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
              Play to Start
            </h4>
            <p className="text-slate-700 dark:text-slate-300 mb-2">Click Play when ready to begin:</p>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 ml-2">
              <li className="flex items-start gap-2">
                <Play className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                <span><strong>Play:</strong> Starts timer and enables student access</span>
              </li>
              <li className="flex items-start gap-2">
                <Pause className="h-3 w-3 text-yellow-600 mt-1 flex-shrink-0" />
                <span><strong>Pause:</strong> Freezes timer if needed</span>
              </li>
            </ul>
          </div>

          {/* Complete */}
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <CheckCircle className="h-4 w-4" />
              Complete Simulation
            </h4>
            <p className="text-slate-700 dark:text-slate-300 mb-2">Click when students finish their work:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
              <li>Enter instructor name in popup</li>
              <li>Saves all student activities</li>
              <li>Generates debrief report</li>
              <li>Shows red "Needs Reset" badge</li>
            </ul>
          </div>

          {/* Reset */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</div>
              <RotateCcw className="h-4 w-4" />
              Reset for Next Group
            </h4>
            <p className="text-slate-700 dark:text-slate-300 mb-2">Prepares simulation for new students:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-2">
              <li>Clears all student work</li>
              <li>Restores baseline data</li>
              <li>Shows green "Ready to Start" badge</li>
              <li>Preserves patient barcodes (no reprinting!)</li>
            </ul>
            <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-200">
              ✅ After reset, go to step 2: Click <strong>Play</strong> when ready
            </div>
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-800 dark:text-red-200">
              ⚠️ <strong>Warning:</strong> Previous work is permanently deleted
            </div>
          </div>

          {/* Delete */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">6</div>
              <Trash2 className="h-4 w-4" />
              Delete Simulation
            </h4>
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Permanently removes the entire simulation session. Use only if simulation won't be needed again.
            </p>
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-200">
              ⚠️ Always Complete before Delete to save debrief reports in History
            </div>
          </div>

          {/* Timer Status */}
          <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
            <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">⏱️ Timer Colors</h4>
            <div className="space-y-2">
              {[
                { color: 'bg-green-500', label: 'Plenty of time' },
                { color: 'bg-yellow-500', label: '< 15 minutes left' },
                { color: 'bg-red-500', label: '< 5 minutes left' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <div className={`w-3 h-3 ${color} rounded-full`}></div>
                  <span className="text-slate-600 dark:text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
