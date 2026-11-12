import React from 'react';
import { NavLink } from 'react-router-dom';
import { ECHO_TAB_ITEMS, echoPatientPath } from '../echoTabs';

/** App-style bottom navigation between a patient's bedside modules. Sits below the BCMA dialog (z-50). */
export const EchoTabBar: React.FC<{ patientId: string }> = ({ patientId }) => (
  <nav
    aria-label="Patient modules"
    className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur"
  >
    <ul className="mx-auto flex max-w-3xl">
      {ECHO_TAB_ITEMS.map(({ tab, label, Icon }) => (
        <li key={tab} className="flex-1">
          <NavLink
            to={echoPatientPath(patientId, tab)}
            end
            replace
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'text-haccare-teal'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`rounded-full px-4 py-1 ${isActive ? 'bg-haccare-teal/10' : ''}`}>
                  <Icon className="h-6 w-6" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
