import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, QrCode, ScanLine, ShieldCheck, PartyPopper, type LucideIcon } from 'lucide-react';

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: QrCode,
    title: 'Pick a medication to give',
    body: 'Click "Administer" (or "Give PRN") next to any medication on the practice patient. There is one of each medication type — PRN, Scheduled, Diabetic, IV/Continuous, and STAT.',
  },
  {
    icon: ScanLine,
    title: 'Scan the barcodes',
    body: 'Use a real scanner on the printed labels, or click the QR icon in the top-right of the window to reveal reference barcodes with "Test Patient Scan" / "Test Medication Scan" buttons. You can also type a code in manually.',
  },
  {
    icon: ShieldCheck,
    title: 'Complete the Five Rights checklist',
    body: 'Confirm the checklist on the left, enter the drawn-up dose or glucose reading if asked, sign your name, and click "Administer Medication".',
  },
  {
    icon: PartyPopper,
    title: 'Practice as much as you like',
    body: 'This is a sandbox — nothing here is ever saved or graded, so feel free to repeat any medication as many times as you want.',
  },
];

interface TrainingWalkthroughModalProps {
  onClose: () => void;
}

export const TrainingWalkthroughModal: React.FC<TrainingWalkthroughModalProps> = ({ onClose }) => {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const Icon = step.icon;
  const isLast = index === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            How to use BCMA Med Training
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Icon className="h-7 w-7 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-emerald-600' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 rounded-lg hover:bg-gray-50 disabled:opacity-0 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={() => (isLast ? onClose() : setIndex(i => i + 1))}
            className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {isLast ? "Got it, let's practice!" : 'Next'}
            {!isLast && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingWalkthroughModal;
