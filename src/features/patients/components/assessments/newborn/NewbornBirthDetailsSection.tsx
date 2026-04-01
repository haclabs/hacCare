import React from 'react';

interface NewbornBirthDetailsSectionProps {
  dateOfBirth?: string;
  timeOfBirth: string;
  weightGrams: string;
  lengthCm: string;
  headCircumferenceCm: string;
  headCircumference1hrCm: string;
  headCircumference2hrCm: string;
  apgar1min: string;
  apgar5min: string;
  apgar10min: string;
  onChange: (field: string, value: string) => void;
}

export const NewbornBirthDetailsSection: React.FC<NewbornBirthDetailsSectionProps> = ({
  dateOfBirth,
  timeOfBirth,
  weightGrams,
  lengthCm,
  headCircumferenceCm,
  headCircumference1hrCm,
  headCircumference2hrCm,
  apgar1min,
  apgar5min,
  apgar10min,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Birth measurements row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Date of Birth
          </label>
          {dateOfBirth ? (
            <p className="text-sm text-gray-800">{new Date(dateOfBirth + 'T00:00:00').toLocaleDateString()}</p>
          ) : (
            <p className="text-xs text-gray-400 italic">From patient record</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Time of Birth
          </label>
          <input
            type="time"
            value={timeOfBirth}
            onChange={e => onChange('time_of_birth', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Weight (grams)
          </label>
          <input
            type="number"
            value={weightGrams}
            onChange={e => onChange('weight_grams', e.target.value)}
            min={0}
            max={7000}
            step={1}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="e.g. 3400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Length (cm)
          </label>
          <input
            type="number"
            value={lengthCm}
            onChange={e => onChange('length_cm', e.target.value)}
            min={20}
            max={65}
            step={0.1}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="e.g. 50.5"
          />
        </div>
      </div>

      {/* Head circumference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Head Circumference (cm)
          </label>
          <input
            type="number"
            value={headCircumferenceCm}
            onChange={e => onChange('head_circumference_cm', e.target.value)}
            min={20}
            max={45}
            step={0.1}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="cm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Head Circumference — AVB 1 hour (cm)
          </label>
          <input
            type="number"
            value={headCircumference1hrCm}
            onChange={e => onChange('head_circumference_1hr_cm', e.target.value)}
            min={20}
            max={45}
            step={0.1}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="cm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Head Circumference — AVB 2 hours (cm)
          </label>
          <input
            type="number"
            value={headCircumference2hrCm}
            onChange={e => onChange('head_circumference_2hr_cm', e.target.value)}
            min={20}
            max={45}
            step={0.1}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="cm"
          />
        </div>
      </div>

      {/* APGAR scores */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          APGAR Score
        </h4>
        <div className="space-y-3">
          {([
            { label: '1 Minute', field: 'apgar_1min' as const, value: apgar1min, note: undefined as string | undefined },
            { label: '5 Minutes', field: 'apgar_5min' as const, value: apgar5min, note: undefined as string | undefined },
            { label: '10 Minutes', field: 'apgar_10min' as const, value: apgar10min, note: '(if needed)' as string | undefined },
          ]).map(({ label, field, value, note }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {label}{note && <span className="text-gray-400 font-normal ml-1">{note}</span>}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 11 }, (_, i) => String(i)).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(field, value === n ? '' : n)}
                    className={`w-9 py-1.5 rounded-lg text-sm border transition-colors font-medium ${
                      value === n
                        ? Number(n) >= 7
                          ? 'bg-green-100 border-green-500 text-green-800'
                          : Number(n) >= 4
                          ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                          : 'bg-red-100 border-red-500 text-red-800'
                        : 'border-gray-300 text-gray-600 hover:border-cyan-400 hover:text-cyan-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vitals notice */}
      <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
        Timed vital signs (Temperature, Heart Rate, Respirations, SpO₂) are recorded in the{' '}
        <strong>Vitals tab</strong>. The form suggests recording within 15 minutes of birth, then at 1 and 2 hours.
      </div>
    </div>
  );
};
