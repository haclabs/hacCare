import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Plus, Scale } from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { queryKeys } from '../../../lib/api/queryClient';
import { getCategoryDisplayName, getIntakeOutputEvents } from '../../../services/clinical/intakeOutputService';
import { AddIntakeOutputModal } from '../../patients/components/intake-output';

const WINDOWS = [8, 12, 24] as const;

const Stat: React.FC<{ label: string; value: string; Icon: typeof Scale; tone: string }> = ({ label, value, Icon, tone }) => (
  <div className={`rounded-2xl p-3 ${tone}`}>
    <Icon className="h-5 w-5" />
    <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
  </div>
);

/** Phone layout for intake & output: shift totals, then a timeline of entries. */
export const EchoIntakeOutputTab: React.FC<{ patientId: string; patientName: string }> = ({ patientId, patientName }) => {
  const { currentTenant } = useTenant();
  const [hoursBack, setHoursBack] = useState<number>(8);
  const [adding, setAdding] = useState(false);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.patientIntakeOutput(patientId, hoursBack),
    queryFn: () => getIntakeOutputEvents(patientId, { hoursBack, tenantId: currentTenant!.id }),
    enabled: !!currentTenant,
  });

  const total = (dir: string) => events.filter((e) => e.direction === dir).reduce((sum, e) => sum + Number(e.amount_ml), 0);
  const intake = total('intake');
  const output = total('output');
  const net = intake - output;

  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex rounded-xl bg-gray-200 dark:bg-gray-700 p-1" role="group" aria-label="Time window">
        {WINDOWS.map((h) => (
          <button
            key={h}
            onClick={() => setHoursBack(h)}
            aria-pressed={hoursBack === h}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              hoursBack === h ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {h} h
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Intake" value={`${intake}`} Icon={ArrowDownToLine} tone="bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200" />
        <Stat label="Output" value={`${output}`} Icon={ArrowUpFromLine} tone="bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200" />
        <Stat
          label="Net mL"
          value={`${net > 0 ? '+' : ''}${net}`}
          Icon={Scale}
          tone={net < -500 ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'}
        />
      </div>

      <button
        onClick={() => setAdding(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-haccare-teal py-4 text-lg font-semibold text-white shadow-md hover:bg-haccare-teal-dark"
      >
        <Plus className="h-6 w-6" />
        Add intake or output
      </button>

      <section className="mt-4 overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md">
        <h2 className="bg-gray-100 dark:bg-gray-700 px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">
          Last {hoursBack} hours
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-haccare-teal" /></div>
        ) : events.length === 0 ? (
          <p className="p-6 text-center text-gray-500 dark:text-gray-400">No entries in this window.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {events.map((e) => {
              const isIn = e.direction === 'intake';
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      isIn ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {isIn ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-900 dark:text-white">{getCategoryDisplayName(e.category)}</span>
                    <span className="block truncate text-sm text-gray-500 dark:text-gray-400">
                      {new Date(e.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {e.description ? ` · ${e.description}` : ''}
                      {e.student_name ? ` · ${e.student_name}` : ''}
                    </span>
                  </span>
                  <span className={`text-lg font-bold tabular-nums ${isIn ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                    {isIn ? '+' : '−'}
                    {Number(e.amount_ml)} mL
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {adding && (
        <AddIntakeOutputModal
          patientId={patientId}
          patientName={patientName}
          onClose={() => setAdding(false)}
          onSuccess={() => {
            setAdding(false);
            refetch();
          }}
        />
      )}
    </div>
  );
};
