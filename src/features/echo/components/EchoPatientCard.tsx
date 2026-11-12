import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BedDouble, ChevronRight } from 'lucide-react';
import type { Patient } from '../../../types';
import { ECHO_TAB_ITEMS, echoPatientPath } from '../echoTabs';

/** A patient tile on the Echo home screen: tap to open the MAR, or jump straight to a module. */
export const EchoPatientCard: React.FC<{ patient: Patient }> = ({ patient }) => {
  const hasAllergies = (patient.allergies ?? []).some(Boolean);

  return (
    <li className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md transition-shadow hover:shadow-lg">
      <Link
        to={echoPatientPath(patient.id)}
        className="flex items-center gap-4 px-4 pt-4 pb-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          <BedDouble className="h-4 w-4" />
          <span className="text-sm font-bold">
            {patient.room_number}
            {patient.bed_number}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold text-gray-900 dark:text-white">
            {patient.last_name}, {patient.first_name}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500 dark:text-gray-400">
            {patient.patient_id}
            {patient.date_of_birth && <span>· DOB {patient.date_of_birth}</span>}
            {hasAllergies && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" />
                Allergies
              </span>
            )}
          </span>
        </span>
        <ChevronRight className="h-6 w-6 shrink-0 text-gray-400" />
      </Link>
      <div className="grid grid-cols-4 border-t border-gray-100 dark:border-gray-700">
        {ECHO_TAB_ITEMS.map(({ tab, label, Icon }) => (
          <Link
            key={tab}
            to={echoPatientPath(patient.id, tab)}
            aria-label={`${label} for ${patient.first_name} ${patient.last_name}`}
            className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-haccare-teal/10 hover:text-haccare-teal"
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </li>
  );
};
