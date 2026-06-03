import type { LucideIcon } from 'lucide-react';
import type { Patient } from '../../types';

// ── Categories ────────────────────────────────────────────────────────────────

export type FlowsheetCategory =
  | 'monitoring'
  | 'systems'
  | 'risk-safety'
  | 'wound-device'
  | 'fluid-metabolic'
  | 'mental-health'
  | 'therapeutic-rec'
  | 'clinical-docs';

// ── Module targets ────────────────────────────────────────────────────────────

/**
 * Existing patient modules that a ModuleShortcutDefinition links to.
 * Mirrors ActiveModule (excludes 'overview' and 'flowsheets').
 */
export type FlowsheetModuleTarget =
  | 'vitals'
  | 'medications'
  | 'forms'
  | 'handover'
  | 'advanced-directives'
  | 'hacmap'
  | 'intake-output'
  | 'therapeutic-recreation';

// ── Hub view state machine ────────────────────────────────────────────────────

/**
 * Controls what the FlowsheetsHub renders.
 *   grid  → category sections + cards (default)
 *   form  → FlowsheetFormWrapper + the active form component
 */
export type HubView =
  | { mode: 'grid' }
  | { mode: 'form'; formId: string };

// ── Form component contract ───────────────────────────────────────────────────

/**
 * Props every native flowsheet form component must implement.
 * The hub creates these callbacks and passes them through FlowsheetFormWrapper.
 * Forms are responsible for their own data fetching and save logic.
 */
export interface FlowsheetFormProps {
  patient: Patient;
  tenantId: string;
  currentUser?: { id: string; name: string; role: string };
  /**
   * True when the form is opened inside a simulation template tenant.
   * Causes the saved row to have is_baseline = true, which preserves it
   * across reset_simulation_for_next_session calls.
   */
  isBaseline?: boolean;
  /** Called after a successful save. Hub returns to grid view. */
  onSaved: () => void;
  /** Called when the user cancels without saving. Hub returns to grid view. */
  onCancel: () => void;
}

// ── Registry entry types (discriminated union) ────────────────────────────────

type FlowsheetBase = {
  id: string;
  title: string;
  description: string;
  category: FlowsheetCategory;
  icon: LucideIcon;
  /** Program codes this form is primarily associated with, e.g. ['TRG']. */
  programs?: string[];
};

/**
 * A native flowsheet form rendered inline within the hub.
 * Writes to patient_system_assessments using this systemType.
 * 'coming-soon' cards are visible but disabled — no form component required yet.
 * 'active' cards open FlowsheetFormWrapper + the registered form component.
 */
export type NativeFlowsheetDefinition = FlowsheetBase & {
  linkType: 'native';
  status: 'active' | 'coming-soon';
  /** Maps to system_type in patient_system_assessments. Required. */
  systemType: string;
};

/**
 * A shortcut to an existing clinical module.
 * Clicking navigates the user OUT of the flowsheets hub context.
 * Always visually distinct — clearly labelled as external navigation.
 * Module shortcuts are always "active" (they link to live modules).
 */
export type ModuleShortcutDefinition = FlowsheetBase & {
  linkType: 'module-shortcut';
  moduleTarget: FlowsheetModuleTarget;
};

/** Discriminated union — use sheet.linkType to narrow. */
export type FlowsheetDefinition = NativeFlowsheetDefinition | ModuleShortcutDefinition;

// ── System assessment data ──────────────────────────────────────────────────────

/**
 * A row from patient_system_assessments as returned by Supabase.
 * assessment_data is a JSONB payload keyed by the form's own field names.
 */
export interface SystemAssessmentRow {
  id: string;
  patient_id: string;
  tenant_id: string;
  system_type: string;
  assessment_data: Record<string, unknown>;
  nurse_id: string | null;
  nurse_name: string | null;
  is_baseline: boolean;
  recorded_at: string;
  created_at: string;
}

/**
 * Input for inserting a new system assessment row.
 * nurse_id / nurse_name should come from the currentUser prop passed to every
 * FlowsheetFormProps-implementing component.
 */
export interface SaveSystemAssessmentInput {
  patient_id: string;
  tenant_id: string;
  system_type: string;
  assessment_data: Record<string, unknown>;
  nurse_id?: string | null;
  nurse_name?: string | null;
  /** True for instructor-entered baseline entries in template tenants. */
  is_baseline?: boolean;
}

// ── Category display metadata ─────────────────────────────────────────────────

export interface FlowsheetCategoryMeta {
  id: FlowsheetCategory;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind text-color class for section headers */
  textColor: string;
  /** Tailwind bg class for icon container */
  iconBg: string;
  /** Tailwind text-color class for icon */
  iconColor: string;
  /** Tailwind border-t-{color} class for card top accent */
  borderAccent: string;
  /** Tailwind hover:ring-{color} class for card hover ring */
  hoverRing: string;
  /** Tailwind bg for header badge */
  badgeBg: string;
}
