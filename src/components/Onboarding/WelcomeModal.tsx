import React, { useEffect, useState } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  LayoutDashboard,
  PlayCircle,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { HacCareLogo } from '../Layout/HacCareLogo';

interface Slide {
  icon: LucideIcon;
  gradient: string;
  title: string;
  intro: string;
  points: string[];
}

const SLIDES: Slide[] = [
  {
    icon: Stethoscope,
    gradient: 'from-blue-500 to-cyan-500',
    title: 'Welcome to hacCare',
    intro:
      'Students use hacCare the way nurses use a real electronic health record — opening charts, scanning wristbands, giving medications, and documenting care.',
    points: [
      'Everything happens inside a sealed practice environment you build and control',
      'No real patient data is ever involved — every chart is one an instructor created',
      'What you can see depends on your role and the programs you are assigned to',
    ],
  },
  {
    icon: LayoutDashboard,
    gradient: 'from-violet-500 to-purple-600',
    title: 'This Is Your Workspace',
    intro:
      'You will land here every time you sign in. The coloured bar at the top always tells you which program you are working in.',
    points: [
      'Three counters: templates ready to launch, students on your roster, sessions completed',
      'Six quick links covering everything you will use day to day',
      'No patients here, and that is correct — patients live inside templates and simulations',
    ],
  },
  {
    icon: PlayCircle,
    gradient: 'from-emerald-500 to-teal-600',
    title: 'How a Simulation Flows',
    intro: 'Four stages, start to finish. You will get plenty of practice with each one.',
    points: [
      'Build a template — a practice hospital with your patient chart in it',
      'Launch it — creates a private copy for one class, leaving your template untouched',
      'Students work — they chart and administer inside their own copy',
      'Reset for the next group, or complete to generate the debrief report',
    ],
  },
  {
    icon: LifeBuoy,
    gradient: 'from-amber-500 to-orange-600',
    title: 'Help Is Always Nearby',
    intro:
      'Help & Docs in the sidebar has searchable articles and recorded click-by-click walkthroughs.',
    points: [
      'Start with the Getting Started category — it covers everything in this tour in more detail',
      'The Instructor Guide under Sim Templates walks through the full simulation workflow',
      'Replay this tour any time from the button at the top of Help & Docs',
    ],
  },
];

interface WelcomeModalProps {
  onSkip: () => void;
  onFinish: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onSkip, onFinish }) => {
  const { profile } = useAuth();
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSkip]);

  const greeting = profile?.first_name ? `Welcome, ${profile.first_name}` : 'Welcome';

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onSkip}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to hacCare"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand bar - matches the app header's dark theme */}
        <div className="flex items-center justify-between px-6 py-3.5" style={{ backgroundColor: '#2a2a28' }}>
          <HacCareLogo variant="dark" size="22px" withBar />
          <button
            onClick={onSkip}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Skip for now"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={`bg-gradient-to-r ${slide.gradient} px-8 py-8 text-white relative`}>
          <div className="p-3 bg-white/20 rounded-xl w-fit mb-4">
            <Icon className="h-7 w-7" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">
            {index === 0 ? greeting : `Step ${index + 1} of ${SLIDES.length}`}
          </p>
          <h2 className="text-2xl font-bold mt-1">{slide.title}</h2>
        </div>

        <div className="px-8 py-6">
          <p className="text-sm text-gray-600 leading-relaxed">{slide.intro}</p>
          <ul className="mt-4 space-y-2.5">
            {slide.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                style={i === index ? { backgroundColor: '#19ADF2' } : undefined}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex(index - 1)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={onFinish}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#19ADF2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1598D6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#19ADF2')}
              >
                Got it, don't show again
              </button>
            ) : (
              <button
                onClick={() => setIndex(index + 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#19ADF2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1598D6')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#19ADF2')}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
