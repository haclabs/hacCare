import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  FileText,
  KeyRound,
  Package,
  Play,
  Printer,
  RotateCcw,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

interface GuideStep {
  num: number;
  icon: LucideIcon;
  badge: string;
  box: string;
  title: string;
  items: React.ReactNode[];
  warning?: React.ReactNode;
}

const BEFORE_CLASS: GuideStep[] = [
  {
    num: 1,
    icon: Printer,
    badge: 'bg-indigo-600',
    box: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-700',
    title: 'Print Labels',
    items: [
      'Patient bracelets and medication labels (Avery 5160, high-quality print)',
      'Print once: labels keep working after every Reset',
    ],
  },
  {
    num: 2,
    icon: ClipboardList,
    badge: 'bg-teal-700',
    box: 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-700',
    title: 'Print Med List & Check Stock',
    items: [
      'Lists each patient’s meds: name, dose, route, frequency',
      'Use the list to check you have stock of every practice medication the simulation needs',
    ],
  },
  {
    num: 3,
    icon: KeyRound,
    badge: 'bg-teal-600',
    box: 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-700',
    title: 'Give Out Student Logins',
    items: [
      'Open the key icon on the card and hand each workstation its login',
      'Students only see the simulation after you press Play',
      <>Tell students to enter <strong>their own name</strong> on every form. Unnamed work is left out of the debrief</>,
    ],
  },
];

const EACH_GROUP: GuideStep[] = [
  {
    num: 4,
    icon: Play,
    badge: 'bg-green-600',
    box: 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700',
    title: 'Press Play to Start',
    items: [
      <>Card shows <strong>Ready to Start</strong> after Launch and after every Reset</>,
      'Starts the timer and timed orders/meds, and opens it to students',
    ],
  },
  {
    num: 5,
    icon: CheckCircle,
    badge: 'bg-emerald-600',
    box: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700',
    title: 'Complete',
    items: [
      'Select your name; name any unnamed work if asked',
      <>Saves the debrief to <strong>Debrief Reports</strong>; card shows <strong>Needs Reset</strong></>,
      <><strong>Time expired</strong> doesn&apos;t end the session. You still need to Complete</>,
    ],
  },
  {
    num: 6,
    icon: RotateCcw,
    badge: 'bg-blue-600',
    box: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
    title: 'Reset for Next Group',
    items: [
      'Clears student work and restores the starting charts',
      'Keeps bracelets, medication labels and student logins',
      'Restock used meds from the med list, then go back to step 4',
    ],
    warning: <><strong>Complete first.</strong> Reset permanently deletes work that wasn&apos;t completed.</>,
  },
];

const StepCard: React.FC<{ step: GuideStep }> = ({ step }) => {
  const Icon = step.icon;
  return (
    <div className={`border-2 rounded-lg p-3 ${step.box}`}>
      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-2">
        <span className={`w-5 h-5 rounded-full ${step.badge} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
          {step.num}
        </span>
        <Icon className="h-4 w-4" />
        {step.title}
      </h4>
      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
        {step.items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
      {step.warning && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-800 dark:text-red-200 flex gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{step.warning}</span>
        </div>
      )}
    </div>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{children}</p>
);

export const SimulationInstructorGuide: React.FC = () => {
  return (
    <div className="lg:col-span-1">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-800 p-5 sticky top-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-emerald-900 dark:text-emerald-100">Instructor Quick Guide</h3>
        </div>

        <div className="space-y-3 text-sm">
          <SectionLabel>Before the first group</SectionLabel>
          {BEFORE_CLASS.map((step) => <StepCard key={step.num} step={step} />)}

          <SectionLabel>Every group</SectionLabel>
          {EACH_GROUP.map((step) => <StepCard key={step.num} step={step} />)}

          <SectionLabel>Good to know</SectionLabel>
          <div className="border-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-1">
              <Package className="h-3.5 w-3.5" /> Template Updated banner
            </p>
            Click <strong>View Changes &amp; Sync</strong>. If patients were added or removed, delete and relaunch instead.
          </div>
          <div className="border-2 border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-1.5 mb-1">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </p>
            Complete first. Deleting also removes the student logins, and relaunching gives every patient a{' '}
            <strong>new bracelet barcode</strong>, so you&apos;ll need to reprint bracelets and hand out new logins.
          </div>
        </div>
      </div>
    </div>
  );
};
