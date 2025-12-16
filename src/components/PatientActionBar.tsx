/**
 * Patient Action Bar - Reusable quick actions toolbar
 * 
 * Provides consistent navigation and action buttons across all patient modules
 * with badge counts and alert indicators
 */

import React from 'react';
import { 
  FileText, 
  Activity, 
  Pill, 
  FlaskConical, 
  FileCheck, 
  MapPin, 
  Droplets, 
  MessageSquare 
} from 'lucide-react';

export interface PatientActionBarProps {
  // Handler functions
  onChartClick?: () => void;
  onVitalsClick?: () => void;
  onMedsClick?: () => void;
  onLabsClick?: () => void;
  onOrdersClick?: () => void;
  onHacMapClick?: () => void;
  onIOClick?: () => void;
  onNotesClick?: () => void;

  // Badge counts
  vitalsCount?: number;
  medsCount?: number;
  
  // Alert indicators (NEW badges)
  hasNewLabs?: boolean;
  hasNewOrders?: boolean;
  hasNewNotes?: boolean;

  // Active state
  activeAction?: 'vitals' | 'meds' | 'labs' | 'orders' | 'hacmap' | 'io' | 'notes' | null;
}

export const PatientActionBar: React.FC<PatientActionBarProps> = ({
  onChartClick,
  onVitalsClick,
  onMedsClick,
  onLabsClick,
  onOrdersClick,
  onHacMapClick,
  onIOClick,
  onNotesClick,
  vitalsCount = 0,
  medsCount = 0,
  hasNewLabs = false,
  hasNewOrders = false,
  hasNewNotes = false,
  activeAction = null,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-6 py-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        {/* Chart Review */}
        {onChartClick && (
          <button 
            onClick={onChartClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeAction === null 
                ? 'bg-blue-50 dark:bg-blue-900/20' 
                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            <FileText className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600">Chart</span>
          </button>
        )}

        {/* Vitals */}
        {onVitalsClick && (
          <button 
            onClick={onVitalsClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              activeAction === 'vitals' 
                ? 'bg-purple-50 dark:bg-purple-900/20' 
                : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
            }`}
          >
            <Activity className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600">Vitals</span>
            {vitalsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {vitalsCount}
              </span>
            )}
          </button>
        )}

        {/* Medications */}
        {onMedsClick && (
          <button 
            onClick={onMedsClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              activeAction === 'meds' 
                ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}
          >
            <Pill className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-600">Meds</span>
            {medsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {medsCount}
              </span>
            )}
          </button>
        )}

        {/* Labs */}
        {onLabsClick && (
          <button 
            onClick={onLabsClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              activeAction === 'labs' 
                ? 'bg-cyan-50 dark:bg-cyan-900/20' 
                : 'hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
            }`}
          >
            <FlaskConical className="h-5 w-5 text-cyan-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-cyan-600">Labs</span>
            {hasNewLabs && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm animate-pulse">
                NEW
              </span>
            )}
          </button>
        )}

        {/* Orders */}
        {onOrdersClick && (
          <button 
            onClick={onOrdersClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              activeAction === 'orders' 
                ? 'bg-orange-50 dark:bg-orange-900/20' 
                : 'hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
          >
            <FileCheck className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-orange-600">Orders</span>
            {hasNewOrders && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm animate-pulse">
                NEW
              </span>
            )}
          </button>
        )}

        {/* HacMap */}
        {onHacMapClick && (
          <button 
            onClick={onHacMapClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeAction === 'hacmap' 
                ? 'bg-rose-50 dark:bg-rose-900/20' 
                : 'hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}
          >
            <MapPin className="h-5 w-5 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-rose-600">HacMap</span>
          </button>
        )}

        {/* I&O */}
        {onIOClick && (
          <button 
            onClick={onIOClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeAction === 'io' 
                ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
            }`}
          >
            <Droplets className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600">I&O</span>
          </button>
        )}

        {/* Notes/Handover */}
        {onNotesClick && (
          <button 
            onClick={onNotesClick}
            className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
              activeAction === 'notes' 
                ? 'bg-amber-50 dark:bg-amber-900/20' 
                : 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
          >
            <MessageSquare className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-amber-600">Notes</span>
            {hasNewNotes && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm animate-pulse">
                NEW
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
