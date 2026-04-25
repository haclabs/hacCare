import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Scan,
  Activity,
  FileText,
  PlayCircle,
  BarChart2,
  ChevronRight,
  Mail,
  MapPin,
  CheckCircle2,
  Lock,
  Database,
  ClipboardList,
  Stethoscope,
  Menu,
  X,
  ArrowRight,
  Server,
  Code2,
  Globe,
  Zap,
  GraduationCap,
  TestTube2,
  Droplets,
  Map,
  ClipboardCheck,
  Cpu,
} from 'lucide-react';
import logo from './logo.webp';

// ─── Reusable sub-components ──────────────────────────────────────────────────

function FeatureTag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
      <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
      {text}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    message: '',
  });
  const [formStatus, setFormStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);

  useEffect(() => {
    document.title = 'hacCare — Simulated EMR & Training Platform for Healthcare Education';
    
    // Software Application Schema
    return () => {};
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus({ type: 'loading' });
    const { submitContactForm } = await import('../../services/contact/contactService');
    const result = await submitContactForm(formData);
    if (result.success) {
      setFormStatus({ type: 'success', message: result.message || "Thank you — we'll be in touch soon." });
      setFormData({ name: '', email: '', institution: '', message: '' });
      setTimeout(() => setFormStatus({ type: 'idle' }), 6000);
    } else {
      setFormStatus({ type: 'error', message: result.error || 'Failed to send. Please try again.' });
    }
  };

  // ─── Shared style helpers ─────────────────────────────────────────────────
  const primaryBtn = 'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 text-sm';
  const outlineBtn = 'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-sm border border-slate-600 text-slate-300 hover:border-cyan-400 hover:text-cyan-400';
  const inputCls = 'w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors disabled:opacity-50';
  const labelCls = 'block text-sm font-medium text-slate-400 mb-2';

  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <img src={logo} alt="hacCare" className="h-10 w-auto brightness-0 invert" />
            <div className="hidden md:flex items-center gap-8">
              {(['features', 'simulation', 'security', 'contact'] as const).map(s => (
                <button key={s} onClick={() => scrollToSection(s)}
                  className="text-slate-400 hover:text-white capitalize text-sm font-medium transition-colors">
                  {s}
                </button>
              ))}
              <button onClick={() => navigate('/login')}
                className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
                Login
              </button>
              <button onClick={() => scrollToSection('contact')}
                className={`${primaryBtn} bg-cyan-500 hover:bg-cyan-400`}
                style={{ backgroundColor: '#19ADF2' }}>
                Request Access <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(o => !o)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-4 space-y-3">
            {['features', 'simulation', 'security', 'contact'].map(s => (
              <button key={s} onClick={() => scrollToSection(s)}
                className="block w-full text-left text-slate-300 hover:text-white py-2 capitalize text-sm">
                {s}
              </button>
            ))}
            <button onClick={() => navigate('/login')}
              className="block w-full text-left text-slate-300 hover:text-white py-2 text-sm">
              Login
            </button>
            <button onClick={() => scrollToSection('contact')}
              className={`${primaryBtn} w-full justify-center`} style={{ backgroundColor: '#19ADF2' }}>
              Request Access
            </button>
          </div>
        )}
      </header>

      <main>

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-24 pb-20 px-4">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10"
              style={{ background: 'radial-gradient(ellipse, #19ADF2 0%, transparent 70%)' }} />
          </div>
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-semibold tracking-wide uppercase mb-6">
                <Zap className="w-3 h-3" /> Built for Canadian Healthcare Education
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 text-white">
                Where Future Nurses<br />
                <span style={{ color: '#19ADF2' }}>Learn to Care</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                hacCare is a high-fidelity simulated EMR platform built for healthcare education. Students practice real clinical workflows — BCMA scanning, charting, alerts — in a safe, instructor-controlled environment.
              </p>
              <div className="flex flex-wrap gap-4 justify-center mt-10">
                <button onClick={() => scrollToSection('contact')}
                  className={`${primaryBtn} text-base px-8 py-4`} style={{ backgroundColor: '#19ADF2' }}>
                  Request a Demo <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => scrollToSection('features')} className={`${outlineBtn} text-base px-8 py-4`}>
                  Explore Features
                </button>
              </div>
            </div>
            {/* Hero screenshot */}
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute -inset-1 rounded-2xl opacity-30 blur-xl"
                style={{ background: 'linear-gradient(135deg, #19ADF2, #0ea5e9)' }} />
              <div className="relative rounded-2xl border border-slate-700 overflow-hidden shadow-2xl bg-slate-900">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-slate-500 text-xs font-mono">haccare.app — demo</span>
                </div>
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  {heroVideoPlaying ? (
                    <iframe
                      src="https://player.vimeo.com/video/1162063037?badge=0&autopause=0&autoplay=1&title=0&byline=0&portrait=0&color=19ADF2"
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      allowFullScreen
                      title="hacCare Platform Demo"
                    />
                  ) : (
                    <button
                      onClick={() => setHeroVideoPlaying(true)}
                      className="absolute inset-0 w-full h-full cursor-pointer overflow-hidden"
                      aria-label="Play hacCare platform demo video"
                    >
                      <img
                        src="/images/hacCare_intro.webp"
                        alt="hacCare platform demo thumbnail"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ──────────────────────────────────────────────────────── */}
        <section className="border-y border-slate-800 bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '5', label: 'Active Programs' },
                { value: '100+', label: 'Simulations Run' },
                { value: '5 Rights', label: 'BCMA Verification' },
                { value: 'Canadian', label: 'Clinical Standards' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-white mb-1" style={{ color: '#19ADF2' }}>{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CORE VALUE PROPS ───────────────────────────────────────────────── */}
        <section className="py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">The EMR Students Actually Learn From</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                Not a demo. Not a sandbox. A full clinical environment that mirrors what students will use on their first real shift.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Stethoscope, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20',
                  title: 'Real Clinical Workflows',
                  body: 'Students work inside a fully functional EMR — real charting, real medication records, real alerts. Nothing is simplified or abstracted away.',
                },
                {
                  icon: PlayCircle, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',
                  title: 'Instructor-Controlled Simulations',
                  body: 'Build patient scenarios, launch simulations, assign students, and review every documented action — all from a clean management dashboard.',
                },
                {
                  icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20',
                  title: 'Fully Isolated Environments',
                  body: 'Every simulation runs in its own tenant. Students can make mistakes, instructors can reset, and real patient data is never at risk.',
                },
              ].map(card => (
                <div key={card.title} className={`rounded-xl border p-8 ${card.bg} hover:border-opacity-60 transition-all`}>
                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-5">
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{card.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REAL-WORLD PHOTO SECTION ────────────────────────────────────────── */}
        <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #07101e 100%)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">In the wild</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Running in Real Simulation Labs</h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                hacCare isn&rsquo;t theoretical. Students at Lethbridge Polytechnic use it bedside — scanning real barcodes, on real equipment, with real instructors watching.
              </p>
            </div>
            <div className="grid lg:grid-cols-12 gap-4 items-stretch">
              {/* Large photo */}
              <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative group">
                <img
                  src="/images/nurse-scanning.webp"
                  alt="Student nurse scanning medication barcode at simulated patient bedside in a healthcare simulation lab"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  width={600}
                  height={450}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-slate-200 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                    BCMA dual-scan workflow — Lethbridge Polytechnic Simulation Lab
                  </span>
                </div>
              </div>
              {/* Right column: small photo + pull-quote */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative group" style={{ height: '240px' }}>
                  <img
                    src="/images/barcode-scanning.webp"
                    alt="Close-up of student nurse scanning medication barcode label with patient wristband visible"
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    width={600}
                    height={450}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                </div>
                {/* Pull-quote — flex-1 fills remaining height to match left photo */}
                <div className="flex-1 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-5xl text-cyan-400/30 font-serif leading-none mb-4">&ldquo;</div>
                    <p className="text-slate-200 text-lg leading-relaxed italic mb-6">
                      Students can make every mistake safely — wrong patient, wrong dose, wrong time. The system catches it, they learn it, and no one gets hurt.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">Nursing Instructor</div>
                      <div className="text-slate-500 text-sm">Lethbridge Polytechnic</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BCMA FEATURE ──────────────────────────────────────────────────── */}
        <section id="features" className="py-24 px-4 bg-slate-900/40">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wide mb-5">
                  <Scan className="w-3 h-3" /> BCMA
                </div>
                <h2 className="text-4xl font-bold text-white mb-5">Five Rights. Every Time.</h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  Students practice the exact barcode-driven medication workflow used in hospitals. Dual-scan verification — patient wristband then medication label — forces the Five Rights check before every administration is recorded.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    'Dual-scan: patient wristband + medication barcode',
                    'Five Rights real-time pass/fail feedback',
                    'Printable Avery 5160-compatible barcode labels',
                    '24-hour Medication Administration Record (MAR) view',
                    'PRN medication support with reason documentation',
                    'Complete administration audit trail',
                  ].map(f => <FeatureTag key={f} text={f} />)}
                </div>
                <button onClick={() => scrollToSection('contact')}
                  className={`${primaryBtn}`} style={{ backgroundColor: '#19ADF2' }}>
                  See It In Action <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                <img
                  src="/images/bcma.webp"
                  alt="BCMA medication administration interface with Five Rights verification"
                  className="w-full object-cover"
                  width={1009}
                  height={639}
                  fetchPriority="high"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── PATIENT CARE FEATURE ───────────────────────────────────────────── */}
        <section className="py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wide mb-5">
              <ClipboardList className="w-3 h-3" /> Patient Care
            </div>
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-4xl font-bold text-white mb-5">Complete Patient Care, Admission to Discharge</h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Every clinical workflow students will encounter in practice — in one place. From initial assessment through discharge documentation.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  'Full patient profiles & medical history',
                  'Real-time vital signs monitoring',
                  'Wound assessment with body mapping',
                  'Diabetic care & glucose tracking',
                  'Lab orders & specimen tracking',
                  'Advanced directives management',
                  'Admission & discharge processing',
                  'Patient notes with priority tags',
                ].map(f => <FeatureTag key={f} text={f} />)}
              </div>
            </div>
          </div>
        </section>

        {/* ── CLINICAL MODULES ───────────────────────────────────────────────── */}
        <section className="py-24 px-4" style={{ background: 'linear-gradient(180deg, #07101e 0%, #0f172a 100%)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wide mb-5">
                <Cpu className="w-3 h-3" /> Full Clinical Toolkit
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Every Module. Every Shift.</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                hacCare is a complete clinical environment — not a single feature. Built to mirror every workflow students encounter on a real nursing unit.
              </p>
            </div>

            {/* Top row — Vitals + Labs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
              <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 group hover:border-rose-500/40 hover:bg-rose-500/[0.03] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
                  <Activity className="w-6 h-6 text-rose-400" />
                </div>
                <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">Vital Signs</div>
                <h3 className="text-2xl font-bold text-white mb-3">Real-Time Monitoring</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">BP, HR, temperature, SpO₂, and respiratory rate with age-based clinical ranges, optional fields for partial assessments, and trend visualization over time. Supports neonatal through adult patients.</p>
                <div className="flex flex-wrap gap-2">
                  {['Blood Pressure', 'Heart Rate', 'Temperature', 'SpO₂', 'Resp. Rate', 'Trend Charts'].map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">{t}</span>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 group hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                  <TestTube2 className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Laboratory</div>
                <h3 className="text-2xl font-bold text-white mb-3">Orders, Specimens & Results</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">Order lab panels and individual tests, track specimen collection, and receive results with normal/abnormal flagging. Instructors release results; students action them — exactly as on a real unit.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'CBC, BMP & custom panels',
                    'Specimen collection tracking',
                    'Normal / abnormal result flags',
                    'Instructor-controlled result release',
                    'Glucose & point-of-care testing',
                    'Order acknowledgment workflow',
                  ].map(f => <FeatureTag key={f} text={f} />)}
                </div>
              </div>
            </div>

            {/* Bottom row — I&O + Orders + hacMap */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-7 group hover:border-sky-500/40 hover:bg-sky-500/[0.03] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-5">
                  <Droplets className="w-6 h-6 text-sky-400" />
                </div>
                <div className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-1">Intake & Output</div>
                <h3 className="text-xl font-bold text-white mb-3">Fluid Balance Tracking</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Track IV fluids, PO intake, urine output, and drain collections. Running shift totals and 24-hour fluid balance at a glance — critical for pediatric, post-op, and ICU scenarios.</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-7 group hover:border-violet-500/40 hover:bg-violet-500/[0.03] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
                  <ClipboardList className="w-6 h-6 text-violet-400" />
                </div>
                <div className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-1">Doctor's Orders</div>
                <h3 className="text-xl font-bold text-white mb-3">Actionable Order Management</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Instructors place medication, diagnostic, and nursing orders. Students acknowledge, action, and document — closing the full order lifecycle exactly as required in clinical practice.</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-7 group hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                  <Map className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">hacMap</div>
                <h3 className="text-xl font-bold text-white mb-3">Visual Body Assessment</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Interactive front/back anatomical diagrams for documenting wound locations, device placements, and physical findings. Tap to place, describe, and track progression across assessments over time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SIMULATION SYSTEM ──────────────────────────────────────────────── */}
        <section id="simulation" className="py-24 px-4 bg-slate-900/40">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wide mb-5">
                <GraduationCap className="w-3 h-3" /> Simulation System
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">One Platform. Three Powerful Use Cases.</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                hacCare's simulation engine powers everything from high-fidelity lab sessions to at-home documentation practice — no additional software, no extra setup.
              </p>
            </div>

            {/* Three use cases */}
            <div className="grid md:grid-cols-3 gap-5 mb-14">
              <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/8 to-slate-900/50 p-7 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                <div className="text-4xl font-black text-violet-500/15 leading-none mb-4 select-none">01</div>
                <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mb-4">
                  <GraduationCap className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">Simulation Lab</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">The high-fidelity setup. Students scan real printed barcodes at a simulated patient bedside, navigate full clinical workflows, and document in real time. Instructors monitor live, trigger alerts, and control the scenario from a separate screen.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Barcode Scanning', 'Live Monitoring', 'Scenario Control', 'Real-Time Alerts'].map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">{t}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/8 to-slate-900/50 p-7 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                <div className="text-4xl font-black text-cyan-500/15 leading-none mb-4 select-none">02</div>
                <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">Testing & Evaluation</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">Run graded assessment scenarios for individuals or entire cohorts. Every clinical action is timestamped and attributed to a specific student, generating detailed evidence for competency evaluation and program accreditation.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Per-Student Logs', 'Timestamped Actions', 'Competency Tracking', 'PDF Debrief Reports'].map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">{t}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/8 to-slate-900/50 p-7 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                <div className="text-4xl font-black text-emerald-500/15 leading-none mb-4 select-none">03</div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">Documentation Practice</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">Standalone charting practice without a physical lab. Students complete admission assessments, nursing notes, vitals entry, lab review, and order acknowledgment independently — on any device, any time, at their own pace.</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Admission Assessment', 'Nursing Notes', 'Order Acknowledgment', 'Self-Paced'].map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-14 mb-6">
              <p className="text-center text-slate-500 text-sm uppercase tracking-widest font-semibold mb-10">How the instructor workflow runs</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {/* Template Library — real screenshot */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
                <div className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center mb-4">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Template Library</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Build patient scenarios once — complete with history, medications, orders, labs, and wounds. Save as reusable templates. Tag by program (NESA, PN, SIM Hub, BNAD).</p>
                </div>
                <div className="px-4 pb-4">
                  <img
                    src="/images/template.webp"
                    alt="Simulation template cards with program tags in hacCare"
                    className="w-full rounded-lg border border-slate-700"
                    width={488}
                    height={329}
                    loading="lazy"
                  />
                </div>
              </div>
              {/* Launch & Manage */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
                <div className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center mb-4">
                    <PlayCircle className="w-5 h-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Launch & Manage</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Launch a simulation in seconds. Assign students, monitor live, and reset for the next cohort. Barcode labels stay consistent all semester — print once, reuse all year.</p>
                </div>
              </div>
              {/* Debrief Reports */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
                <div className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center mb-4">
                    <BarChart2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Debrief Reports</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">After every simulation, generate a full activity report. Every medication scanned, every vital recorded, every note written — timestamped and attributed per student.</p>
                </div>
                <div className="px-4 pb-4">
                  <img
                    src="/images/debrief.webp"
                    alt="Debrief report showing student activity breakdown in hacCare"
                    className="w-full rounded-lg border border-slate-700"
                    width={488}
                    height={329}
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-10">
              <h3 className="text-2xl font-bold text-white text-center mb-10">How a Simulation Works</h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { n: '01', title: 'Build Template', body: 'Instructor creates a patient scenario with complete clinical data: history, meds, labs, orders, wounds.' },
                  { n: '02', title: 'Launch', body: 'A fresh isolated environment is spun up. Students are assigned. Barcodes are printed.' },
                  { n: '03', title: 'Students Practice', body: 'Students chart, scan medications, record vitals, and respond to alerts — exactly like a real shift.' },
                  { n: '04', title: 'Debrief', body: 'Instructors review every action with timestamped reports and generate PDF debriefs for feedback.' },
                ].map((step, i) => (
                  <div key={step.n} className="relative">
                    {i < 3 && <div className="hidden md:block absolute top-6 left-full w-full h-px bg-slate-700 z-0" />}
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-4"
                        style={{ borderColor: '#19ADF2', color: '#19ADF2' }}>
                        {step.n}
                      </div>
                      <h4 className="font-semibold text-white mb-2">{step.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECURITY ───────────────────────────────────────────────────────── */}
        <section id="security" className="py-24 px-4 bg-slate-900/60">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-5">
                <Lock className="w-3 h-3" /> Security & Compliance
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Enterprise-Grade Security for Healthcare Data</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                hacCare handles simulated PHI under the same security controls expected in production healthcare environments. Security isn't an afterthought — it's in the architecture.
              </p>
            </div>

            {/* Ghost tech logos strip */}
            <div className="mb-14">
              <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-600 mb-6">Powered by industry-leading security infrastructure</p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {/* Supabase */}
                <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-700/60 bg-slate-800/20 text-slate-500 hover:text-slate-200 hover:border-slate-500 transition-all cursor-default">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.33 12.59.72 13.39 1.408 13.39h9.22l.183 9.564c.015.986 1.26 1.41 1.874.637l9.262-11.652c.434-.54.044-1.34-.644-1.34h-9.22L11.9 1.036z" />
                  </svg>
                  <span className="font-semibold text-sm tracking-tight">Supabase</span>
                </div>
                {/* Snyk */}
                <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-700/60 bg-slate-800/20 text-slate-500 hover:text-slate-200 hover:border-slate-500 transition-all cursor-default">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.5L2.5 6.5v5c0 5.25 4.05 10.15 9.5 11.5 5.45-1.35 9.5-6.25 9.5-11.5v-5L12 1.5zm3.55 14.05L12 17.9l-3.55-2.35V6.6L12 4.25l3.55 2.35v8.95z" />
                  </svg>
                  <span className="font-semibold text-sm tracking-tight">Snyk</span>
                </div>
                {/* GitHub Advanced Security / CodeQL */}
                <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-700/60 bg-slate-800/20 text-slate-500 hover:text-slate-200 hover:border-slate-500 transition-all cursor-default">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1zm0 4.08l5 2.22V11c0 3.73-2.53 7.22-5 8.18C9.53 18.22 7 14.73 7 11V7.3L12 5.08zM10.5 13.5l-2-2 1.06-1.06 1 .94 2.44-2.44L14 10l-3.5 3.5z" />
                  </svg>
                  <span className="font-semibold text-sm tracking-tight">GitHub Advanced Security</span>
                </div>
                {/* Netlify */}
                <div className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-slate-700/60 bg-slate-800/20 text-slate-500 hover:text-slate-200 hover:border-slate-500 transition-all cursor-default">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.934 8.219l-4.5-4.5a.65.65 0 00-.918 0l-4.5 4.5a.65.65 0 000 .918l1.763 1.763H6.5a.65.65 0 000 1.3h2.279l-1.763 1.763a.65.65 0 000 .918l4.5 4.5a.65.65 0 00.918 0l4.5-4.5a.65.65 0 000-.918L15.17 12.2h2.33a.65.65 0 000-1.3h-2.33l1.764-1.763a.65.65 0 000-.918z" />
                  </svg>
                  <span className="font-semibold text-sm tracking-tight">Netlify</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
              {[
                {
                  icon: Code2, title: 'Snyk Code Scanning',
                  desc: 'Every commit is scanned by Snyk for vulnerabilities — dependency audits, SAST analysis, and license compliance checks run automatically in the CI pipeline.',
                  badge: 'Snyk',
                },
                {
                  icon: Server, title: 'SOC 2 Type II Infrastructure',
                  desc: 'Hosted on infrastructure with SOC 2 Type II certification. Supabase (database & auth) and Netlify (hosting) both maintain SOC 2 compliance programs with annual third-party audits.',
                  badge: 'SOC 2 Type II',
                },
                {
                  icon: Database, title: 'Row-Level Security (RLS)',
                  desc: 'Every table in the database enforces tenant isolation via PostgreSQL Row-Level Security policies. No query can return data from another institution — at any layer.',
                  badge: 'PostgreSQL RLS',
                },
                {
                  icon: Globe, title: 'Multi-Tenant Isolation',
                  desc: 'Each institution, program, and simulation runs in a completely separate tenant environment. Data never crosses tenant boundaries — enforced at both the application and database level.',
                  badge: 'Multi-Tenant',
                },
                {
                  icon: Activity, title: 'Full Audit Trail',
                  desc: 'Every clinical action — medication administration, vital entry, note creation — is timestamped and attributed to a specific user. Immutable audit logs support institutional compliance requirements.',
                  badge: 'Audit Logging',
                },
                {
                  icon: Lock, title: 'PIPEDA Privacy Compliance',
                  desc: 'Designed for Canadian privacy law. hacCare aligns with PIPEDA\'s 10 fair information principles — consent, purpose limitation, data minimization, and individual access rights — with HIPAA-aligned safeguards for institutions operating across borders.',
                  badge: 'PIPEDA',
                },
              ].map(card => (
                <div key={card.title} className="rounded-xl border border-slate-700 bg-slate-800/30 p-6 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <card.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{card.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Security callout banner */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-shrink-0">
                <Shield className="w-12 h-12 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Security is Structural, Not a Feature</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  hacCare's security model was designed from day one around multi-tenant healthcare data. RLS policies, role-based access, Snyk scanning, and SOC 2 compliant hosting are not add-ons — they are the foundation every feature is built on top of.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CANADIAN CONTEXT ───────────────────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-10 text-center">
              <div className="flex justify-center mb-5">
                <img src="/images/canada-flag.svg" alt="Canadian flag" width={120} height={60} className="rounded shadow-lg" loading="lazy" />
              </div>
              <div className="text-3xl font-bold text-white mb-3">Designed for Canadian Healthcare Education</div>
              <p className="text-slate-400 max-w-2xl mx-auto">
                hacCare uses Canadian clinical units and standards — metric vitals, Canadian drug references, and workflows aligned with Canadian nursing practice guidelines. Built in Lethbridge, Alberta. Trusted by nursing programs across the country.
              </p>
            </div>
          </div>
        </section>

        {/* ── CONTACT ────────────────────────────────────────────────────────── */}
        <section id="contact" className="py-24 px-4 bg-slate-900/40">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <h2 className="text-4xl font-bold text-white mb-5">Request Access or a Demo</h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-10">
                  Interested in bringing hacCare to your nursing program? We'll walk you through setup, how simulations work, and what students experience from day one.
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Email</div>
                      <div className="text-white font-medium">support@haccare.app</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Location</div>
                      <div className="text-white font-medium">Lethbridge, Alberta, Canada</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-8">
                <form className="space-y-5" onSubmit={handleContactSubmit}>
                  {formStatus.type === 'success' && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-400 text-sm">
                      {formStatus.message}
                    </div>
                  )}
                  {formStatus.type === 'error' && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
                      {formStatus.message}
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className={labelCls}>Name *</label>
                      <input type="text" id="name" value={formData.name} onChange={handleInputChange}
                        required disabled={formStatus.type === 'loading'} placeholder="Your name" className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor="email" className={labelCls}>Email *</label>
                      <input type="email" id="email" value={formData.email} onChange={handleInputChange}
                        required disabled={formStatus.type === 'loading'} placeholder="you@institution.ca" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="institution" className={labelCls}>Institution</label>
                    <input type="text" id="institution" value={formData.institution} onChange={handleInputChange}
                      disabled={formStatus.type === 'loading'} placeholder="Institution or program name" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="message" className={labelCls}>Message *</label>
                    <textarea id="message" rows={4} value={formData.message} onChange={handleInputChange}
                      required disabled={formStatus.type === 'loading'}
                      placeholder="Tell us about your program and what you're looking for..."
                      className={inputCls} />
                  </div>
                  <button type="submit" disabled={formStatus.type === 'loading'}
                    className={`${primaryBtn} w-full justify-center text-base py-3.5 disabled:opacity-50`}
                    style={{ backgroundColor: '#19ADF2' }}>
                    {formStatus.type === 'loading' ? 'Sending...' : 'Send Message'}
                    {formStatus.type !== 'loading' && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <img src={logo} alt="hacCare" className="h-10 w-auto brightness-0 invert mb-4" />
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                A high-fidelity simulated EMR platform for healthcare education. Built in Lethbridge, Alberta. A haclabs product.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Platform</div>
              <ul className="space-y-2.5">
                {[
                  ['Features', 'features'],
                  ['Simulation', 'simulation'],
                  ['Security', 'security'],
                  ['Contact', 'contact'],
                ].map(([label, id]) => (
                  <li key={label}>
                    <button onClick={() => scrollToSection(id)}
                      className="text-slate-400 hover:text-white text-sm transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Account</div>
              <ul className="space-y-2.5">
                <li>
                  <button onClick={() => navigate('/login')}
                    className="text-slate-400 hover:text-white text-sm transition-colors">
                    Login
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('contact')}
                    className="text-slate-400 hover:text-white text-sm transition-colors">
                    Request Access
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-slate-500 text-sm">&copy; 2026 hacCare. A haclabs product. All rights reserved.</p>
            <p className="text-slate-600 text-xs">Lethbridge, Alberta, Canada</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
