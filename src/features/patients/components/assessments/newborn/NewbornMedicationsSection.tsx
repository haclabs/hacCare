import React from 'react';

interface NewbornMedicationsSectionProps {
  // Vitamin K
  vitaminKGiven: boolean;
  vitaminKDeclined: boolean;
  vitaminKDose: '0.5mg' | '1.0mg' | '';
  vitaminKSite: string;
  vitaminKDate: string;
  vitaminKTime: string;
  vitaminKSignature: string;
  // Erythromycin
  erythromycinGiven: boolean;
  erythromycinDate: string;
  erythromycinTime: string;
  erythromycinSignature: string;
  onChange: (field: string, value: string | boolean) => void;
}

export const NewbornMedicationsSection: React.FC<NewbornMedicationsSectionProps> = ({
  vitaminKGiven: _vitaminKGiven,
  vitaminKDeclined,
  vitaminKDose,
  vitaminKSite,
  vitaminKDate,
  vitaminKTime,
  vitaminKSignature,
  erythromycinGiven,
  erythromycinDate,
  erythromycinTime,
  erythromycinSignature,
  onChange,
}) => {
  const vkDisabled = vitaminKDeclined;

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-gray-600 pb-1 border-b border-gray-200">
        <div className="col-span-1">Medication</div>
        <div className="col-span-1">Dose</div>
        <div className="col-span-1">Site</div>
        <div className="col-span-1">Date</div>
        <div className="col-span-1">Time</div>
        <div className="col-span-1">Signature</div>
      </div>

      {/* Vitamin K row */}
      <div className="grid grid-cols-6 gap-2 items-start">
        <div className="col-span-1">
          <p className="text-sm font-medium text-gray-800">Vitamin K (IM)</p>
          <button
            type="button"
            onClick={() => {
              const next = !vitaminKDeclined;
              onChange('vitamin_k_declined', next);
              if (next) onChange('vitamin_k_given', false);
            }}
            className={`mt-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              vitaminKDeclined
                ? 'bg-red-100 border-red-500 text-red-800 font-semibold'
                : 'border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-600'
            }`}
          >
            Declined{vitaminKDeclined && ' ✓'}
          </button>
        </div>

        <div className="col-span-1 space-y-1.5">
          {(['0.5mg', '1.0mg'] as const).map(dose => (
            <div key={dose}>
              <button
                type="button"
                disabled={vkDisabled}
                onClick={() => {
                  onChange('vitamin_k_dose', vitaminKDose === dose ? '' : dose);
                  onChange('vitamin_k_given', vitaminKDose !== dose);
                }}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors disabled:opacity-40 ${
                  vitaminKDose === dose
                    ? 'bg-cyan-100 border-cyan-500 text-cyan-800 font-semibold'
                    : 'border-gray-300 text-gray-500 hover:border-cyan-400'
                }`}
              >
                {dose}{vitaminKDose === dose && ' ✓'}
              </button>
              <p className="text-xs text-gray-400 mt-0.5">{dose === '0.5mg' ? 'Wt ≤ 1500 gm' : 'Wt > 1500 gm'}</p>
            </div>
          ))}
        </div>

        <div className="col-span-1">
          <input
            type="text"
            value={vitaminKSite}
            disabled={vkDisabled}
            onChange={e => onChange('vitamin_k_site', e.target.value)}
            placeholder="e.g. Left thigh"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-40 disabled:bg-gray-50"
          />
        </div>
        <div className="col-span-1">
          <input
            type="date"
            value={vitaminKDate}
            disabled={vkDisabled}
            onChange={e => onChange('vitamin_k_date', e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-40 disabled:bg-gray-50"
          />
        </div>
        <div className="col-span-1">
          <input
            type="time"
            value={vitaminKTime}
            disabled={vkDisabled}
            onChange={e => onChange('vitamin_k_time', e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-40 disabled:bg-gray-50"
          />
        </div>
        <div className="col-span-1">
          <input
            type="text"
            value={vitaminKSignature}
            disabled={vkDisabled}
            onChange={e => onChange('vitamin_k_signature', e.target.value)}
            placeholder="Print name"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-40 disabled:bg-gray-50"
          />
        </div>
      </div>

      {/* Erythromycin row */}
      <div className="grid grid-cols-6 gap-2 items-start border-t border-gray-100 pt-3">
        <div className="col-span-1">
          <p className="text-sm font-medium text-gray-800">Erythromycin Eye Ointment</p>
          <button
            type="button"
            onClick={() => onChange('erythromycin_given', !erythromycinGiven)}
            className={`mt-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              erythromycinGiven
                ? 'bg-green-100 border-green-500 text-green-800 font-semibold'
                : 'border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-700'
            }`}
          >
            Each eye{erythromycinGiven && ' ✓'}
          </button>
        </div>
        <div className="col-span-1 text-xs text-gray-400 italic self-center">—</div>
        <div className="col-span-1 text-xs text-gray-400 italic self-center">—</div>
        <div className="col-span-1">
          <input
            type="date"
            value={erythromycinDate}
            onChange={e => onChange('erythromycin_date', e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <div className="col-span-1">
          <input
            type="time"
            value={erythromycinTime}
            onChange={e => onChange('erythromycin_time', e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <div className="col-span-1">
          <input
            type="text"
            value={erythromycinSignature}
            onChange={e => onChange('erythromycin_signature', e.target.value)}
            placeholder="Print name"
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
      </div>
    </div>
  );
};
