/**
 * FlowsheetFormWrapper
 *
 * Consistent visual container for all native flowsheet forms rendered inline
 * within the FlowsheetsHub. Provides breadcrumb navigation, patient context
 * header, and a stable layout shell. Form components render as children and
 * are responsible for their own data logic and save/cancel callbacks.
 */

import React, { Suspense } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { CATEGORY_META } from '../registry';
import type { NativeFlowsheetDefinition } from '../types';
import type { Patient } from '../../../types';

interface FlowsheetFormWrapperProps {
  sheet: NativeFlowsheetDefinition;
  patient: Patient;
  /** Called when the user clicks "Back to Flowsheets" — hub resets to grid view. */
  onBack: () => void;
  children: React.ReactNode;
}

export const FlowsheetFormWrapper: React.FC<FlowsheetFormWrapperProps> = ({
  sheet,
  patient,
  onBack,
  children,
}) => {
  const meta = CATEGORY_META[sheet.category];
  const FormIcon = sheet.icon;
  const CategoryIcon = meta.icon;

  return (
    <>
      {/* Breadcrumb + form header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        {/* Breadcrumb row */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-5 group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Flowsheets</span>
          <span className="text-gray-300 mx-1.5">›</span>
          <span className={`flex items-center gap-1 ${meta.textColor}`}>
            <CategoryIcon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        </button>

        {/* Form title row */}
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 p-3 rounded-xl ${meta.iconBg}`}>
            <FormIcon className={`h-6 w-6 ${meta.iconColor}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{sheet.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {patient.first_name} {patient.last_name}
              <span className="mx-2 text-gray-300">·</span>
              <span className="text-gray-500">{patient.patient_id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Form content — Suspense boundary here keeps the header visible during lazy load */}
      <div className="px-8 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm">Loading form…</span>
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </>
  );
};
