import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FORM_COMPONENTS } from '../formRegistry';
import { ChevronLeft, ChevronUp, LayoutGrid } from 'lucide-react';
import { FLOWSHEET_REGISTRY, CATEGORY_META, CATEGORY_ORDER } from '../registry';
import { FlowsheetCard } from './FlowsheetCard';
import { FlowsheetFormWrapper } from './FlowsheetFormWrapper';
import { PatientActionBar } from '../../../components/PatientActionBar';
import type {
  FlowsheetCategory,
  FlowsheetDefinition,
  FlowsheetModuleTarget,
  HubView,
  NativeFlowsheetDefinition,
} from '../types';
import type { Patient } from '../../../types';
import { useTenant } from '../../../contexts/TenantContext';


// ── Hub props ─────────────────────────────────────────────────────────────────

/** Short labels used in the sticky category nav bar. */
const CATEGORY_NAV_LABELS: Record<FlowsheetCategory, string> = {
  monitoring: 'Monitoring',
  systems: 'Systems',
  'risk-safety': 'Risk & Safety',
  'wound-device': 'Wound & Device',
  'fluid-metabolic': 'Fluid & Metabolic',
  'mental-health': 'Mental Health',
  'therapeutic-rec': 'Ther. Rec.',
  'clinical-docs': 'Clinical Docs',
};

interface FlowsheetsHubProps {
  patient: Patient;
  /** Passed through to native form components. */
  currentUser?: { id: string; name: string; role: string };
  /** Called when a module-shortcut card is clicked. Navigates OUT of the hub. */
  onNavigateToModule: (target: FlowsheetModuleTarget) => void;
  /** Returns to the patient overview tab. */
  onNavigateToOverview: () => void;
  // Top PatientActionBar nav — same props every other module receives, so the
  // bar stays visible and consistent whether you're in Vitals, Meds, or here.
  onChartClick?: () => void;
  onVitalsClick?: () => void;
  onMedsClick?: () => void;
  onLabsClick?: () => void;
  onOrdersClick?: () => void;
  onHacMapClick?: () => void;
  onIOClick?: () => void;
  onNotesClick?: () => void;
  vitalsCount?: number;
  medsCount?: number;
  hasNewLabs?: boolean;
  hasNewOrders?: boolean;
  hasNewNotes?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────


export const FlowsheetsHub: React.FC<FlowsheetsHubProps> = ({
  patient,
  currentUser,
  onNavigateToModule,
  onNavigateToOverview,
  onChartClick,
  onVitalsClick,
  onMedsClick,
  onLabsClick,
  onOrdersClick,
  onHacMapClick,
  onIOClick,
  onNotesClick,
  vitalsCount = 0,
  medsCount = 0,
  hasNewLabs = false,
  hasNewOrders = false,
  hasNewNotes = false,
}) => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? '';
  const isBaseline = currentTenant?.tenant_type === 'simulation_template';

  const [hubView, setHubView] = useState<HubView>({ mode: 'grid' });
  const headerRef = useRef<HTMLDivElement>(null);

