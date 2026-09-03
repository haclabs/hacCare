/**
 * ===========================================================================
 * STUDENT QUICK INTRO GUIDE
 * ===========================================================================
 * Displays a concise reference for the patient chart's top action bar and
 * the Clinical Flowsheets hub.
 * ===========================================================================
 */

import React from 'react';
import {
  BookOpen,
  X,
  FileText,
  LayoutGrid,
  Activity,
  Pill,
  FlaskConical,
  FileCheck,
  MapPin,
  Droplets,
  MessageSquare,
  Badge,
  Info,
} from 'lucide-react';

interface StudentQuickIntroProps {
  onClose: () => void;
}

interface ActionBarItem {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  description: string;
}

const ACTION_BAR_ITEMS: ActionBarItem[] = [
  {
    icon: FileText,
    color: 'text-blue-600 bg-blue-50',
    label: 'Chart',
    description: 'Opens the full printable patient record with history, assessments, and documentation.',
  },
  {
    icon: LayoutGrid,
    color: 'text-violet-600 bg-violet-50',
    label: 'Flowsheets',
    description: 'Opens the Clinical Flowsheets hub — the central library of assessment and documentation forms (see below).',
  },
  {
    icon: Activity,
    color: 'text-purple-600 bg-purple-50',
    label: 'Vitals & Assess.',
    description: 'Record and review vital signs plus head-to-toe and focused assessments. The badge shows the number of recorded vitals.',
  },
  {
    icon: Pill,
    color: 'text-emerald-600 bg-emerald-50',
    label: 'Meds',
    description: 'The Medication Administration Record (MAR) — review orders and document administration. The badge shows active medications.',
  },
  {
    icon: FlaskConical,
    color: 'text-cyan-600 bg-cyan-50',
    label: 'Labs',
    description: 'Laboratory results — blood work, chemistry panels, and cultures. A "NEW" badge flags unacknowledged results.',
  },
  {
    icon: FileCheck,
    color: 'text-orange-600 bg-orange-50',
    label: 'Orders',
    description: "Physician's orders for medications, treatments, and diagnostic tests. A \"NEW\" badge flags unacknowledged orders.",
  },
  {
    icon: MapPin,
    color: 'text-rose-600 bg-rose-50',
    label: 'HacMap',
    description: 'Interactive body diagram for documenting devices (IVs, catheters, tubes) and wound assessments by location.',
  },
  {
    icon: Droplets,
    color: 'text-indigo-600 bg-indigo-50',
    label: 'I&O',
    description: 'Intake & output tracking — fluids in (oral, IV) and out (urine, drains) to monitor fluid balance.',
  },
  {
    icon: MessageSquare,
    color: 'text-amber-600 bg-amber-50',
    label: 'Notes',
    description: 'Handover (SBAR) notes for shift-to-shift communication. A "NEW" badge flags unread notes.',
  },
];

const FLOWSHEET_CATEGORIES: { label: string; description: string }[] = [
  { label: 'Monitoring & Vitals', description: 'Vital signs, neurological, newborn, and pain assessments.' },
  { label: 'Systems Assessment', description: 'Respiratory, cardiovascular, GI, GU, musculoskeletal, and integumentary.' },
  { label: 'Risk & Safety', description: 'Fall risk (Morse), pressure injury risk (Braden), and restraint documentation.' },
  { label: 'Wound & Device Care', description: 'Device placement and wound assessment, both plotted on HacMap.' },
  { label: 'Fluid & Metabolic', description: 'Intake & output, bedside blood glucose (BBIT), and bowel assessment.' },
  { label: 'Mental Health & Cognition', description: 'Biopsychosocial, cognitive screening, and mood/affect assessments.' },
  { label: 'Clinical Documentation', description: 'Handover notes, advanced directives, nursing/admission assessments, consents, and BPMH.' },
];

// Shared with SimulationPortal.tsx so the portal landing page can preview these steps without duplicating the copy.
export const RECOMMENDED_SHIFT_WORKFLOW_STEPS = [
  'Verify patient identity with the ID Bracelet button.',
  'Review patient\'s chart overview.',
  'Review Notes (handover) from the previous shift.',
  'Check Vitals & Assess. and record current measurements.',
  'Review Orders for anything new to implement.',
  'Administer and document scheduled Meds.',
  'Check Labs for results requiring follow-up.',
  'Use Flowsheets for any additional assessments or documentation.',
  'Write a handover Note before ending your shift.',
];

const StudentQuickIntro: React.FC<StudentQuickIntroProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Intro</h2>
              <p className="text-slate-300 text-xs">Patient chart reference guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Intro */}
          <div className="flex items-start gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <Info className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700">
              Every patient chart opens on the <strong>Overview</strong> screen. The action bar below the patient's
              name gives you one-click access to every module. Use the <strong>ID Bracelet</strong> button to verify
              patient identity, and this <strong>Quick Intro</strong> to revisit this guide any time.
            </p>
          </div>

          {/* Action bar reference */}
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Overview Action Bar
            </h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
              {ACTION_BAR_ITEMS.map(({ icon: Icon, color, label, description }) => (
                <div key={label} className="flex items-start gap-3 p-3.5 bg-white">
                  <div className={`flex-shrink-0 p-2 rounded-md ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Flowsheets explanation */}
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              Clinical Flowsheets
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              The Flowsheets hub is a single library for all documentation forms, grouped into categories. Some cards
              open a native form directly; others shortcut to an existing module (e.g. Vitals, HacMap, I&amp;O).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FLOWSHEET_CATEGORIES.map(({ label, description }) => (
                <div key={label} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recommended workflow */}
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Recommended Shift Workflow
            </h3>
            <ol className="space-y-2">
              {RECOMMENDED_SHIFT_WORKFLOW_STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Need help */}
          <section className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
            <Badge className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700">
              Questions? Ask your instructor, or reopen this guide anytime from the <strong>Quick Intro</strong>{' '}
              button next to ID Bracelet on the Overview screen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default StudentQuickIntro;
