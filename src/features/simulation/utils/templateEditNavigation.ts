/**
 * Navigation guard for template edit mode. Leaving the template's patients via the
 * sidebar without "Save & Exit" strands the instructor inside the template tenant,
 * so the sidebar asks the TemplateEditingBanner to confirm first.
 */

export const TEMPLATE_EDIT_LEAVE_ATTEMPT = 'template-edit-leave-attempt';

export interface TemplateEditLeaveAttempt {
  path: string;
  state?: unknown;
  label: string;
}

/** Sidebar tabs that keep working inside the template tenant, so no warning is needed. */
const TABS_ALLOWED_WHILE_EDITING = new Set(['patients', 'documentation', 'changelog']);

export const isEditingTemplate = (): boolean => !!sessionStorage.getItem('editing_template');

/** Returns true if the navigation was intercepted (caller must not navigate). */
export const interceptTemplateEditNavigation = (itemId: string, attempt: TemplateEditLeaveAttempt): boolean => {
  if (!isEditingTemplate() || TABS_ALLOWED_WHILE_EDITING.has(itemId)) return false;
  window.dispatchEvent(new CustomEvent<TemplateEditLeaveAttempt>(TEMPLATE_EDIT_LEAVE_ATTEMPT, { detail: attempt }));
  return true;
};
