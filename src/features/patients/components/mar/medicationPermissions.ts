const ALWAYS_ALLOWED_ROLES = ['super_admin', 'coordinator', 'admin'];

/**
 * Whether the user may edit or delete medication orders on the MAR.
 *
 * Instructors author the baseline orders in template tenants, so they get the
 * same rights there. In live simulations and production the orders belong to
 * the scenario and stay admin-only. RLS on patient_medications enforces tenant
 * membership; this only controls what the UI offers.
 */
export function canManageMedicationOrders(
  role: string | undefined,
  isTemplateTenant: boolean
): boolean {
  if (!role) return false;
  if (ALWAYS_ALLOWED_ROLES.includes(role)) return true;
  return role === 'instructor' && isTemplateTenant;
}