  /** Scroll back to the top of the hub without touching horizontal position.
   * scrollIntoView() corrects ALL axes and causes a horizontal wobble when
   * the -mx-8 scroll strips create overflow; this targets only scrollTop. */
  const scrollToTop = useCallback(() => {
    let node: Element | null = headerRef.current?.parentElement ?? null;
    while (node) {
      const { overflow, overflowY } = window.getComputedStyle(node);
      if (/auto|scroll/.test(overflow + overflowY)) {
        node.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      node = node.parentElement;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<FlowsheetCategory, typeof FLOWSHEET_REGISTRY>();
    for (const sheet of FLOWSHEET_REGISTRY) {
      const existing = map.get(sheet.category) ?? [];
      map.set(sheet.category, [...existing, sheet]);
    }
    return map;
  }, []);

  const handleCardOpen = useCallback(
    (sheet: FlowsheetDefinition) => {
      if (sheet.linkType === 'module-shortcut') {
        onNavigateToModule(sheet.moduleTarget);
        return;
      }
      // Native form
      if (sheet.status === 'active') {
        setHubView({ mode: 'form', formId: sheet.id });
        scrollToTop();
      }
      // coming-soon: no-op (card is disabled, shouldn't reach here)
    },
    [onNavigateToModule, scrollToTop]
  );

  const handleBackToGrid = useCallback(() => {
    setHubView({ mode: 'grid' });
    scrollToTop();
  }, [scrollToTop]);

  // ── Form view helpers ────────────────────────────────────────────────────
  const activeSheet =
    hubView.mode === 'form'
      ? FLOWSHEET_REGISTRY.find((s) => s.id === hubView.formId)
      : undefined;

  // Safety guard — if a stale formId somehow doesn't resolve, fall back to grid
  if (hubView.mode === 'form' && (!activeSheet || activeSheet.linkType !== 'native' || activeSheet.status !== 'active')) {
    // Use a ref-based reset so we don't call setState during render
    setTimeout(() => setHubView({ mode: 'grid' }), 0);
    return null;
  }

  const ActiveFormComponent =
    activeSheet ? FORM_COMPONENTS[activeSheet.id as keyof typeof FORM_COMPONENTS] : undefined;

  // ── Unified render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-gray-50">
      {/* Same top nav bar every other patient module shows — kept visible in both grid and form views */}
      <div className="px-8 pt-6">
        <PatientActionBar
          onChartClick={onChartClick}
          onVitalsClick={onVitalsClick}
          onMedsClick={onMedsClick}
          onLabsClick={onLabsClick}
          onOrdersClick={onOrdersClick}
          onHacMapClick={onHacMapClick}
          onIOClick={onIOClick}
          onNotesClick={onNotesClick}
          onFlowsheetsClick={handleBackToGrid}
          vitalsCount={vitalsCount}
          medsCount={medsCount}
          hasNewLabs={hasNewLabs}
          hasNewOrders={hasNewOrders}
          hasNewNotes={hasNewNotes}
          activeAction="flowsheets"
        />
      </div>

      {/* Page header — always visible */}
      <div ref={headerRef} className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 p-3 bg-violet-100 rounded-xl">
            <LayoutGrid className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Clinical Flowsheets</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {patient.first_name} {patient.last_name}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky category navigation — always visible */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-0.5 px-4 py-1.5 overflow-x-auto scrollbar-none">
          {/* Back to overview */}
          <button
            onClick={onNavigateToOverview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-xs font-medium whitespace-nowrap flex-shrink-0 group"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Patient Overview</span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 mx-1.5 flex-shrink-0" />

          {/* Category buttons — clicking scrolls grid or returns to grid first */}
          {CATEGORY_ORDER.map((catId) => {
            const catSheets = byCategory.get(catId);
            if (!catSheets?.length) return null;
            const meta = CATEGORY_META[catId];
            const NavIcon = meta.icon;
            return (
              <button
                key={catId}
                onClick={() => {
                  if (hubView.mode === 'form') {
                    setHubView({ mode: 'grid' });
                    // After state update, scroll to the category
                    setTimeout(() =>
                      document
                        .getElementById(`flowsheet-cat-${catId}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    , 50);
                  } else {
                    document
                      .getElementById(`flowsheet-cat-${catId}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:${meta.textColor} group`}
              >
                <NavIcon className={`h-3.5 w-3.5 flex-shrink-0 ${meta.iconColor} group-hover:scale-110 transition-transform`} />
                <span>{CATEGORY_NAV_LABELS[catId]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area: form or grid ───────────────────────────────────── */}
      {hubView.mode === 'form' && activeSheet ? (
        <FlowsheetFormWrapper
          sheet={activeSheet as NativeFlowsheetDefinition}
          patient={patient}
          onBack={handleBackToGrid}
        >
          {ActiveFormComponent ? (
            <ActiveFormComponent
              patient={patient}
              tenantId={tenantId}
              currentUser={currentUser}
              isBaseline={isBaseline}
              onSaved={handleBackToGrid}
              onCancel={handleBackToGrid}
            />
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
              <p className="text-sm font-medium text-gray-500">
                Form component not yet registered for <code className="font-mono">{activeSheet.id}</code>.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Add it to <code className="font-mono text-xs">FORM_COMPONENTS</code> in formRegistry.ts.
              </p>
            </div>
          )}
        </FlowsheetFormWrapper>
      ) : (
        <div className="px-8 py-6 space-y-8">
        {CATEGORY_ORDER.map((catId) => {
          const sheets = byCategory.get(catId);
          if (!sheets?.length) return null;

          const meta = CATEGORY_META[catId];
          const CategoryIcon = meta.icon;

          return (
            <section key={catId} id={`flowsheet-cat-${catId}`} className="scroll-mt-16">
              {/* Section header */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`flex-shrink-0 p-1.5 rounded-lg ${meta.iconBg}`}>
                  <CategoryIcon className={`h-3.5 w-3.5 ${meta.iconColor}`} />
                </div>
                <h2 className="text-sm font-bold text-gray-800">{meta.label}</h2>
              </div>

              {/* Horizontal scroll strip */}
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-8 px-8 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {sheets.map((sheet) => (
                  <FlowsheetCard
                    key={sheet.id}
                    sheet={sheet}
                    meta={meta}
                    onOpen={handleCardOpen}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Back to top */}
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 bg-white shadow-sm text-xs font-medium text-gray-500 hover:text-violet-600 hover:border-violet-200 hover:shadow-md transition-all duration-200 group"
          >
            <ChevronUp className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
            Back to top
          </button>
        </div>

        {/* Developer note */}
        <div className="rounded-xl bg-white border border-dashed border-gray-300 px-5 py-4 flex items-start gap-3">
          <LayoutGrid className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-gray-600">Adding new native flowsheet forms</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              1. Create form in{' '}
              <code className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                flowsheets/forms/
              </code>
              {' '}implementing{' '}
              <code className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                FlowsheetFormProps
              </code>
              .{'  '}
              2. Register in{' '}
              <code className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                formRegistry.ts
              </code>{' '}
              with{' '}
              <code className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                React.lazy()
              </code>
              .{'  '}
              3. Flip{' '}
              <code className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                status: &apos;active&apos;
              </code>{' '}
              in{' '}
              <code className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1 py-0.5 rounded">
                registry.ts
              </code>
              .
            </p>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};
