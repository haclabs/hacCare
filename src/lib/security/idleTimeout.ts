/**
 * Idle sign-out rules. Students (the `nurse` role) work through long simulations
 * with stretches of reading or discussion, so they get a longer allowance than staff.
 *
 * Supabase's own inactivity timeout only fires when the session stops refreshing
 * (tab closed, laptop asleep); an open tab refreshes itself, so this client-side
 * check is what signs out someone who walks away from a shared computer.
 */
export const STUDENT_IDLE_TIMEOUT_MS = 120 * 60 * 1000;
export const STAFF_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const IDLE_WARNING_MS = 2 * 60 * 1000;

export type IdlePhase = 'active' | 'warning' | 'expired';

export function getIdleTimeoutMs(role?: string | null): number {
  return role === 'nurse' ? STUDENT_IDLE_TIMEOUT_MS : STAFF_IDLE_TIMEOUT_MS;
}

export function getIdlePhase(idleMs: number, timeoutMs: number, warningMs = IDLE_WARNING_MS): IdlePhase {
  if (idleMs >= timeoutMs) return 'expired';
  if (idleMs >= timeoutMs - warningMs) return 'warning';
  return 'active';
}
